import React, { useState, useEffect, useRef } from 'react';
import { ActivityTimelineDrawer } from './components/ActivityTimelineDrawer';
import { RecoveryCenterModal } from './components/RecoveryCenterModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { SystemLogsDrawer } from './components/SystemLogsDrawer';

// ─── Inline SVG Icons ──────────────────────────────────────────────────────────
const Icon = {
    chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    screen: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x={2} y={3} width={20} height={14} rx={2}/><polyline points="8 21 12 17 16 21"/><line x1={12} y1={17} x2={12} y2={17}/></svg>,
    timeline: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10}/><polyline points="12 6 12 12 16 14"/></svg>,
    terminal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1={12} y1={19} x2={20} y2={19}/></svg>,
    shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    history: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10}/><polyline points="12 6 12 12 16 14"/></svg>,
    plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1={12} y1={5} x2={12} y2={19}/><line x1={5} y1={12} x2={19} y2={12}/></svg>,
    send: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
    stop: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={3} y={3} width={18} height={18} rx={2}/></svg>,
    check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    chevronRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
    chevronDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
    sparkles: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1"/></svg>,
    maximize: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1={21} y1={3} x2={14} y2={10}/><line x1={3} y1={21} x2={10} y2={14}/></svg>,
    x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1={18} y1={6} x2={6} y2={18}/><line x1={6} y1={6} x2={18} y2={18}/></svg>,
};

