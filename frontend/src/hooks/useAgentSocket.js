import { useEffect, useRef } from 'react';
import { WebSocketClient } from '../services/websocket';

export function useAgentSocket({
    isMountedRef,
    oldestTurnIndexRef,
    mergeTurnsPreservingHistory,
    setChatMessages,
    setHasMoreHistory,
    setPendingInteraction,
    setSelectedOptions,
    setCustomResponse,
    setIsInteractionMinimized,
    setApprovals,
    setPendingApproval,
    setIsApprovalMinimized,
    fetchAppState,
    fetchInteractions,
    fetchPendingApprovals,
    fetchChatMessages
}) {
    const wsClientRef = useRef(null);
    const wsConnectedRef = useRef(false);

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

        const appStateTimer = setInterval(() => {
            if (typeof navigator !== 'undefined' && !navigator.onLine) return;
            if (typeof document !== 'undefined' && document.hidden) return;
            fetchAppState();
        }, 8000);

        const interactionsTimer = setInterval(() => {
            if (typeof navigator !== 'undefined' && !navigator.onLine) return;
            if (typeof document !== 'undefined' && document.hidden) return;
            fetchInteractions();
            fetchPendingApprovals();
            if (!wsConnectedRef.current) {
                fetchChatMessages();
            }
        }, wsConnectedRef.current ? 3500 : 1500);

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
    }, [
        isMountedRef,
        oldestTurnIndexRef,
        mergeTurnsPreservingHistory,
        setChatMessages,
        setHasMoreHistory,
        setPendingInteraction,
        setSelectedOptions,
        setCustomResponse,
        setIsInteractionMinimized,
        setApprovals,
        setPendingApproval,
        setIsApprovalMinimized,
        fetchAppState,
        fetchInteractions,
        fetchPendingApprovals,
        fetchChatMessages
    ]);
}
