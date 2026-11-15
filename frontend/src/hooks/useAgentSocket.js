import { useEffect, useRef } from 'react';
import { WebSocketClient } from '../services/websocket';

export function useAgentSocket({
  isMountedRef,
  oldestTurnIndexRef,
  activeConvIdRef,
  setIsChatLoading,
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
  fetchChatMessages,
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
        const wasDisconnected = !wsConnectedRef.current;
        wsConnectedRef.current = true;
        if (wasDisconnected) {
          fetchAppState();
          fetchInteractions();
          fetchPendingApprovals();
          fetchChatMessages();
        }
      },
      onClose: () => {
        wsConnectedRef.current = false;
      },
      onMessage: data => {
        if (!isMountedRef.current) return;
        if (data.type === 'init' || data.type === 'chat_update') {
          if (Array.isArray(data.messages)) {
            const incomingCid = data.conversation_id;
            const isChatSwitched = Boolean(
              incomingCid && activeConvIdRef?.current && activeConvIdRef.current !== incomingCid
            );

            if (isChatSwitched) {
              if (setIsChatLoading) setIsChatLoading(true);
              if (activeConvIdRef) activeConvIdRef.current = incomingCid;
              setChatMessages(data.messages);
              oldestTurnIndexRef.current =
                typeof data.oldest_index === 'number' ? data.oldest_index : null;
              setHasMoreHistory(Boolean(data.has_more));
              if (setIsChatLoading) setTimeout(() => setIsChatLoading(false), 200);
            } else {
              if (incomingCid && activeConvIdRef && !activeConvIdRef.current) {
                activeConvIdRef.current = incomingCid;
              }
              setChatMessages(prev => mergeTurnsPreservingHistory(prev, data.messages));
              if (oldestTurnIndexRef.current === null && typeof data.oldest_index === 'number') {
                oldestTurnIndexRef.current = data.oldest_index;
                setHasMoreHistory(Boolean(data.has_more));
              }
              if (setIsChatLoading) setIsChatLoading(false);
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
          setPendingInteraction(prev =>
            prev?.interaction_id === data.interaction_id ? null : prev
          );
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
            const prevKey = prev ? prev.step_id || prev.target : null;
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
        if (data.type === 'queue_update') {
          window.dispatchEvent(new CustomEvent('agentwatch:queue-updated', { detail: data.messages }));
        }
      },
    });
    client.connect();
    wsClientRef.current = client;

    let appStateTimeoutId = null;
    let interactionsTimeoutId = null;

    const scheduleAppStatePoll = () => {
      const delay = wsConnectedRef.current ? 25000 : 8000;
      appStateTimeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          if ((typeof navigator === 'undefined' || navigator.onLine) && (typeof document === 'undefined' || !document.hidden)) {
            fetchAppState();
          }
          scheduleAppStatePoll();
        }
      }, delay);
    };

    const scheduleInteractionsPoll = () => {
      // While WebSocket is connected, poll only as a slow safety net (20s).
      // When WebSocket is down, poll frequently (1.5s) to recover immediately.
      const delay = wsConnectedRef.current ? 20000 : 1500;
      interactionsTimeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          if ((typeof navigator === 'undefined' || navigator.onLine) && (typeof document === 'undefined' || !document.hidden)) {
            fetchInteractions();
            fetchPendingApprovals();
            if (!wsConnectedRef.current) {
              fetchChatMessages();
            }
          }
          scheduleInteractionsPoll();
        }
      }, delay);
    };

    scheduleAppStatePoll();
    scheduleInteractionsPoll();

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
      if (appStateTimeoutId) clearTimeout(appStateTimeoutId);
      if (interactionsTimeoutId) clearTimeout(interactionsTimeoutId);
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
    fetchChatMessages,
  ]);
}
