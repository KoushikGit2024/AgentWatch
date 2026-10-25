import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { WebSocketClient } from '../services/websocket';
import { toast } from '../services/toastService';

const PAGE_BLOCK_SIZE = 15;

/**
 * Merge newly streamed recent turns with any older history blocks that the user
 * has already lazy-loaded by scrolling up, preserving all loaded blocks in memory.
 */
function mergeTurnsPreservingHistory(existingTurns, incomingRecentTurns) {
    if (!Array.isArray(incomingRecentTurns) || incomingRecentTurns.length === 0) {
        return existingTurns;
    }
    if (!Array.isArray(existingTurns) || existingTurns.length === 0) {
        return incomingRecentTurns;
    }
    const incomingIds = new Set(incomingRecentTurns.map(t => t.id));
    const firstIncomingIdx = incomingRecentTurns[0]?.turn_index;

    const preservedOlder = existingTurns.filter(t => {
        if (!t || !t.id || t.id.startsWith('client-')) return false;
        if (incomingIds.has(t.id)) return false;
        if (typeof firstIncomingIdx === 'number' && typeof t.turn_index === 'number') {
            return t.turn_index < firstIncomingIdx;
        }
        return true;
    });

    return [...preservedOlder, ...incomingRecentTurns];
}

export function useAgentWatch({ isScreenActive = false } = {}) {
    // Core Server & Stream State
    const [appState, setAppState] = useState({
        status: 'Connecting…',
        connected: false,
        mode: 'Fast',
        model: null,
        available_models: [],
        available_modes: ['Fast', 'Planning']
    });
    const [snapshotData, setSnapshotData] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);

    const [pendingInteraction, setPendingInteraction] = useState(null);
    const [isInteractionMinimized, setIsInteractionMinimized] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState(new Set());
    const [customResponse, setCustomResponse] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [isSendingPrompt, setIsSendingPrompt] = useState(false);

    // Timeline, Logs, Recovery, History
    const [timelineEvents, setTimelineEvents] = useState([]);
    const [isTimelineLoading, setIsTimelineLoading] = useState(false);
    const [systemLogs, setSystemLogs] = useState([]);
    const [isLogsLoading, setIsLogsLoading] = useState(false);
    const [recoveryItems, setRecoveryItems] = useState([]);
    const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);
    const [diagnostics, setDiagnostics] = useState(null);
    const [historyChats, setHistoryChats] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // Approvals State
    const [approvals, setApprovals] = useState({});
    const [pendingApproval, setPendingApproval] = useState(null);
    const [isApprovalMinimized, setIsApprovalMinimized] = useState(false);
    const [isApprovaling, setIsApprovaling] = useState(false);

    // References
    const isMountedRef = useRef(true);
    const snapshotSeqRef = useRef(0);
    const lastSnapshotHashRef = useRef(null);
    const wsClientRef = useRef(null);
    const wsConnectedRef = useRef(false);
    const dismissedApprovalStepRef = useRef(null);
    const oldestTurnIndexRef = useRef(null);
    const isLoadingOlderRef = useRef(false);

    // ─── Fetchers ─────────────────────────────────────────────────────────────
    const fetchAppState = useCallback(async () => {
        if (typeof document !== 'undefined' && document.hidden) return;
        try {
            const data = await api.getAppState();
            if (isMountedRef.current) {
                setAppState({
                    ...data,
                    connected: Boolean(data.connected ?? data.antigravity_connected)
                });
            }
        } catch {}
    }, []);

    const fetchSnapshot = useCallback(async () => {
        if (typeof document !== 'undefined' && document.hidden) return;
        const seq = ++snapshotSeqRef.current;
        try {
            const data = await api.getSnapshot(lastSnapshotHashRef.current);
            if (isMountedRef.current && seq === snapshotSeqRef.current) {
                if (data.status === 'unchanged') {
                    return;
                }
                if (data.hash) {
                    lastSnapshotHashRef.current = data.hash;
                }
                setSnapshotData(data);
            }
        } catch {}
    }, []);

    const fetchInteractions = useCallback(async () => {
        if (typeof document !== 'undefined' && document.hidden) return;
        try {
            const data = await api.getPendingInteractions();
            if (isMountedRef.current) {
                const item = data.interaction || (data.interactions && data.interactions[0]) || null;
                setPendingInteraction(prev => {
                    if (!item) {
                        setIsInteractionMinimized(false);
                        return null;
                    }
                    if (prev && prev.interaction_id === item.interaction_id) {
                        return prev;
                    }
                    setSelectedOptions(new Set());
                    setCustomResponse('');
                    setIsInteractionMinimized(false);
                    return item;
                });
            }
        } catch {}
    }, []);

    const fetchPendingApprovals = useCallback(async () => {
        if (typeof document !== 'undefined' && document.hidden) return;
        try {
            const data = await api.getPendingApprovals();
            if (isMountedRef.current) {
                const incoming = data.approval || null;
                setPendingApproval(prev => {
                    if (!incoming) {
                        setIsApprovalMinimized(false);
                        return null;
                    }
                    const incomingKey = incoming.step_id || incoming.target;
                    const prevKey = prev ? (prev.step_id || prev.target) : null;
                    if (prev && prevKey === incomingKey) {
                        return prev;
                    }
                    if (dismissedApprovalStepRef.current !== incomingKey) {
                        setIsApprovalMinimized(false);
                    }
                    return incoming;
                });
            }
        } catch {}
    }, []);

    const fetchChatMessages = useCallback(async () => {
        try {
            const data = await api.getChatMessages(PAGE_BLOCK_SIZE);
            if (isMountedRef.current) {
                const incoming = data.messages || [];
                setChatMessages(prev => mergeTurnsPreservingHistory(prev, incoming));
                if (oldestTurnIndexRef.current === null && typeof data.oldest_index === 'number') {
                    oldestTurnIndexRef.current = data.oldest_index;
                    setHasMoreHistory(Boolean(data.has_more));
                }
            }
        } catch {}
    }, []);

    /**
     * Request-based upward lazy-loading: fetches the next block of older turns
     * preceding `oldestTurnIndexRef.current` and prepends them to `chatMessages`.
     * Once loaded, the block stays in memory; scrolling up again loads the next block.
     */
    const loadOlderMessages = useCallback(async () => {
        if (isLoadingOlderRef.current) return false;
        const cursor = oldestTurnIndexRef.current;
        if (cursor !== null && cursor <= 0) {
            setHasMoreHistory(false);
            return false;
        }

        isLoadingOlderRef.current = true;
        setIsLoadingOlder(true);
        try {
            const data = await api.getChatMessages(PAGE_BLOCK_SIZE, cursor);
            if (isMountedRef.current) {
                const olderSlice = data.messages || [];
                if (olderSlice.length > 0) {
                    setChatMessages(prev => {
                        const existingIds = new Set(prev.map(t => t.id));
                        const uniqueOlder = olderSlice.filter(t => !existingIds.has(t.id));
                        return [...uniqueOlder, ...prev];
                    });
                }
                const newOldest = typeof data.oldest_index === 'number' ? data.oldest_index : 0;
                oldestTurnIndexRef.current = newOldest;
                setHasMoreHistory(Boolean(data.has_more && newOldest > 0));
                return olderSlice.length > 0;
            }
        } catch (err) {
            console.warn('Failed to load older messages:', err);
        } finally {
            isLoadingOlderRef.current = false;
            if (isMountedRef.current) {
                setIsLoadingOlder(false);
            }
        }
        return false;
    }, []);

    const fetchTimelineEvents = useCallback(async () => {
        setIsTimelineLoading(true);
        try {
            const data = await api.getTimeline(80);
            if (isMountedRef.current) {
                setTimelineEvents(data.events || []);
            }
        } catch {} finally {
            if (isMountedRef.current) setIsTimelineLoading(false);
        }
    }, []);

    const fetchSystemLogs = useCallback(async () => {
        setIsLogsLoading(true);
        try {
            const data = await api.getLogs(250);
            if (isMountedRef.current) {
                setSystemLogs(data.logs || []);
            }
        } catch {} finally {
            if (isMountedRef.current) setIsLogsLoading(false);
        }
    }, []);

    const fetchRecoveryItems = useCallback(async () => {
        setIsRecoveryLoading(true);
        try {
            const [recData, diagData] = await Promise.all([
                api.getRecoveryItems().catch(() => ({ recovery_items: [] })),
                api.getDiagnostics().catch(() => null)
            ]);
            if (isMountedRef.current) {
                const items = Array.isArray(recData) ? recData : (recData.recovery_items || []);
                setRecoveryItems(items);
                setDiagnostics(diagData);
            }
        } catch {} finally {
            if (isMountedRef.current) setIsRecoveryLoading(false);
        }
    }, []);

    const fetchHistoryChats = useCallback(async () => {
        setIsHistoryLoading(true);
        try {
            const data = await api.getHistoryChats();
            if (isMountedRef.current) {
                setHistoryChats(data.chats || []);
            }
        } catch {
            if (isMountedRef.current) setHistoryChats([]);
        } finally {
            if (isMountedRef.current) setIsHistoryLoading(false);
        }
    }, []);

    // ─── Actions ──────────────────────────────────────────────────────────────
    const handleApproval = useCallback(async (requestType, target, decision, stepId, customInstructions = '', optionLabel = '') => {
        if (stepId) {
            setApprovals(prev => ({ ...prev, [stepId]: decision }));
        }
        setIsApprovaling(true);
        try {
            const res = await api.submitApproval(requestType, target, decision, stepId, customInstructions, optionLabel);
            const forwarded = res?.forwarded_to_ide;
            const customSent = res?.custom_response_dispatched;
            if (customSent) {
                toast.success(`'${decision}' and custom instructions sent to Antigravity IDE.`, 'Decision & Instructions Sent');
            } else if (forwarded) {
                toast.success(`'${decision}' forwarded to Antigravity IDE.`, 'Decision Sent');
            } else {
                toast.info(`Decision '${decision}' recorded.`, 'Approval Acknowledged');
            }
            setTimeout(() => {
                if (isMountedRef.current) {
                    setPendingApproval(null);
                    setIsApprovalMinimized(false);
                    fetchChatMessages();
                }
            }, 800);
        } catch (err) {
            console.error('Failed to submit approval:', err);
            toast.error(err.message || 'Failed to submit approval decision', 'Approval Error');
        } finally {
            if (isMountedRef.current) setIsApprovaling(false);
        }
    }, [fetchChatMessages]);

    const handleDismissApproval = useCallback(() => {
        if (pendingApproval) {
            dismissedApprovalStepRef.current = pendingApproval.step_id || pendingApproval.target;
        }
        setIsApprovalMinimized(true);
    }, [pendingApproval]);

    const handleReopenApproval = useCallback(() => {
        setIsApprovalMinimized(false);
    }, []);

    const handleDismissInteraction = useCallback(() => {
        setIsInteractionMinimized(true);
    }, []);

    const handleCancelInteraction = useCallback(async () => {
        if (!pendingInteraction) return;
        const id = pendingInteraction.interaction_id;
        setPendingInteraction(null);
        setIsInteractionMinimized(false);
        setSelectedOptions(new Set());
        setCustomResponse('');
        try {
            await api.dismissInteraction(id);
            toast.info('Interaction dismissed.', 'Question Dismissed');
        } catch (err) {
            console.warn('Failed to dismiss interaction on server:', err);
        }
    }, [pendingInteraction]);

    const handleReopenInteraction = useCallback(() => {
        setIsInteractionMinimized(false);
    }, []);

    const handleSendPrompt = useCallback(async (prompt, attachments = []) => {
        if (!prompt?.trim() && (!attachments || attachments.length === 0)) return;
        const msg = prompt ? prompt.trim() : '';
        const userTurn = {
            id: 'client-user-' + Date.now(),
            role: 'user',
            text: msg,
            attachments: attachments || [],
            timestamp: new Date().toISOString()
        };
        const agentTurn = {
            id: 'client-agent-' + Date.now(),
            role: 'agent',
            text: '',
            thinking: '',
            items: [],
            steps: [],
            is_working: true,
            timestamp: new Date().toISOString()
        };

        setChatMessages(prev => [...prev, userTurn, agentTurn]);
        setIsSendingPrompt(true);

        try {
            const res = await api.sendPrompt(msg, attachments);
            if (res && res.status !== 'submitted') {
                const failReason = res.reason || (res.dispatch_details && res.dispatch_details.error) || 'CDP offline';
                toast.warning(`Prompt not dispatched: ${failReason}`, 'Prompt Dispatch Notice');
                setChatMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'agent') {
                        last.is_working = false;
                        last.text = `Notice: Prompt could not be dispatched to Antigravity IDE (${failReason}). Verify that Antigravity is running with remote debugging port 9000.`;
                    }
                    return updated;
                });
            } else {
                toast.success('Prompt dispatched to Antigravity IDE workbench', 'Prompt Sent');
                setTimeout(fetchChatMessages, 450);
            }
        } catch (err) {
            toast.error(err.message || 'Failed to dispatch prompt', 'Prompt Submission Failed');
            setChatMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'agent') {
                    last.is_working = false;
                    last.text = `Notice: Prompt could not be dispatched (${err.message}). Verify network connection and remote debugging port 9000.`;
                }
                return updated;
            });
        } finally {
            if (isMountedRef.current) {
                setIsSendingPrompt(false);
            }
        }
    }, [fetchChatMessages]);

    const handleInteractionSubmit = useCallback(async () => {
        if (!pendingInteraction || isSubmitting) return;
        const customOk = Boolean(customResponse.trim());
        if (selectedOptions.size === 0 && !customOk) {
            toast.warning('Please select an option or type custom instructions.', 'Selection Required');
            return;
        }
        setIsSubmitting(true);
        try {
            await api.respondInteraction(
                pendingInteraction.interaction_id,
                selectedOptions,
                customOk ? customResponse.trim() : ''
            );
            setSubmitSuccess(true);
            toast.success('Response submitted to Antigravity session.', 'Decision Accepted');
            setTimeout(() => {
                if (isMountedRef.current) {
                    setPendingInteraction(null);
                    setIsInteractionMinimized(false);
                    setSelectedOptions(new Set());
                    setCustomResponse('');
                    setSubmitSuccess(false);
                    fetchChatMessages();
                }
            }, 800);
        } catch (e) {
            toast.error(e.message || 'Failed to submit response', 'Interaction Error');
        } finally {
            if (isMountedRef.current) {
                setIsSubmitting(false);
            }
        }
    }, [pendingInteraction, isSubmitting, selectedOptions, customResponse, fetchChatMessages]);

    const handleToggleOption = useCallback((id) => {
        const isMulti = pendingInteraction?.kind === 'multiple_choice';
        setSelectedOptions(prev => {
            const next = new Set(prev);
            if (isMulti) {
                if (next.has(id)) next.delete(id);
                else next.add(id);
            } else {
                if (next.has(id)) next.clear();
                else {
                    next.clear();
                    next.add(id);
                }
            }
            return next;
        });
    }, [pendingInteraction]);

    const handleSetModel = useCallback(async (model) => {
        try {
            await api.setModel(model);
            setAppState(prev => ({ ...prev, model }));
            toast.success(`Switched active plan model to ${model}`, 'Model Updated');
            await fetchAppState();
        } catch (err) {
            toast.error(err.message || 'Failed to switch model', 'Model Switch Failed');
        }
    }, [fetchAppState]);

    const handleSetMode = useCallback(async (mode) => {
        try {
            await api.setMode(mode);
            setAppState(prev => ({ ...prev, mode }));
            toast.success(`Switched execution mode to ${mode}`, 'Mode Updated');
            await fetchAppState();
        } catch (err) {
            toast.error(err.message || 'Failed to switch mode', 'Mode Switch Failed');
        }
    }, [fetchAppState]);

    const handleStopAgent = useCallback(async () => {
        setChatMessages(prev => {
            if (!prev.length) return prev;
            const updated = [...prev];
            const last = { ...updated[updated.length - 1] };
            if (last.role === 'agent') {
                last.is_working = false;
                updated[updated.length - 1] = last;
            }
            return updated;
        });
        try {
            await api.stopAgent();
            toast.info('Emergency stop signal sent to Antigravity session.', 'Agent Stopped');
            setTimeout(fetchChatMessages, 400);
        } catch (err) {
            toast.error(err.message || 'Failed to stop agent', 'Stop Request Failed');
        }
    }, [fetchChatMessages]);

    // ─── Screen Viewport Polling (Only when Screen view is open) ──────────────
    useEffect(() => {
        if (!isScreenActive) return;
        fetchSnapshot();
        const timer = setInterval(fetchSnapshot, 2500);
        return () => clearInterval(timer);
    }, [isScreenActive, fetchSnapshot]);

    // ─── Lifecycle & WebSocket Streaming ──────────────────────────────────────
    useEffect(() => {
        isMountedRef.current = true;

        fetchAppState();
        fetchInteractions();
        fetchPendingApprovals();
        fetchChatMessages();

        const client = new WebSocketClient({
            onOpen: () => {
                wsConnectedRef.current = true;
            },
            onClose: () => {
                wsConnectedRef.current = false;
            },
            onMessage: (data) => {
                if (!isMountedRef.current) return;
                if (data.type === 'init' || data.type === 'chat_update') {
                    if (Array.isArray(data.messages)) {
                        setChatMessages(prev => mergeTurnsPreservingHistory(prev, data.messages));
                        if (oldestTurnIndexRef.current === null && typeof data.oldest_index === 'number') {
                            oldestTurnIndexRef.current = data.oldest_index;
                            setHasMoreHistory(Boolean(data.has_more));
                        }
                    }
                }
                if (data.type === 'interaction_prompt' && data.interaction) {
                    setPendingInteraction(prev => {
                        if (prev && prev.interaction_id === data.interaction.interaction_id) {
                            return prev;
                        }
                        setSelectedOptions(new Set());
                        setCustomResponse('');
                        setIsInteractionMinimized(false);
                        return data.interaction;
                    });
                }
                if (data.type === 'interaction_resolved') {
                    setPendingInteraction(prev => (prev?.interaction_id === data.interaction_id ? null : prev));
                    setIsInteractionMinimized(false);
                }
                if (data.type === 'approval_resolved') {
                    if (data.data?.step_id) {
                        setApprovals(prev => ({ ...prev, [data.data.step_id]: data.data.decision }));
                    }
                    setPendingApproval(null);
                    setIsApprovalMinimized(false);
                }
                if (data.type === 'pending_approval' && data.approval) {
                    setPendingApproval(prev => {
                        const incomingKey = data.approval.step_id || data.approval.target;
                        const prevKey = prev ? (prev.step_id || prev.target) : null;
                        if (prev && prevKey === incomingKey) {
                            return prev;
                        }
                        setIsApprovalMinimized(false);
                        return data.approval;
                    });
                }
                if (data.type === 'approval_dismissed') {
                    setPendingApproval(null);
                    setIsApprovalMinimized(false);
                }
            }
        });
        client.connect();
        wsClientRef.current = client;

        // Low-frequency adaptive polling: slower when WebSocket is connected, paused when tab is hidden
        const appStateTimer = setInterval(fetchAppState, 10000);
        const interactionsTimer = setInterval(() => {
            if (!wsConnectedRef.current) {
                fetchInteractions();
                fetchPendingApprovals();
                fetchChatMessages();
            } else {
                fetchPendingApprovals();
            }
        }, 6000);

        const handleVisibilityChange = () => {
            if (!document.hidden && isMountedRef.current) {
                fetchAppState();
                fetchInteractions();
                fetchPendingApprovals();
                fetchChatMessages();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isMountedRef.current = false;
            clearInterval(appStateTimer);
            clearInterval(interactionsTimer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            client.disconnect();
        };
    }, [fetchAppState, fetchInteractions, fetchPendingApprovals, fetchChatMessages]);

    return {
        appState,
        snapshotData,
        chatMessages,
        hasMoreHistory,
        isLoadingOlder,
        loadOlderMessages,
        pendingInteraction,
        isInteractionMinimized,
        selectedOptions,
        customResponse,
        isSubmitting,
        submitSuccess,
        isSendingPrompt,
        timelineEvents,
        isTimelineLoading,
        systemLogs,
        isLogsLoading,
        recoveryItems,
        isRecoveryLoading,
        diagnostics,
        historyChats,
        isHistoryLoading,
        approvals,
        pendingApproval,
        isApprovalMinimized,
        isApprovaling,
        setCustomResponse,
        setSelectedOptions,
        handleApproval,
        handleDismissApproval,
        handleReopenApproval,
        handleDismissInteraction,
        handleCancelInteraction,
        handleReopenInteraction,
        handleSendPrompt,
        handleInteractionSubmit,
        handleToggleOption,
        handleSetModel,
        handleSetMode,
        handleStopAgent,
        fetchSnapshot,
        fetchTimelineEvents,
        fetchSystemLogs,
        fetchRecoveryItems,
        fetchHistoryChats
    };
}
