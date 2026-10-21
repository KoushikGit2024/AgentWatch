import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { WebSocketClient } from '../services/websocket';
import { toast } from '../services/toastService';

export function useAgentWatch() {
    // Core Server & Stream State
    const [appState, setAppState] = useState({
        status: 'Connecting…',
        connected: false,
        mode: null,
        model: null,
        available_models: [],
        available_modes: []
    });
    const [snapshotData, setSnapshotData] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [pendingInteraction, setPendingInteraction] = useState(null);
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
    const [isApprovaling, setIsApprovaling] = useState(false);

    // References
    const isMountedRef = useRef(true);
    const snapshotSeqRef = useRef(0);
    const wsClientRef = useRef(null);

    // ─── Fetchers ─────────────────────────────────────────────────────────────
    const fetchAppState = useCallback(async () => {
        try {
            const data = await api.getAppState();
            if (isMountedRef.current) {
                setAppState(data);
            }
        } catch {}
    }, []);

    const fetchSnapshot = useCallback(async () => {
        const seq = ++snapshotSeqRef.current;
        try {
            const data = await api.getSnapshot();
            if (isMountedRef.current && seq === snapshotSeqRef.current) {
                setSnapshotData(data);
            }
        } catch {}
    }, []);

    const fetchInteractions = useCallback(async () => {
        try {
            const data = await api.getPendingInteractions();
            if (isMountedRef.current) {
                const item = data.interaction || (data.interactions && data.interactions[0]) || null;
                setPendingInteraction(item);
            }
        } catch {}
    }, []);

    const fetchChatMessages = useCallback(async () => {
        try {
            const data = await api.getChatMessages(50);
            if (isMountedRef.current) {
                setChatMessages(data.messages || []);
            }
        } catch {}
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
                setRecoveryItems(recData.recovery_items || []);
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
    const handleApproval = useCallback(async (requestType, target, decision, stepId) => {
        setApprovals(prev => ({ ...prev, [stepId]: decision }));
        setIsApprovaling(true);
        try {
            const res = await api.submitApproval(requestType, target, decision, stepId);
            const forwarded = res?.forwarded_to_ide;
            const requiresNative = res?.requires_native_ide;
            if (forwarded) {
                toast.success(`'${decision}' forwarded to Antigravity IDE.`, 'Decision Sent');
            } else if (requiresNative) {
                toast.warning('Please confirm this action in the Antigravity desktop app.', 'Native IDE Required');
            } else {
                toast.info(`Decision '${decision}' recorded.`, 'Approval Acknowledged');
            }
            // Auto-dismiss approval modal after a short delay so user sees the result
            setTimeout(() => {
                if (isMountedRef.current) setPendingApproval(null);
            }, 1400);
        } catch (err) {
            console.error('Failed to submit approval:', err);
            toast.error(err.message || 'Failed to submit approval decision', 'Approval Error');
        } finally {
            if (isMountedRef.current) setIsApprovaling(false);
        }
    }, []);

    const handleDismissApproval = useCallback(() => {
        setPendingApproval(null);
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
                console.warn('Antigravity prompt dispatch unacknowledged:', failReason);
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
                setTimeout(fetchSnapshot, 400);
                setTimeout(fetchChatMessages, 500);
                setTimeout(fetchTimelineEvents, 600);
            }
        } catch (err) {
            console.error('Failed to send prompt:', err);
            toast.error(err.message || 'Failed to dispatch prompt', 'Prompt Submission Failed');
            // Revert is_working on error
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
    }, [fetchSnapshot, fetchChatMessages, fetchTimelineEvents]);

    const handleInteractionSubmit = useCallback(async () => {
        if (!pendingInteraction || isSubmitting) return;
        const customOk = Boolean(customResponse.trim());
        if (selectedOptions.size === 0 && !customOk) {
            toast.warning('Please select an option or provide custom instructions.', 'Selection Required');
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
                setPendingInteraction(null);
                setSubmitSuccess(false);
                fetchSnapshot();
                fetchTimelineEvents();
            }, 1000);
        } catch (e) {
            toast.error(e.message || 'Failed to submit response', 'Interaction Error');
        } finally {
            setIsSubmitting(false);
        }
    }, [pendingInteraction, isSubmitting, selectedOptions, customResponse, fetchSnapshot, fetchTimelineEvents]);

    const handleToggleOption = useCallback((id) => {
        const isMulti = pendingInteraction?.kind === 'multiple_choice';
        setSelectedOptions(prev => {
            const next = new Set(prev);
            if (isMulti) {
                if (next.has(id)) next.delete(id);
                else next.add(id);
            } else {
                next.clear();
                next.add(id);
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

    const handleStopAgent = useCallback(async () => {
        // Optimistic UI update: immediately mark last agent turn as not working
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
            setTimeout(fetchTimelineEvents, 500);
        } catch (err) {
            console.error('Failed to stop agent:', err);
            toast.error(err.message || 'Failed to stop agent', 'Stop Request Failed');
        }
    }, [fetchChatMessages, fetchTimelineEvents]);

    // ─── Lifecycle & Streaming ────────────────────────────────────────────────
    useEffect(() => {
        isMountedRef.current = true;

        // Initial loads
        fetchAppState();
        fetchSnapshot();
        fetchInteractions();
        fetchChatMessages();
        fetchTimelineEvents();
        fetchRecoveryItems();

        // WebSocket Streaming
        const client = new WebSocketClient({
            onMessage: (data) => {
                if (!isMountedRef.current) return;
                if (data.type === 'init' || data.type === 'chat_update') {
                    if (Array.isArray(data.messages)) {
                        setChatMessages(data.messages);
                    }
                }
                if (data.type === 'interaction_prompt') {
                    setPendingInteraction(data.interaction || null);
                    // Reset selected options when a new interaction arrives
                    setSelectedOptions(new Set());
                    setCustomResponse('');
                }
                if (data.type === 'interaction_resolved') {
                    setPendingInteraction(prev => (prev?.interaction_id === data.interaction_id ? null : prev));
                }
                if (data.type === 'approval_resolved' && data.data?.step_id) {
                    setApprovals(prev => ({ ...prev, [data.data.step_id]: data.data.decision }));
                }
                // New: push-based approval modal trigger
                if (data.type === 'pending_approval' && data.approval) {
                    setPendingApproval(data.approval);
                }
                if (data.type === 'approval_dismissed') {
                    setPendingApproval(null);
                }
            }
        });
        client.connect();
        wsClientRef.current = client;

        // Low-frequency polling for background state
        const appStateTimer = setInterval(fetchAppState, 4000);
        const snapshotTimer = setInterval(fetchSnapshot, 3000);
        const interactionsTimer = setInterval(fetchInteractions, 2500);

        return () => {
            isMountedRef.current = false;
            clearInterval(appStateTimer);
            clearInterval(snapshotTimer);
            clearInterval(interactionsTimer);
            client.disconnect();
        };
    }, [fetchAppState, fetchSnapshot, fetchInteractions, fetchChatMessages, fetchTimelineEvents, fetchRecoveryItems]);

    return {
        appState,
        snapshotData,
        chatMessages,
        pendingInteraction,
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
        isApprovaling,
        setCustomResponse,
        handleApproval,
        handleDismissApproval,
        handleSendPrompt,
        handleInteractionSubmit,
        handleToggleOption,
        handleSetModel,
        handleStopAgent,
        fetchSnapshot,
        fetchTimelineEvents,
        fetchSystemLogs,
        fetchRecoveryItems,
        fetchHistoryChats
    };
}
