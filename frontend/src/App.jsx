import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { SettingsBar } from './components/SettingsBar';
import { Viewport } from './components/Viewport';
import { InteractionDrawer } from './components/InteractionDrawer';
import { PromptComposer } from './components/PromptComposer';
import { HistoryDrawer } from './components/HistoryDrawer';
import { SelectionModal } from './components/SelectionModal';
import { ActivityTimelineDrawer } from './components/ActivityTimelineDrawer';
import { RecoveryCenterModal } from './components/RecoveryCenterModal';

export default function App() {
    // Reactive Application State
    const [appState, setAppState] = useState({
        status: 'Connecting...',
        connected: false,
        mode: 'Fast',
        model: 'Default Antigravity Agent'
    });
    const [chatStats, setChatStats] = useState('Syncing...');
    const [snapshotData, setSnapshotData] = useState(null);
    const [pendingInteraction, setPendingInteraction] = useState(null);
    const [isInteractionCollapsed, setIsInteractionCollapsed] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState(new Set());
    const [customResponse, setCustomResponse] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [promptText, setPromptText] = useState('');
    const [isSendingPrompt, setIsSendingPrompt] = useState(false);

    // Timeline & Recovery Center State
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);
    const [timelineEvents, setTimelineEvents] = useState([]);
    const [isTimelineLoading, setIsTimelineLoading] = useState(false);
    const [timelineCategory, setTimelineCategory] = useState(null);
    const [timelineSearch, setTimelineSearch] = useState('');

    const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
    const [recoveryItems, setRecoveryItems] = useState([]);
    const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);

    // Drawers & Modals
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyChats, setHistoryChats] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [activeModal, setActiveModal] = useState(null); // 'mode' | 'model'

    const chatContainerRef = useRef(null);
    const snapshotSequenceRef = useRef(0);
    const isMountedRef = useRef(true);

    // Initial load and live polling
    useEffect(() => {
        isMountedRef.current = true;
        fetchAppState();
        fetchSnapshot();
        fetchPendingInteractions();

        const pollTimer = setInterval(() => {
            if (isMountedRef.current) {
                fetchAppState();
                fetchPendingInteractions();
                fetchSnapshot();
            }
        }, 3000);

        return () => {
            isMountedRef.current = false;
            clearInterval(pollTimer);
        };
    }, []);

    // 1. Fetch App State
    const fetchAppState = async () => {
        try {
            const res = await fetch('/app-state', { headers: { 'ngrok-skip-browser-warning': 'true' } });
            if (!isMountedRef.current) return;
            if (res.status === 401) {
                window.location.href = '/login.html';
                return;
            }
            if (res.ok) {
                const data = await res.json();
                if (!isMountedRef.current) return;
                setAppState({
                    status: data.antigravity_connected ? 'Live' : 'Standby',
                    connected: Boolean(data.antigravity_connected),
                    mode: data.mode || 'Fast',
                    model: data.model || 'Default Antigravity Agent'
                });
            }
        } catch (e) {
            console.warn('App state fetch error:', e);
        }
    };

    // 2. Fetch Viewport Snapshot with sequence counter to prevent out-of-order overwrite
    const fetchSnapshot = async () => {
        const seq = ++snapshotSequenceRef.current;
        try {
            const res = await fetch('/snapshot', { headers: { 'ngrok-skip-browser-warning': 'true' } });
            if (!isMountedRef.current) return;
            if (res.ok) {
                const data = await res.json();
                // Ignore stale out-of-order response
                if (seq < snapshotSequenceRef.current || !isMountedRef.current) return;
                setSnapshotData(data);
                if (data.stats) {
                    const kbs = Math.round(((data.stats.htmlSize || 0) + (data.stats.cssSize || 0)) / 1024);
                    setChatStats(`${data.stats.nodes || 0} Nodes · ${kbs}KB`);
                }
            }
        } catch (e) {
            console.warn('Snapshot fetch error:', e);
        }
    };

    // 3. Fetch Pending Dynamic Interactions
    const fetchPendingInteractions = async () => {
        try {
            const res = await fetch('/api/v1/interactions/pending', { headers: { 'ngrok-skip-browser-warning': 'true' } });
            if (!isMountedRef.current) return;
            if (res.ok) {
                const data = await res.json();
                if (!isMountedRef.current) return;
                if (data.interactions && data.interactions.length > 0) {
                    const latest = data.interactions[0];
                    setPendingInteraction(prev => {
                        if (!prev || prev.interaction_id !== latest.interaction_id) {
                            setSelectedOptions(new Set());
                            setCustomResponse('');
                            setSubmitSuccess(false);
                            setIsInteractionCollapsed(false);
                        }
                        return latest;
                    });
                } else {
                    setPendingInteraction(null);
                }
            }
        } catch (e) {
            console.warn('Interaction fetch error:', e);
        }
    };

    // 4. Fetch Activity Timeline Events
    const fetchTimelineEvents = async () => {
        setIsTimelineLoading(true);
        try {
            const params = new URLSearchParams();
            if (timelineCategory) params.append('category', timelineCategory);
            if (timelineSearch) params.append('search', timelineSearch);
            params.append('limit', '50');

            const res = await fetch(`/api/v1/events?${params.toString()}`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            if (res.ok) {
                const data = await res.json();
                setTimelineEvents(data.events || []);
            }
        } catch (e) {
            console.warn('Timeline fetch error:', e);
        } finally {
            setIsTimelineLoading(false);
        }
    };

    // 5. Fetch Recovery Center Action Items
    const fetchRecoveryItems = async () => {
        setIsRecoveryLoading(true);
        try {
            const res = await fetch('/api/v1/events/recovery-items', { headers: { 'ngrok-skip-browser-warning': 'true' } });
            if (res.ok) {
                const data = await res.json();
                setRecoveryItems(data || []);
            }
        } catch (e) {
            console.warn('Recovery items fetch error:', e);
        } finally {
            setIsRecoveryLoading(false);
        }
    };

    // 6. Manual Reconciliation Handler
    const handleReconcileAction = async ({ scope, idempotency_key, resolution_notes }) => {
        const res = await fetch('/api/v1/events/reconcile-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ scope, idempotency_key, resolution_notes })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Reconciliation failed');
        }
    };

    // Periodic check for recovery items count
    useEffect(() => {
        fetchRecoveryItems();
        const recTimer = setInterval(fetchRecoveryItems, 10000);
        return () => clearInterval(recTimer);
    }, []);

    // Fetch timeline when opened or filters change
    useEffect(() => {
        if (isTimelineOpen) {
            fetchTimelineEvents();
        }
    }, [isTimelineOpen, timelineCategory, timelineSearch]);

    // Prompt Submission with Idempotency
    const handleSendPrompt = async () => {
        const trimmed = promptText.trim();
        if (!trimmed || isSendingPrompt) return;

        setIsSendingPrompt(true);
        const savedText = promptText;
        setPromptText('');

        const idempotencyKey = 'prompt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

        try {
            const res = await fetch('/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ message: trimmed, idempotency_key: idempotencyKey })
            });
            if (!res.ok) {
                setPromptText(savedText);
            } else {
                setTimeout(fetchSnapshot, 500);
            }
        } catch (e) {
            setPromptText(savedText);
        } finally {
            setIsSendingPrompt(false);
        }
    };

    // Interaction Submission
    const handleInteractionSubmit = async () => {
        if (!pendingInteraction || isSubmitting) return;

        const isCustomProvided = Boolean(customResponse.trim());
        if (selectedOptions.size === 0 && !isCustomProvided) {
            alert('Please select an option or supply custom guidance.');
            return;
        }

        setIsSubmitting(true);
        const idempotencyKey = 'resp-' + pendingInteraction.interaction_id + '-' + Date.now();

        try {
            const res = await fetch(`/api/v1/interactions/${encodeURIComponent(pendingInteraction.interaction_id)}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({
                    selected_option_ids: Array.from(selectedOptions),
                    custom_response: isCustomProvided ? customResponse.trim() : null,
                    idempotency_key: idempotencyKey
                })
            });

            if (res.ok) {
                setSubmitSuccess(true);
                setTimeout(() => {
                    setPendingInteraction(null);
                    setSubmitSuccess(false);
                    fetchSnapshot();
                }, 1000);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`Submission error: ${err.detail || 'Could not resolve question.'}`);
            }
        } catch (e) {
            alert(`Network error: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Option Toggle Handler
    const handleToggleOption = (optId) => {
        const isMulti = pendingInteraction && pendingInteraction.kind === 'multiple_choice';
        setSelectedOptions(prev => {
            const next = new Set(prev);
            if (isMulti) {
                if (next.has(optId)) next.delete(optId);
                else next.add(optId);
            } else {
                next.clear();
                next.add(optId);
            }
            return next;
        });
    };

    // New Conversation Handler
    const handleNewChat = async () => {
        try {
            await fetch('/new-chat', { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true' } });
            setTimeout(fetchSnapshot, 400);
        } catch (e) {}
    };

    // Emergency Stop Handler
    const handleStop = async () => {
        try {
            await fetch('/stop', { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true' } });
        } catch (e) {}
    };

    // History Drawer Open
    const handleOpenHistory = async () => {
        setIsHistoryOpen(true);
        setIsHistoryLoading(true);
        try {
            const res = await fetch('/chat-history', { headers: { 'ngrok-skip-browser-warning': 'true' } });
            if (res.ok) {
                const data = await res.json();
                setHistoryChats(data.chats || []);
            }
        } catch (e) {
            setHistoryChats([]);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    // Select Chat from History
    const handleSelectChat = async (title) => {
        setIsHistoryOpen(false);
        try {
            await fetch('/select-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ title })
            });
            setTimeout(fetchSnapshot, 500);
        } catch (e) {}
    };

    // Mode Switcher
    const handleSetMode = async (mode) => {
        setActiveModal(null);
        try {
            await fetch('/set-mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ mode })
            });
            setAppState(prev => ({ ...prev, mode }));
        } catch (e) {}
    };

    // Model Switcher
    const handleSetModel = async (model) => {
        setActiveModal(null);
        try {
            await fetch('/set-model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ model })
            });
            setAppState(prev => ({ ...prev, model }));
        } catch (e) {}
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none">
            {/* 1. Header */}
            <Header
                status={appState.status}
                isConnected={appState.connected}
                onNewChat={handleNewChat}
                onOpenHistory={handleOpenHistory}
                onOpenTimeline={() => setIsTimelineOpen(true)}
                onOpenRecovery={() => setIsRecoveryOpen(true)}
                recoveryCount={recoveryItems.length}
                onStop={handleStop}
                onRefresh={() => { fetchAppState(); fetchSnapshot(); fetchRecoveryItems(); }}
            />

            {/* 2. Settings Bar */}
            <SettingsBar
                mode={appState.mode}
                model={appState.model}
                chatStats={chatStats}
                onOpenModeModal={() => setActiveModal('mode')}
                onOpenModelModal={() => setActiveModal('model')}
            />

            {/* 3. Viewport (Agent Workspace & Snapshot Viewer) */}
            <Viewport
                snapshotData={snapshotData}
                onStartNewChat={handleNewChat}
                chatContainerRef={chatContainerRef}
            />

            {/* 4. Dynamic Interaction Drawer (Collapsible & Reactive) */}
            <InteractionDrawer
                interaction={pendingInteraction}
                isCollapsed={isInteractionCollapsed}
                onToggleCollapse={() => setIsInteractionCollapsed(!isInteractionCollapsed)}
                selectedOptions={selectedOptions}
                onToggleOption={handleToggleOption}
                customResponse={customResponse}
                onChangeCustomResponse={setCustomResponse}
                isSubmitting={isSubmitting}
                submitSuccess={submitSuccess}
                onSubmit={handleInteractionSubmit}
            />

            {/* 5. Prompt Composer & Quick Actions */}
            <PromptComposer
                promptText={promptText}
                onChangePrompt={setPromptText}
                onSend={handleSendPrompt}
                isSending={isSendingPrompt}
                onSelectQuickAction={(action) => setPromptText(action)}
            />

            {/* 6. Selection Modal (Mode / Model) */}
            <SelectionModal
                isOpen={Boolean(activeModal)}
                title={activeModal === 'mode' ? 'Select Agent Mode' : 'Select Model'}
                options={activeModal === 'mode' ? ['Fast', 'Planning'] : [
                    "Default Antigravity Agent",
                    "Gemini 3.1 Pro (High)",
                    "Claude Sonnet 4.6 (Thinking)",
                    "Claude Opus 4.6 (Thinking)",
                    "GPT-OSS 120B (Medium)"
                ]}
                onSelect={activeModal === 'mode' ? handleSetMode : handleSetModel}
                onClose={() => setActiveModal(null)}
            />

            {/* 7. History Drawer */}
            <HistoryDrawer
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                chats={historyChats}
                isLoading={isHistoryLoading}
                onSelectChat={handleSelectChat}
            />

            {/* 8. Activity Timeline & Trace Drawer */}
            <ActivityTimelineDrawer
                isOpen={isTimelineOpen}
                onClose={() => setIsTimelineOpen(false)}
                events={timelineEvents}
                isLoading={isTimelineLoading}
                activeCategory={timelineCategory}
                onSelectCategory={setTimelineCategory}
                searchQuery={timelineSearch}
                onChangeSearch={setTimelineSearch}
                onRefresh={fetchTimelineEvents}
            />

            {/* 9. Recovery & Diagnostics Center Modal */}
            <RecoveryCenterModal
                isOpen={isRecoveryOpen}
                onClose={() => setIsRecoveryOpen(false)}
                recoveryItems={recoveryItems}
                isLoading={isRecoveryLoading}
                onRefresh={fetchRecoveryItems}
                onReconcileAction={handleReconcileAction}
                onOpenInteraction={() => setIsInteractionCollapsed(false)}
            />
        </div>
    );
}
