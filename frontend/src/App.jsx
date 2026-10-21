import React, { useState, useEffect, useRef } from 'react';
import { ActivityTimelineDrawer } from './components/ActivityTimelineDrawer';
import { RecoveryCenterModal } from './components/RecoveryCenterModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { SystemLogsDrawer } from './components/SystemLogsDrawer';
import { ReviewChangesModal } from './components/ReviewChangesModal';
import MarkdownView from './components/MarkdownView';

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
    file: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    fileEdit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 13.5V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2h-5.5"/><polyline points="14 2 14 8 20 8"/><path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"/></svg>,
    copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
    thumbsUp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>,
    thumbsDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>,
    brain: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M12 5v14"/></svg>,
    globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    zap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
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
    const [reviewChangesOpen, setReviewChangesOpen] = useState(false);
    const [activeModal, setActiveModal] = useState(null); // 'mode' | 'model'
    const [copiedId, setCopiedId] = useState(null);
    const [reactions, setReactions] = useState({});

    // Server State
    const [appState, setAppState] = useState({ status: 'Connecting…', connected: false, mode: 'Fast', model: 'Gemini 3.8 Flash (Medium)' });
    const [snapshotData, setSnapshotData] = useState(null);
    const [pendingInteraction, setPendingInteraction] = useState(null);
    const [selectedOptions, setSelectedOptions] = useState(new Set());
    const [customResponse, setCustomResponse] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Timeline, Logs & Recovery
    // Real conversation stream
    const [chatMessages, setChatMessages] = useState([]);
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

    const [approvals, setApprovals] = useState({});
    const [openStepIds, setOpenStepIds] = useState(new Set());
    const [openThinkingIds, setOpenThinkingIds] = useState(new Set());

    const toggleStep = (stepId) => {
        setOpenStepIds(prev => {
            const next = new Set(prev);
            if (next.has(stepId)) next.delete(stepId);
            else next.add(stepId);
            return next;
        });
    };

    const toggleThinking = (turnId) => {
        setOpenThinkingIds(prev => {
            const next = new Set(prev);
            if (next.has(turnId)) next.delete(turnId);
            else next.add(turnId);
            return next;
        });
    };

    const [openWorkedIds, setOpenWorkedIds] = useState(new Set());
    const toggleWorked = (turnId) => {
        setOpenWorkedIds(prev => {
            const next = new Set(prev);
            if (next.has(turnId)) next.delete(turnId);
            else next.add(turnId);
            return next;
        });
    };

    const handleApproval = async (requestType, target, decision, stepId) => {
        setApprovals(prev => ({ ...prev, [stepId]: decision }));
        try {
            await fetch('/api/v1/approvals/respond', {
                method: 'POST',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    request_type: requestType,
                    target: target || 'unknown',
                    decision: decision,
                    step_id: stepId
                })
            });
        } catch (err) {
            console.error('Failed to record approval decision:', err);
        }
    };

    const chatScrollRef = useRef(null);
    const messagesEndRef = useRef(null);
    const isMountedRef = useRef(true);
    const snapshotSeqRef = useRef(0);
    const shouldAutoScrollRef = useRef(true);
    const [isScrolledUp, setIsScrolledUp] = useState(false);

    const handleChatScroll = (e) => {
        const el = e.currentTarget;
        if (!el) return;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        const isNearBottom = distanceFromBottom < 90;
        shouldAutoScrollRef.current = isNearBottom;
        setIsScrolledUp(!isNearBottom);
    };

    const scrollToBottom = () => {
        shouldAutoScrollRef.current = true;
        setIsScrolledUp(false);
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTo({
                top: chatScrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

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

    const fetchChatMessages = async () => {
        try {
            const res = await fetch('/api/v1/chat/messages?limit=50', { headers: h });
            if (res.ok) {
                const data = await res.json();
                if (data.messages && isMountedRef.current) {
                    setChatMessages(data.messages);
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

    // ─── WebSocket Connection for Real-Time Streaming ────────────────────────
    useEffect(() => {
        let ws = null;
        let pingTimer = null;
        let reconnectTimer = null;
        let isClosedIntentionally = false;

        const connect = () => {
            if (isClosedIntentionally) return;
            try {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = `${protocol}//${window.location.host}/ws`;
                ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    // Send periodic ping to keep socket connection alive
                    pingTimer = setInterval(() => {
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send('ping');
                        }
                    }, 25000);
                };

                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data);
                        if (payload.messages && Array.isArray(payload.messages)) {
                            setChatMessages(payload.messages);
                        }
                    } catch {}
                };

                ws.onclose = () => {
                    clearInterval(pingTimer);
                    if (!isClosedIntentionally) {
                        reconnectTimer = setTimeout(connect, 3000);
                    }
                };

                ws.onerror = () => {
                    try { ws.close(); } catch {}
                };
            } catch {
                if (!isClosedIntentionally) {
                    reconnectTimer = setTimeout(connect, 4000);
                }
            }
        };

        connect();

        return () => {
            isClosedIntentionally = true;
            clearInterval(pingTimer);
            clearTimeout(reconnectTimer);
            if (ws) {
                try { ws.close(); } catch {}
            }
        };
    }, []);

    // ─── Lifecycle & Intervals ────────────────────────────────────────────────
    useEffect(() => {
        isMountedRef.current = true;
        fetchAppState();
        fetchSnapshot();
        fetchPendingInteractions();
        fetchChatMessages();
        fetchRecoveryItems();
        fetchDiagnostics();
        fetchTimelineEvents();
        fetchSystemLogs();

        const fastInterval = setInterval(() => {
            if (!isMountedRef.current) return;
            fetchAppState();
            fetchPendingInteractions();
            fetchChatMessages();
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

    // Smart auto-scroll: only scrolls to bottom if the user has NOT scrolled up
    useEffect(() => {
        if (shouldAutoScrollRef.current && chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatMessages, pendingInteraction, viewMode]);

    // ─── Handlers ─────────────────────────────────────────────────────────────
    const handleSendPrompt = async () => {
        const msg = promptText.trim();
        if (!msg || isSendingPrompt) return;
        setIsSendingPrompt(true);
        shouldAutoScrollRef.current = true;
        setIsScrolledUp(false);
        const saved = promptText;
        setPromptText('');

        // Optimistically add user prompt and active agent thinking turn right away
        setChatMessages(prev => [
            ...prev,
            {
                id: 'local-user-' + Date.now(),
                role: 'user',
                text: msg,
                timestamp: new Date().toISOString()
            },
            {
                id: 'local-agent-' + Date.now(),
                role: 'agent',
                text: '',
                thinking: '',
                steps: [],
                timestamp: new Date().toISOString(),
                is_working: true
            }
        ]);

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
                setTimeout(fetchChatMessages, 500);
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
                        className="p-2 rounded-lg text-zinc-300 bg-zinc-800 hover:bg-zinc-750 transition active:scale-95 border border-zinc-700/80 ml-1"
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
                        {/* Conversation Message Stream (Bottom-anchored directly above composer) */}
                        <div
                            ref={chatScrollRef}
                            onScroll={handleChatScroll}
                            id="chat-scroll-container"
                            className="flex-1 overflow-y-auto p-4 md:p-6 max-w-3xl mx-auto w-full select-text flex flex-col relative"
                        >
                            {/* Bottom-anchoring spacer pushes conversation directly above composer */}
                            <div className="flex-1 min-h-[16px]" />

                            <div className="space-y-4 w-full">
                                {/* Antigravity Context Header if chat is starting */}
                                {chatMessages.length === 0 && (
                                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-850 flex items-start gap-3 text-xs leading-relaxed animate-in fade-in duration-300">
                                        <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                            <div className="w-4 h-4">{Icon.sparkles}</div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-zinc-100">Antigravity Coding Assistant</h3>
                                            <p className="text-zinc-400 mt-0.5">
                                                Connected to your live Antigravity IDE workspace. Real-time updates, interactive decision prompts, and conversation turns appear directly here.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Render Snapshot HTML if Antigravity provided chat DOM */}
                                {snapshotData?.html && snapshotData.html.includes('chat-content') ? (
                                    <div
                                        className="chat-content space-y-3"
                                        dangerouslySetInnerHTML={{ __html: snapshotData.html }}
                                    />
                                ) : null}

                                {/* Render Genuine Antigravity Conversation Turns */}
                                {chatMessages.map((turn, idx) => {
                                    const isUser = turn.role === 'user';
                                    const timeStr = turn.timestamp
                                        ? new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        : null;

                                    if (isUser) {
                                        return (
                                            <div key={turn.id || idx} className="flex justify-end animate-in fade-in duration-150">
                                                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 px-4 py-3 text-sm text-white shadow-md">
                                                    <p className="whitespace-pre-wrap leading-relaxed">{turn.text}</p>
                                                    {timeStr && (
                                                        <span className="block text-right text-[10px] text-blue-200 mt-1">{timeStr}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={turn.id || idx} className="flex justify-start animate-in fade-in duration-150">
                                            <div className="max-w-[92%] md:max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-850 border border-zinc-750/70 p-4 text-sm text-zinc-100 shadow-md space-y-2.5">
                                                <div className="flex items-center gap-2 pb-1 border-b border-zinc-750/40 text-xs text-zinc-400">
                                                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                                    <span className="font-semibold text-zinc-300">Antigravity Agent</span>
                                                    {timeStr && (
                                                        <span className="text-[10px] text-zinc-500 font-mono ml-auto">{timeStr}</span>
                                                    )}
                                                </div>

                                                {/* ─── Antigravity Thinking Process ─────────────────── */}
                                                {(turn.thinking || turn.is_working) && (
                                                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden text-xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleThinking(turn.id || idx)}
                                                            className="w-full flex items-center justify-between px-3 py-2 cursor-pointer text-zinc-400 hover:text-zinc-200 select-none transition"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-3.5 h-3.5 ${turn.is_working ? 'text-blue-400 animate-pulse' : 'text-zinc-400'}`}>{Icon.brain}</div>
                                                                <span className={`font-medium ${turn.is_working ? 'text-blue-300' : 'text-zinc-300'}`}>
                                                                    {turn.is_working ? 'Thinking...' : 'Thinking Process'}
                                                                </span>
                                                                {turn.is_working && (
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping ml-1" />
                                                                )}
                                                            </div>
                                                            <div className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-150 ${(openThinkingIds.has(turn.id || idx) || (turn.is_working && !turn.text)) ? 'rotate-90' : ''}`}>
                                                                {Icon.chevronRight}
                                                            </div>
                                                        </button>
                                                        {(openThinkingIds.has(turn.id || idx) || (turn.is_working && !turn.text)) && (
                                                            <div className="px-3.5 py-2.5 bg-zinc-950/80 border-t border-zinc-800/80 font-mono text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto select-text">
                                                                {turn.thinking || (
                                                                    <span className="inline-flex items-center gap-2 text-zinc-500 italic">
                                                                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                                                        Analyzing context and planning next steps...
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* ─── Antigravity Tool Steps & Permissions ──────────── */}
                                                {turn.steps && turn.steps.length > 0 && (() => {
                                                    const isWorkedOpen = openWorkedIds.has(turn.id || idx);
                                                    const shouldCollapse = turn.steps.length > 3 && !isWorkedOpen;
                                                    const stepsToRender = shouldCollapse
                                                        ? turn.steps.map((s, i) => ({ step: s, sidx: i })).filter(({ step, sidx }) => sidx >= turn.steps.length - 2)
                                                        : turn.steps.map((step, sidx) => ({ step, sidx }));
                                                    const hiddenCount = turn.steps.length - stepsToRender.length;

                                                    return (
                                                        <div className="space-y-2">
                                                            {shouldCollapse && hiddenCount > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleWorked(turn.id || idx)}
                                                                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850/80 text-zinc-400 hover:text-zinc-200 transition text-xs font-mono select-none cursor-pointer"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-3.5 h-3.5 text-zinc-400">{Icon.check}</div>
                                                                        <span>Worked on {hiddenCount} earlier steps</span>
                                                                    </div>
                                                                    <span className="text-[10px] text-blue-400 hover:underline font-sans">Show all</span>
                                                                </button>
                                                            )}

                                                            {isWorkedOpen && turn.steps.length > 4 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleWorked(turn.id || idx)}
                                                                    className="w-full flex items-center justify-between px-3 py-1 rounded-lg border border-zinc-800/60 bg-zinc-950/40 text-zinc-500 hover:text-zinc-300 transition text-[10px] font-mono select-none cursor-pointer"
                                                                >
                                                                    <span>Collapse earlier steps</span>
                                                                    <span className="text-zinc-400">Hide</span>
                                                                </button>
                                                            )}

                                                            {stepsToRender.map(({ step, sidx }) => {
                                                                const stepKey = `${turn.id || idx}-${step.id || sidx}`;
                                                                const isOpen = openStepIds.has(stepKey) || (turn.is_working && sidx === turn.steps.length - 1);
                                                                const approvalState = approvals[stepKey];

                                                            return (
                                                                <div key={sidx} className="rounded-xl border border-zinc-800/90 bg-zinc-900/80 overflow-hidden text-xs">
                                                                    {/* Step Header Accordion Toggle */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleStep(stepKey)}
                                                                        className="w-full flex items-center justify-between px-3 py-2 cursor-pointer text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/40 select-none transition text-left"
                                                                    >
                                                                        <div className="flex items-center gap-2 min-w-0 pr-2">
                                                                            {step.kind === 'browser' && <div className="w-3.5 h-3.5 text-blue-400 shrink-0">{Icon.globe}</div>}
                                                                            {step.kind === 'command' && <div className="w-3.5 h-3.5 text-amber-400 shrink-0">{Icon.terminal}</div>}
                                                                            {step.kind === 'file_edit' && <div className="w-3.5 h-3.5 text-emerald-400 shrink-0">{Icon.fileEdit}</div>}
                                                                            {step.kind === 'file_view' && <div className="w-3.5 h-3.5 text-zinc-400 shrink-0">{Icon.file}</div>}
                                                                            {step.kind === 'search' && <div className="w-3.5 h-3.5 text-purple-400 shrink-0">{Icon.search}</div>}
                                                                            {step.kind === 'generic' && <div className="w-3.5 h-3.5 text-zinc-400 shrink-0">{Icon.zap}</div>}
                                                                            <span className="font-medium text-zinc-200 truncate font-mono text-[11px]">
                                                                                {step.summary || step.name}
                                                                            </span>
                                                                        </div>
                                                                        <div className={`w-3.5 h-3.5 text-zinc-500 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}>
                                                                            {Icon.chevronRight}
                                                                        </div>
                                                                    </button>

                                                                    {/* Step Content */}
                                                                    {isOpen && (
                                                                        <div className="p-3 bg-zinc-950/90 border-t border-zinc-800/80 space-y-2.5">
                                                                            {/* Command Box (Exact Antigravity Terminal Styling) */}
                                                                            {step.kind === 'command' && (
                                                                                <div className="relative rounded-xl bg-zinc-900/90 border border-zinc-800 p-3 font-mono text-[12px] text-amber-200/95 overflow-x-auto select-text">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => navigator.clipboard.writeText(step.command || '')}
                                                                                        title="Copy command"
                                                                                        className="absolute top-2.5 right-2.5 p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
                                                                                    >
                                                                                        <div className="w-3.5 h-3.5">{Icon.copy}</div>
                                                                                    </button>
                                                                                    <span className="text-zinc-500 select-none">{step.cwd_short || '.../workspace'} &gt; </span>
                                                                                    <span>{step.command}</span>
                                                                                </div>
                                                                            )}

                                                                            {/* File Edit Details */}
                                                                            {step.kind === 'file_edit' && (
                                                                                <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-2.5 text-[11px] font-mono text-zinc-300 space-y-1">
                                                                                    <div className="text-zinc-400"><span className="text-zinc-500">File:</span> {step.file}</div>
                                                                                    {step.instruction && (
                                                                                        <div className="text-zinc-300 font-sans text-xs">{step.instruction}</div>
                                                                                    )}
                                                                                </div>
                                                                            )}

                                                                            {/* Browser Exploration Details */}
                                                                            {step.kind === 'browser' && (
                                                                                <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-2.5 text-xs text-zinc-300">
                                                                                    <span className="text-zinc-400 font-medium">Task: </span>
                                                                                    <span>{step.task_name || 'Automated browser verification'}</span>
                                                                                </div>
                                                                            )}

                                                                            {/* ─── Permission / Approval Request Card ─── */}
                                                                            {step.requires_permission && (turn.is_working || approvalState) && (
                                                                                <div className="p-2.5 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-850 border border-zinc-750 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
                                                                                    <div>
                                                                                        <div className="font-semibold text-zinc-200 text-xs flex items-center gap-1.5">
                                                                                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                                                            <span>{step.permission_title || 'Authorization Required'}</span>
                                                                                        </div>
                                                                                        <p className="text-[11px] text-zinc-400 mt-0.5">
                                                                                            {step.permission_desc || 'Allow the agent to proceed with this action.'}
                                                                                        </p>
                                                                                    </div>

                                                                                    {/* Actions */}
                                                                                    {!approvalState ? (
                                                                                        <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleApproval(step.permission_type || 'command', step.command || step.file || step.task_name, 'allow', stepKey)}
                                                                                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition active:scale-95 shadow-sm"
                                                                                            >
                                                                                                Allow
                                                                                            </button>
                                                                                            {step.kind === 'command' && (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => handleApproval('command', step.command, 'always_allow', stepKey)}
                                                                                                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-[11px] transition active:scale-95"
                                                                                                >
                                                                                                    Always Allow
                                                                                                </button>
                                                                                            )}
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleApproval(step.permission_type || 'command', step.command || step.file || step.task_name, 'deny', stepKey)}
                                                                                                className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-medium text-[11px] transition active:scale-95"
                                                                                            >
                                                                                                Deny
                                                                                            </button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0 ${
                                                                                            approvalState === 'deny'
                                                                                                ? 'text-rose-400 bg-rose-950/60 border border-rose-800/60'
                                                                                                : 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60'
                                                                                        }`}>
                                                                                            <div className="w-3 h-3">
                                                                                                {approvalState === 'deny' ? Icon.x : Icon.check}
                                                                                            </div>
                                                                                            <span>{approvalState === 'always_allow' ? 'Always Allowed' : approvalState === 'allow' ? 'Allowed' : 'Denied'}</span>
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}

                                                {/* ─── Active Working Status Indicator ─────────────────── */}
                                                {turn.is_working && (
                                                    <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1 font-mono">
                                                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                                                        <span className="text-zinc-300 font-medium animate-pulse">Working..</span>
                                                    </div>
                                                )}

                                                {/* Agent Response Text (Rich Markdown with Code Highlighting) */}
                                                {turn.text && (
                                                    <MarkdownView content={turn.text} />
                                                )}

                                                {/* Antigravity Response Actions: Copy, Thumbs Up, Thumbs Down */}
                                                <div className="flex items-center justify-end gap-1 pt-1 text-zinc-500">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(turn.text || '');
                                                            setCopiedId(turn.id || idx);
                                                            setTimeout(() => setCopiedId(null), 1800);
                                                        }}
                                                        title="Copy text"
                                                        className="p-1 rounded-md hover:text-zinc-200 hover:bg-zinc-800 transition"
                                                    >
                                                        {copiedId === (turn.id || idx) ? (
                                                            <div className="w-3.5 h-3.5 text-emerald-400">{Icon.check}</div>
                                                        ) : (
                                                            <div className="w-3.5 h-3.5">{Icon.copy}</div>
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReactions(prev => ({ ...prev, [turn.id || idx]: prev[turn.id || idx] === 'up' ? null : 'up' }))}
                                                        title="Good response"
                                                        className={`p-1 rounded-md transition ${reactions[turn.id || idx] === 'up' ? 'text-blue-400 bg-blue-950/40' : 'hover:text-zinc-200 hover:bg-zinc-800'}`}
                                                    >
                                                        <div className="w-3.5 h-3.5">{Icon.thumbsUp}</div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setReactions(prev => ({ ...prev, [turn.id || idx]: prev[turn.id || idx] === 'down' ? null : 'down' }))}
                                                        title="Poor response"
                                                        className={`p-1 rounded-md transition ${reactions[turn.id || idx] === 'down' ? 'text-rose-400 bg-rose-950/40' : 'hover:text-zinc-200 hover:bg-zinc-800'}`}
                                                    >
                                                        <div className="w-3.5 h-3.5">{Icon.thumbsDown}</div>
                                                    </button>
                                                </div>
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

                            {/* Anchor element to smoothly scroll to latest message above input */}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Smart Floating "Jump to latest" Button */}
                        {isScrolledUp && (
                            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
                                <button
                                    type="button"
                                    onClick={scrollToBottom}
                                    className="px-3.5 py-1.5 rounded-full bg-zinc-800/95 hover:bg-zinc-700/95 border border-zinc-700/90 text-zinc-200 shadow-2xl backdrop-blur flex items-center gap-2 text-xs font-medium cursor-pointer transition active:scale-95 animate-in fade-in slide-in-from-bottom-2 select-none"
                                >
                                    <div className="w-3.5 h-3.5 text-blue-400">{Icon.chevronDown}</div>
                                    <span>Jump to latest</span>
                                </button>
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

                                {/* Antigravity Control Row (Files, Terminal, Screen, Recovery & Review Changes) */}
                                <div className="flex items-center justify-between px-1 text-xs pt-0.5">
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setReviewChangesOpen(true)}
                                            title="Inspect modified workspace files"
                                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95"
                                        >
                                            <div className="w-4 h-4">{Icon.file}</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLogsOpen(true)}
                                            title="Terminal & System Logs"
                                            className="relative p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95"
                                        >
                                            <div className="w-4 h-4">{Icon.terminal}</div>
                                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode(viewMode === 'chat' ? 'screen' : 'chat')}
                                            title="Toggle Workspace Viewport"
                                            className="relative p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95"
                                        >
                                            <div className="w-4 h-4">{Icon.screen}</div>
                                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRecoveryOpen(true)}
                                            title="Recovery Center & Safeguards"
                                            className="relative p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95"
                                        >
                                            <div className="w-4 h-4">{Icon.shield}</div>
                                            {recoveryItems.length > 0 && (
                                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Review Changes Pill Button */}
                                    <button
                                        type="button"
                                        onClick={() => setReviewChangesOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750/90 text-xs font-medium transition active:scale-95 shadow-sm"
                                    >
                                        <div className="w-3.5 h-3.5 text-zinc-400">{Icon.file}</div>
                                        <span>Review Changes</span>
                                    </button>
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
                                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition"
                                            >
                                                <div className="w-3.5 h-3.5 text-amber-400">{Icon.zap}</div>
                                                <span>{appState.mode}</span>
                                            </button>

                                            {/* Model Selector Pill */}
                                            <button
                                                type="button"
                                                onClick={() => setActiveModal('model')}
                                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 transition font-medium"
                                            >
                                                <div className="w-3.5 h-3.5 text-blue-400">{Icon.sparkles}</div>
                                                <span>{appState.model.split(' ')[0]}</span>
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
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                                >
                                    <div className="w-3.5 h-3.5">{Icon.search}</div>
                                    <span>{fitMode === 'fit' ? 'Zoom 100%' : 'Fit to Screen'}</span>
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

            <ReviewChangesModal
                isOpen={reviewChangesOpen}
                onClose={() => setReviewChangesOpen(false)}
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
