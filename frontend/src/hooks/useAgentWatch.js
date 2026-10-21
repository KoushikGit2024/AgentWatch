import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { WebSocketClient } from '../services/websocket';

export function useAgentWatch() {
    // Core Server & Stream State
    const [appState, setAppState] = useState({
        status: 'Connecting…',
        connected: false,
        mode: 'Fast',
        model: 'Gemini 3.8 Flash (Medium)'
    });
    const [snapshotData, setSnapshotData] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [pendingInteraction, setPendingInteraction] = useState(null);
    const [selectedOptions, setSelectedOptions] = useState(new Set());
    const [customResponse, setCustomResponse] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

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
                setPendingInteraction(data.interaction || null);
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
        try {
            await api.submitApproval(requestType, target, decision, stepId);
        } catch (err) {
            console.error('Failed to submit approval:', err);
        }
    }, []);

    const handleSendPrompt = useCallback(async (prompt) => {
        if (!prompt?.trim()) return;
        const msg = prompt.trim();
        const userTurn = {
            id: 'client-user-' + Date.now(),
            role: 'user',
            text: msg,
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

        try {
            await api.sendPrompt(msg);
            setTimeout(fetchSnapshot, 400);
            setTimeout(fetchChatMessages, 500);
            setTimeout(fetchTimelineEvents, 600);
        } catch (err) {
            console.error('Failed to send prompt:', err);
        }
    }, [fetchSnapshot, fetchChatMessages, fetchTimelineEvents]);

    const handleInteractionSubmit = useCallback(async () => {
        if (!pendingInteraction || isSubmitting) return;
        const customOk = Boolean(customResponse.trim());
        if (selectedOptions.size === 0 && !customOk) {
            alert('Please select an option or provide custom instructions.');
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
            setTimeout(() => {
                setPendingInteraction(null);
                setSubmitSuccess(false);
                fetchSnapshot();
                fetchTimelineEvents();
            }, 1000);
        } catch (e) {
            alert(`Error: ${e.message}`);
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

    const handleSetMode = useCallback(async (mode) => {
        try {
            await api.setMode(mode);
            setAppState(prev => ({ ...prev, mode }));
        } catch {}
    }, []);

    const handleSetModel = useCallback(async (model) => {
        try {
            await api.setModel(model);
            setAppState(prev => ({ ...prev, model }));
        } catch {}
    }, []);

    const handleStopAgent = useCallback(async () => {
        try {
            await api.stopAgent();
            setTimeout(fetchTimelineEvents, 500);
        } catch {}
    }, [fetchTimelineEvents]);

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
        setCustomResponse,
        handleApproval,
        handleSendPrompt,
        handleInteractionSubmit,
        handleToggleOption,
        handleSetMode,
        handleSetModel,
        handleStopAgent,
        fetchSnapshot,
        fetchTimelineEvents,
        fetchSystemLogs,
        fetchRecoveryItems,
        fetchHistoryChats
    };
}