// ─── Main Application ─────────────────────────────────────────────────────────
export default function App() {
    // Mode: 'chat' (Antigravity Agent Panel) | 'screen' (Mirrored IDE Viewport)
    const [viewMode, setViewMode] = useState('chat');
    const [fitMode, setFitMode] = useState('fit');
    const [lightboxOpen, setLightboxOpen] = useState(false);

    // Drawers & Modals
    const [timelineOpen, setTimelineOpen] = useState(false);
    const [logsOpen, setLogsOpen] = useState(false);
    const [recoveryOpen, setRecoveryOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [activeModal, setActiveModal] = useState(null); // 'mode' | 'model'

    // Server State
    const [appState, setAppState] = useState({ status: 'Connecting…', connected: false, mode: 'Fast', model: 'Gemini 3.8 Flash (Medium)' });
    const [snapshotData, setSnapshotData] = useState(null);
    const [pendingInteraction, setPendingInteraction] = useState(null);
    const [selectedOptions, setSelectedOptions] = useState(new Set());
    const [customResponse, setCustomResponse] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Timeline, Logs & Recovery
    const [timelineEvents, setTimelineEvents] = useState([]);
    const [isTimelineLoading, setIsTimelineLoading] = useState(false);
    const [timelineCategory, setTimelineCategory] = useState(null);
    const [timelineSearch, setTimelineSearch] = useState('');

    const [systemLogs, setSystemLogs] = useState([]);
    const [isLogsLoading, setIsLogsLoading] = useState(false);

    const [recoveryItems, setRecoveryItems] = useState([]);
    const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);
    const [diagnostics, setDiagnostics] = useState(null);

    const [historyChats, setHistoryChats] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // Composer
    const [promptText, setPromptText] = useState('');
    const [isSendingPrompt, setIsSendingPrompt] = useState(false);

    const chatScrollRef = useRef(null);
    const isMountedRef = useRef(true);
    const snapshotSeqRef = useRef(0);

    const h = { 'ngrok-skip-browser-warning': 'true' };

    // ─── Fetchers ─────────────────────────────────────────────────────────────
    const fetchAppState = async () => {
        try {
            const res = await fetch('/app-state', { headers: h });
            if (!isMountedRef.current) return;
            if (res.status === 401) { window.location.href = '/login.html'; return; }
            if (res.ok) {
                const data = await res.json();
                if (!isMountedRef.current) return;
                setAppState({
                    status: data.antigravity_connected ? 'Live' : 'Standby',
                    connected: Boolean(data.antigravity_connected),
                    mode: data.mode || 'Fast',
                    model: data.model || 'Gemini 3.8 Flash (Medium)'
                });
            }
        } catch {}
    };

    const fetchSnapshot = async () => {
        const seq = ++snapshotSeqRef.current;
        try {
            const res = await fetch('/snapshot', { headers: h });
            if (!isMountedRef.current || seq < snapshotSeqRef.current) return;
            if (res.ok) {
                const data = await res.json();
                if (!isMountedRef.current || seq < snapshotSeqRef.current) return;
                setSnapshotData(data);
            }
        } catch {}
    };

    const fetchPendingInteractions = async () => {
        try {
            const res = await fetch('/api/v1/interactions/pending', { headers: h });
            if (!isMountedRef.current) return;
            if (res.ok) {
                const data = await res.json();
                if (!isMountedRef.current) return;
                if (data.interactions?.length > 0) {
                    const latest = data.interactions[0];
                    setPendingInteraction(prev => {
                        if (!prev || prev.interaction_id !== latest.interaction_id) {
                            setSelectedOptions(new Set());
                            setCustomResponse('');
                            setSubmitSuccess(false);
                        }
                        return latest;
                    });
                } else {
                    setPendingInteraction(null);
                }
            }
        } catch {}
    };

    const fetchTimelineEvents = async () => {
        setIsTimelineLoading(true);
        try {
            const params = new URLSearchParams({ limit: '80' });
            if (timelineCategory) params.append('category', timelineCategory);
            if (timelineSearch) params.append('search', timelineSearch);
            const res = await fetch(`/api/v1/events?${params}`, { headers: h });
            if (res.ok) {
                const data = await res.json();
                setTimelineEvents(data.events || []);
            }
        } catch {} finally {
            setIsTimelineLoading(false);
        }
    };

    const fetchSystemLogs = async () => {
        setIsLogsLoading(true);
        try {
            const res = await fetch('/api/v1/logs?limit=250', { headers: h });
            if (res.ok) {
                const data = await res.json();
                setSystemLogs(data.logs || []);
            }
        } catch {} finally {
            setIsLogsLoading(false);
        }
    };

    const fetchRecoveryItems = async () => {
        setIsRecoveryLoading(true);
        try {
            const res = await fetch('/api/v1/events/recovery-items', { headers: h });
            if (res.ok) {
                const data = await res.json();
                setRecoveryItems(data || []);
            }
        } catch {} finally {
            setIsRecoveryLoading(false);
        }
    };

    const fetchDiagnostics = async () => {
        try {
            const res = await fetch('/api/v1/diagnostics', { headers: h });
            if (res.ok) {
                const data = await res.json();
                setDiagnostics(data);
            }
        } catch {}
    };

    // ─── Lifecycle & Intervals ────────────────────────────────────────────────
    useEffect(() => {
        isMountedRef.current = true;
        fetchAppState();
        fetchSnapshot();
        fetchPendingInteractions();
        fetchRecoveryItems();
        fetchDiagnostics();
        fetchTimelineEvents();
        fetchSystemLogs();

        const fastInterval = setInterval(() => {
            if (!isMountedRef.current) return;
            fetchAppState();
            fetchPendingInteractions();
            fetchSnapshot();
            fetchSystemLogs();
        }, 2500);

        const slowInterval = setInterval(() => {
            if (!isMountedRef.current) return;
            fetchRecoveryItems();
            fetchDiagnostics();
            fetchTimelineEvents();
        }, 8000);

        return () => {
            isMountedRef.current = false;
            clearInterval(fastInterval);
            clearInterval(slowInterval);
        };
    }, []);

    // Auto-scroll chat to bottom when new messages arrive
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [timelineEvents, pendingInteraction, viewMode]);

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const handleSendPrompt = async () => {
        const msg = promptText.trim();
        if (!msg || isSendingPrompt) return;
        setIsSendingPrompt(true);
        const saved = promptText;
        setPromptText('');
        const key = 'prompt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
        try {
            const res = await fetch('/send', {
                method: 'POST',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg, idempotency_key: key })
            });
            if (!res.ok) {
                setPromptText(saved);
            } else {
                setTimeout(fetchSnapshot, 400);
                setTimeout(fetchTimelineEvents, 600);
            }
        } catch {
            setPromptText(saved);
        } finally {
            setIsSendingPrompt(false);
        }
    };

    const handleInteractionSubmit = async () => {
        if (!pendingInteraction || isSubmitting) return;
        const customOk = Boolean(customResponse.trim());
        if (selectedOptions.size === 0 && !customOk) {
            alert('Please select an option or provide custom instructions.');
            return;
        }
        setIsSubmitting(true);
        const key = 'resp-' + pendingInteraction.interaction_id + '-' + Date.now();
        try {
            const res = await fetch(`/api/v1/interactions/${encodeURIComponent(pendingInteraction.interaction_id)}/respond`, {
                method: 'POST',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selected_option_ids: [...selectedOptions],
                    custom_response: customOk ? customResponse.trim() : null,
                    idempotency_key: key
                })
            });
            if (res.ok) {
                setSubmitSuccess(true);
                setTimeout(() => {
                    setPendingInteraction(null);
                    setSubmitSuccess(false);
                    fetchSnapshot();
                    fetchTimelineEvents();
                }, 1000);
            } else {
                const e = await res.json().catch(() => ({}));
                alert(e.detail || 'Submission failed.');
            }
        } catch (e) {
            alert(`Network error: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleOption = (id) => {
        const isMulti = pendingInteraction?.kind === 'multiple_choice';
        setSelectedOptions(prev => {
            const n = new Set(prev);
            if (isMulti) {
                if (n.has(id)) n.delete(id);
                else n.add(id);
            } else {
                n.clear();
                n.add(id);
            }
            return n;
        });
    };

    const handleNewChat = async () => {
        try {
            await fetch('/new-chat', { method: 'POST', headers: h });
            setTimeout(() => { fetchSnapshot(); fetchTimelineEvents(); }, 500);
        } catch {}
    };

    const handleStop = async () => {
        try {
            await fetch('/stop', { method: 'POST', headers: h });
            setTimeout(fetchTimelineEvents, 500);
        } catch {}
    };

    const handleSetMode = async (m) => {
        setActiveModal(null);
        try {
            await fetch('/set-mode', {
                method: 'POST',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: m })
            });
            setAppState(p => ({ ...p, mode: m }));
        } catch {}
    };

    const handleSetModel = async (m) => {
        setActiveModal(null);
        try {
            await fetch('/set-model', {
                method: 'POST',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: m })
            });
            setAppState(p => ({ ...p, model: m }));
        } catch {}
    };

    const handleOpenHistory = async () => {
        setHistoryOpen(true);
        setIsHistoryLoading(true);
        try {
            const res = await fetch('/chat-history', { headers: h });
            if (res.ok) {
                const d = await res.json();
                setHistoryChats(d.chats || []);
            }
        } catch {
            setHistoryChats([]);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const handleReconcileAction = async ({ scope, idempotency_key, resolution_notes }) => {
        const res = await fetch('/api/v1/events/reconcile-action', {
            method: 'POST',
            headers: { ...h, 'Content-Type': 'application/json' },
            body: JSON.stringify({ scope, idempotency_key, resolution_notes })
        });
        if (!res.ok) {
            const e = await res.json().catch(() => ({}));
            throw new Error(e.detail || 'Reconciliation failed');
        }
        fetchRecoveryItems();
        fetchTimelineEvents();
    };

    const quickActions = ['Continue working', 'Explain what you did', 'Fix latest bug', 'Summarize progress'];

    return (
        <div className="flex flex-col h-[100dvh] w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
            {/* ─── Top Antigravity Agent Header ───────────────────────── */}
            <header className="px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-900/40">
                        AW
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-semibold text-zinc-100 tracking-tight leading-none">
                                {snapshotData?.target ? snapshotData.target.split(' - ')[0] : 'AgentWatch'}
                            </h1>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                                Agent Panel
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400">
                            <span className={`w-1.5 h-1.5 rounded-full ${appState.connected ? 'bg-emerald-400 pulse-live' : 'bg-zinc-500'}`} />
                            <span>{appState.connected ? 'Connected to Antigravity (CDP 9000)' : 'Antigravity Offline'}</span>
                        </div>
                    </div>
                </div>

                {/* Primary Mode Toggle: Agent Chat vs Live IDE Screen */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                    <button
                        onClick={() => setViewMode('chat')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                            viewMode === 'chat'
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <div className="w-3.5 h-3.5">{Icon.chat}</div>
                        <span>Agent Chat</span>
                    </button>
                    <button
                        onClick={() => setViewMode('screen')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                            viewMode === 'screen'
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/40'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <div className="w-3.5 h-3.5">{Icon.screen}</div>
                        <span>IDE Screen</span>
                    </button>
                </div>

                {/* Feature Toolbar Buttons */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setTimelineOpen(true)}
                        title="Execution Timeline & Traces"
                        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition active:scale-95"
                    >
                        <div className="w-4 h-4">{Icon.timeline}</div>
                    </button>
                    <button
                        onClick={() => setLogsOpen(true)}
                        title="Live Server & System Logs"
                        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition active:scale-95"
                    >
                        <div className="w-4 h-4">{Icon.terminal}</div>
                    </button>
                    <button
                        onClick={() => setRecoveryOpen(true)}
                        title="Recovery Center & Diagnostics"
                        className="relative p-2 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 transition active:scale-95"
                    >
                        <div className="w-4 h-4">{Icon.shield}</div>
                        {recoveryItems.length > 0 && (
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        )}
                        {recoveryItems.length > 0 && (
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
                        )}
                    </button>
                    <button
                        onClick={handleOpenHistory}
                        title="Conversation History"
                        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition active:scale-95"
                    >
                        <div className="w-4 h-4">{Icon.history}</div>
                    </button>
                    <button
                        onClick={handleNewChat}
                        title="Start New Conversation"
                        className="p-2 rounded-lg text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition active:scale-95 border border-zinc-700/80 ml-1"
                    >
                        <div className="w-4 h-4">{Icon.plus}</div>
                    </button>
                </div>
            </header>

            {/* ─── Main Content Viewport ──────────────────────────────── */}
            <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                {/* VIEW 1: Antigravity Agent Chat Flow */}
                {viewMode === 'chat' ? (
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Conversation Message Stream */}
                        <div
                            ref={chatScrollRef}
                            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-3xl mx-auto w-full select-text"
                        >
                            {/* Antigravity Welcome / Context header */}
                            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex items-start gap-3 text-xs leading-relaxed">
                                <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                    <div className="w-4 h-4">{Icon.sparkles}</div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-zinc-100">Antigravity Coding Assistant</h3>
                                    <p className="text-zinc-400 mt-0.5">
                                        Observing local workspace via Chrome DevTools Protocol. Send instructions, review decisions, and track real-time executions below.
                                    </p>
                                </div>
                            </div>

                            {/* Render Snapshot HTML if Antigravity provided chat DOM */}
                            {snapshotData?.html && snapshotData.html.includes('chat-content') ? (
                                <div
                                    className="chat-content space-y-3"
                                    dangerouslySetInnerHTML={{ __html: snapshotData.html }}
                                />
                            ) : null}

                            {/* Render Chronological Agent Events & Tool Steps */}
                            {timelineEvents.map((e, idx) => {
                                const isUserPrompt = e.category === 'prompt' || e.event_type === 'PromptSubmitted';
                                const isToolExecution = e.category === 'execution' || e.category === 'tool';
                                const timeStr = new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                if (isUserPrompt) {
                                    return (
                                        <div key={e._id || idx} className="flex justify-end">
                                            <div className="max-w-[85%] rounded-2xl bg-zinc-850 border border-zinc-750 px-4 py-3 text-sm text-zinc-100 shadow-md">
                                                <p className="whitespace-pre-wrap">{e.summary || (e.sanitized_payload && e.sanitized_payload.message_preview)}</p>
                                                <span className="block text-right text-[10px] text-zinc-500 mt-1">{timeStr}</span>
                                            </div>
                                        </div>
                                    );
                                }

                                if (isToolExecution) {
                                    return (
                                        <details key={e._id || idx} className="group rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden text-xs">
                                            <summary className="flex items-center justify-between px-3.5 py-2 cursor-pointer text-zinc-400 hover:text-zinc-200 list-none select-none">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-blue-400">⚡</span>
                                                    <span className="font-medium text-zinc-300">{e.summary || e.event_type}</span>
                                                </div>
                                                <span className="text-[10px] text-zinc-500 font-mono">{timeStr}</span>
                                            </summary>
                                            {e.sanitized_payload && (
                                                <div className="px-3.5 py-2.5 bg-zinc-950 border-t border-zinc-800/80 font-mono text-[10px] text-zinc-400 overflow-x-auto whitespace-pre-wrap break-all">
                                                    {JSON.stringify(e.sanitized_payload, null, 2)}
                                                </div>
                                            )}
                                        </details>
                                    );
                                }

                                return (
                                    <div key={e._id || idx} className="p-3 bg-zinc-900/60 border border-zinc-850 rounded-xl text-xs space-y-1">
                                        <div className="flex items-center justify-between text-zinc-400">
                                            <span className="font-medium text-zinc-300">{e.summary}</span>
                                            <span className="text-[10px] text-zinc-500">{timeStr}</span>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* ─── INLINE DECISION CARD (Right in the chat stream!) ─────────── */}
                            {pendingInteraction && (
                                <div className="p-1 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 shadow-xl shadow-amber-950/40 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="bg-zinc-900 rounded-[14px] p-5 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400 shrink-0">
                                                <div className="w-5 h-5">{Icon.chat}</div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                        Agent Needs Your Input
                                                    </span>
                                                </div>
                                                <h3 className="text-sm font-bold text-zinc-100">{pendingInteraction.title}</h3>
                                                {pendingInteraction.description && (
                                                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{pendingInteraction.description}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Options */}
                                        {pendingInteraction.options?.length > 0 && (
                                            <div className="space-y-2 pt-1">
                                                {pendingInteraction.options.map(opt => {
                                                    const sel = selectedOptions.has(opt.id);
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            type="button"
                                                            onClick={() => handleToggleOption(opt.id)}
                                                            className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition active:scale-[0.99] ${
                                                                sel
                                                                    ? 'bg-blue-950/60 border-blue-500 text-zinc-100 shadow-md shadow-blue-950/50'
                                                                    : 'bg-zinc-850 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                                                            }`}
                                                        >
                                                            <div className={`w-5 h-5 mt-0.5 rounded-full flex items-center justify-center border shrink-0 transition ${
                                                                sel ? 'bg-blue-600 border-blue-500 text-white' : 'border-zinc-700 bg-zinc-900'
                                                            }`}>
                                                                {sel ? <div className="w-3 h-3">{Icon.check}</div> : null}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-xs font-semibold text-zinc-100">{opt.label}</span>
                                                                    {opt.is_recommended && (
                                                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400">
                                                                            Recommended
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {opt.description && (
                                                                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{opt.description}</p>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Custom input */}
                                        {pendingInteraction.allow_custom_response && (
                                            <div className="pt-1">
                                                <input
                                                    type="text"
                                                    value={customResponse}
                                                    onChange={e => setCustomResponse(e.target.value)}
                                                    placeholder="Or type a custom response to guide the agent..."
                                                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none"
                                                />
                                            </div>
                                        )}

                                        {/* Submit button */}
                                        <div className="flex justify-end pt-2">
                                            {submitSuccess ? (
                                                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 px-3.5 py-2 bg-emerald-950/60 rounded-xl border border-emerald-800">
                                                    <div className="w-3.5 h-3.5">{Icon.check}</div> Response Sent to Agent!
                                                </div>
                                            ) : (
                                                <button
                                                    disabled={isSubmitting || (selectedOptions.size === 0 && !customResponse.trim())}
                                                    onClick={handleInteractionSubmit}
                                                    className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-md shadow-blue-900/40"
                                                >
                                                    {isSubmitting ? 'Sending to Agent…' : 'Submit Response'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─── Bottom Composer (Antigravity IDE Style) ────────────── */}
                        <div className="p-3 md:p-4 bg-zinc-900/90 border-t border-zinc-800 shrink-0 pb-safe">
                            <div className="max-w-3xl mx-auto w-full space-y-2">
                                {/* Quick Suggestion Chips */}
                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                    {quickActions.map(action => (
                                        <button
                                            key={action}
                                            onClick={() => setPromptText(action)}
                                            className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-750 px-3 py-1 rounded-full border border-zinc-750 transition shrink-0 active:scale-95"
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>

                                {/* Rounded Composer Card */}
                                <div className="rounded-2xl bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700 p-3 shadow-lg transition">
                                    <textarea
                                        value={promptText}
                                        onChange={e => setPromptText(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendPrompt();
                                            }
                                        }}
                                        placeholder="Ask anything, @ to mention, / for actions…"
                                        rows={2}
                                        className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none max-h-36 leading-relaxed"
                                    />

                                    {/* Bottom controls row inside composer */}
                                    <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-xs">
                                        <div className="flex items-center gap-2">
                                            {/* Mode Selector Pill */}
                                            <button
                                                type="button"
                                                onClick={() => setActiveModal('mode')}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition"
                                            >
                                                <span>⚡ {appState.mode}</span>
                                            </button>

                                            {/* Model Selector Pill */}
                                            <button
                                                type="button"
                                                onClick={() => setActiveModal('model')}
                                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 transition font-medium"
                                            >
                                                <span>✦ {appState.model.split(' ')[0]}</span>
                                                <div className="w-3 h-3 text-zinc-500">{Icon.chevronDown}</div>
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Emergency Stop Button */}
                                            <button
                                                type="button"
                                                onClick={handleStop}
                                                title="Stop Generation"
                                                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60 border border-rose-900/60 transition active:scale-95"
                                            >
                                                <div className="w-4 h-4">{Icon.stop}</div>
                                            </button>

                                            {/* Send Button */}
                                            <button
                                                type="button"
                                                disabled={!promptText.trim() || isSendingPrompt}
                                                onClick={handleSendPrompt}
                                                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition active:scale-95 shadow-md shadow-blue-900/40"
                                            >
                                                <div className="w-4 h-4">{Icon.send}</div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* VIEW 2: Mirrored IDE Viewport Screen */
                    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950">
                        {/* Screen Toolbar */}
                        <div className="px-4 py-2 border-b border-zinc-850 bg-zinc-900/80 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                                <span className="font-semibold text-zinc-200">Antigravity Workspace Viewport</span>
                                <span>·</span>
                                <span className="text-emerald-400 font-mono">Port 9000</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <button
                                    onClick={() => setFitMode(f => f === 'fit' ? 'full' : 'fit')}
                                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                                >
                                    {fitMode === 'fit' ? '🔍 Zoom 100%' : '📏 Fit to Screen'}
                                </button>
                                <button
                                    onClick={() => setLightboxOpen(true)}
                                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                                    title="Open Fullscreen"
                                >
                                    <div className="w-4 h-4">{Icon.maximize}</div>
                                </button>
                            </div>
                        </div>

                        {/* Viewport Image Container */}
                        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-0">
                            {snapshotData?.screenshot ? (
                                <img
                                    src={snapshotData.screenshot}
                                    alt="Antigravity IDE Viewport"
                                    onClick={() => setLightboxOpen(true)}
                                    className={`cursor-zoom-in rounded-xl border border-zinc-800 shadow-2xl transition-all ${
                                        fitMode === 'fit' ? 'max-w-full max-h-[80vh] object-contain' : 'min-w-[1400px] h-auto'
                                    }`}
                                />
                            ) : (
                                <div className="text-center p-8 space-y-2 text-zinc-500">
                                    <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center mx-auto text-zinc-600 mb-2">
                                        <div className="w-6 h-6">{Icon.screen}</div>
                                    </div>
                                    <p className="text-sm font-medium text-zinc-300">Antigravity CDP Viewport</p>
                                    <p className="text-xs">No active window screenshot captured yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* ─── Drawers & Modals (Additional Features) ─────────────── */}
            <ActivityTimelineDrawer
                isOpen={timelineOpen}
                onClose={() => setTimelineOpen(false)}
                events={timelineEvents}
                isLoading={isTimelineLoading}
                activeCategory={timelineCategory}
                onSelectCategory={setTimelineCategory}
                searchQuery={timelineSearch}
                onChangeSearch={setTimelineSearch}
                onRefresh={fetchTimelineEvents}
            />

            <SystemLogsDrawer
                isOpen={logsOpen}
                onClose={() => setLogsOpen(false)}
                logs={systemLogs}
                isLoading={isLogsLoading}
                onRefresh={fetchSystemLogs}
            />

            <RecoveryCenterModal
                isOpen={recoveryOpen}
                onClose={() => setRecoveryOpen(false)}
                recoveryItems={recoveryItems}
                diagnostics={diagnostics}
                isLoading={isRecoveryLoading}
                onRefresh={fetchRecoveryItems}
                onReconcileAction={handleReconcileAction}
                onOpenInteraction={() => { setRecoveryOpen(false); setViewMode('chat'); }}
            />

            <HistoryDrawer
                isOpen={historyOpen}
                onClose={() => setHistoryOpen(false)}
                chats={historyChats}
                isLoading={isHistoryLoading}
                onSelectChat={(title) => {
                    fetch('/select-chat', {
                        method: 'POST',
                        headers: { ...h, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title })
                    });
                    setTimeout(fetchSnapshot, 500);
                    setHistoryOpen(false);
                }}
            />

            {/* Mode Selection Modal */}
            {activeModal === 'mode' && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm select-none" onClick={() => setActiveModal(null)}>
                    <div className="w-full max-w-sm bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-4 pb-8 space-y-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                            <h3 className="text-sm font-semibold text-zinc-100">Agent Mode</h3>
                            <button onClick={() => setActiveModal(null)} className="p-1 text-zinc-400 hover:text-white">
                                <div className="w-4 h-4">{Icon.x}</div>
                            </button>
                        </div>
                        <div className="space-y-1">
                            {['Fast', 'Planning'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => handleSetMode(m)}
                                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                                        appState.mode === m ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800 text-zinc-200'
                                    }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Model Selection Modal */}
            {activeModal === 'model' && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm select-none" onClick={() => setActiveModal(null)}>
                    <div className="w-full max-w-sm bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-4 pb-8 space-y-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                            <h3 className="text-sm font-semibold text-zinc-100">Select Model</h3>
                            <button onClick={() => setActiveModal(null)} className="p-1 text-zinc-400 hover:text-white">
                                <div className="w-4 h-4">{Icon.x}</div>
                            </button>
                        </div>
                        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                            {[
                                'Default Antigravity Agent',
                                'Gemini 3.8 Flash (Medium)',
                                'Gemini 3.1 Pro (High)',
                                'Claude Sonnet 4.6 (Thinking)',
                                'Claude Opus 4.6 (Thinking)',
                                'GPT-OSS 120B (Medium)'
                            ].map(m => (
                                <button
                                    key={m}
                                    onClick={() => handleSetModel(m)}
                                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                                        appState.model === m ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800 text-zinc-200'
                                    }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Viewport Lightbox */}
            {lightboxOpen && snapshotData?.screenshot && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex flex-col p-4 select-none cursor-zoom-out"
                    onClick={() => setLightboxOpen(false)}
                >
                    <div className="flex items-center justify-between pb-3 shrink-0">
                        <span className="text-xs font-semibold text-zinc-300">Fullscreen Antigravity Viewport</span>
                        <button
                            onClick={() => setLightboxOpen(false)}
                            className="p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition"
                        >
                            <div className="w-5 h-5">{Icon.x}</div>
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center overflow-auto">
                        <img
                            src={snapshotData.screenshot}
                            alt="Fullscreen Viewport"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
