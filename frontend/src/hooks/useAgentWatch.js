import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { toast } from '../services/toastService';
import { useAgentAuxData } from './useAgentAuxData';
import { useAgentSocket } from './useAgentSocket';
import { useAgentInteractions } from './useAgentInteractions';
import { useAgentControls } from './useAgentControls';
import { mergeTurnsPreservingHistory } from '../utils/turnMerger';

const PAGE_BLOCK_SIZE = 15;

export function useAgentWatch({ isScreenActive = false } = {}) {
  const [appState, setAppState] = useState({
    status: 'Connecting...',
    connected: false,
    mode: 'Fast',
    model: null,
    available_models: [],
    available_modes: ['Fast', 'Planning'],
  });
  const [snapshotData, setSnapshotData] = useState(null);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(true);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const [isSendingPrompt, setIsSendingPrompt] = useState(false);

  const isMountedRef = useRef(true);
  const snapshotSeqRef = useRef(0);
  const lastSnapshotHashRef = useRef(null);
  const oldestTurnIndexRef = useRef(null);
  const isLoadingOlderRef = useRef(false);
  const activeConvIdRef = useRef(null);

  const fetchChatMessages = useCallback(async (reset = false) => {
    try {
      const currentCid = activeConvIdRef.current;
      const data = await api.getChatMessages(PAGE_BLOCK_SIZE, null, currentCid);
      if (isMountedRef.current) {
        const incoming = data.messages || [];
        if (reset) {
          setChatMessages(incoming);
          oldestTurnIndexRef.current = typeof data.oldest_index === 'number' ? data.oldest_index : null;
          setHasMoreHistory(Boolean(data.has_more));
        } else {
          setChatMessages(prev => mergeTurnsPreservingHistory(prev, incoming));
          if (oldestTurnIndexRef.current === null && typeof data.oldest_index === 'number') {
            oldestTurnIndexRef.current = data.oldest_index;
            setHasMoreHistory(Boolean(data.has_more));
          }
        }
        setIsChatLoading(false);
      }
    } catch {
      if (isMountedRef.current) {
        setIsChatLoading(false);
      }
    }
  }, []);

  const interactionOps = useAgentInteractions({ fetchChatMessages, isMountedRef });
  const {
    pendingInteraction,
    setPendingInteraction,
    isInteractionMinimized,
    setIsInteractionMinimized,
    selectedOptions,
    setSelectedOptions,
    customResponse,
    setCustomResponse,
    isSubmitting,
    submitSuccess,
    approvals,
    setApprovals,
    pendingApproval,
    setPendingApproval,
    isApprovalMinimized,
    setIsApprovalMinimized,
    isApprovaling,
    dismissedApprovalStepRef,
    handleToggleOption,
    handleApproval,
    handleDismissApproval,
    handleReopenApproval,
    handleDismissInteraction,
    handleReopenInteraction,
    handleCancelInteraction,
    handleInteractionSubmit,
  } = interactionOps;


  const auxData = useAgentAuxData(isMountedRef);

  const fetchAppState = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const data = await api.getAppState();
      if (isMountedRef.current) {
        setAppState({
          ...data,
          connected: Boolean(data.connected ?? data.antigravity_connected),
        });
        const incomingCid = data.active_conversation_id;
        if (incomingCid && activeConvIdRef.current && activeConvIdRef.current !== incomingCid) {
          setIsChatLoading(true);
          activeConvIdRef.current = incomingCid;
          oldestTurnIndexRef.current = null;
          fetchChatMessages(true);
        } else if (incomingCid && !activeConvIdRef.current) {
          activeConvIdRef.current = incomingCid;
        }
      }
    } catch {}
  }, []);

  const fetchSnapshot = useCallback(async (force = false) => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const seq = ++snapshotSeqRef.current;
    if (force || !lastSnapshotHashRef.current) {
      setIsSnapshotLoading(true);
    }
    try {
      const hashToPass = force ? null : lastSnapshotHashRef.current;
      const data = await api.getSnapshot(hashToPass);
      if (isMountedRef.current && seq === snapshotSeqRef.current) {
        if (data.status === 'unchanged') {
          setIsSnapshotLoading(false);
          return;
        }
        if (data.hash) lastSnapshotHashRef.current = data.hash;
        setSnapshotData(data);
        setIsSnapshotLoading(false);
      }
    } catch {
      if (isMountedRef.current && seq === snapshotSeqRef.current) {
        setIsSnapshotLoading(false);
      }
    }
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
          if (prev && prev.interaction_id === item.interaction_id) return prev;
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
          const prevKey = prev ? prev.step_id || prev.target : null;
          if (prev && prevKey === incomingKey) return prev;
          if (dismissedApprovalStepRef.current !== incomingKey) {
            setIsApprovalMinimized(false);
          }
          return incoming;
        });
      }
    } catch {}
  }, []);


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
      const currentCid = activeConvIdRef.current;
      const data = await api.getChatMessages(PAGE_BLOCK_SIZE, cursor, currentCid);
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
      if (isMountedRef.current) setIsLoadingOlder(false);
    }
    return false;
  }, []);



  const handleSendPrompt = useCallback(
    async (prompt, attachments = []) => {
      if (!prompt?.trim() && (!attachments || attachments.length === 0)) return;
      const msg = prompt ? prompt.trim() : '';
      const userTurn = {
        id: 'client-user-' + Date.now(),
        role: 'user',
        text: msg,
        attachments: attachments || [],
        timestamp: new Date().toISOString(),
      };
      const agentTurn = {
        id: 'client-agent-' + Date.now(),
        role: 'agent',
        text: '',
        thinking: '',
        items: [],
        steps: [],
        is_working: true,
        timestamp: new Date().toISOString(),
      };

      setChatMessages(prev => [...prev, userTurn, agentTurn]);
      setIsSendingPrompt(true);

      try {
        const res = await api.sendPrompt(msg, attachments);
        if (res && res.status !== 'submitted') {
          const failReason =
            res.reason || (res.dispatch_details && res.dispatch_details.error) || 'CDP offline';
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
        if (isMountedRef.current) setIsSendingPrompt(false);
      }
    },
    [fetchChatMessages]
  );



  const { handleSetModel, handleSetMode, handleStopAgent } = useAgentControls({
    setAppState,
    setChatMessages,
    fetchAppState,
    fetchChatMessages,
    isMountedRef,
  });

  useEffect(() => {
    if (!isScreenActive) return;
    let isActive = true;
    let timeoutId = null;

    const pollLoop = async (force = false) => {
      if (!isActive) return;
      try {
        await fetchSnapshot(force);
      } finally {
        if (isActive) {
          timeoutId = setTimeout(() => pollLoop(false), 1400);
        }
      }
    };

    pollLoop(true);

    return () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isScreenActive, fetchSnapshot]);

  useAgentSocket({
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
  });

  return {
    appState,
    snapshotData,
    isSnapshotLoading,
    chatMessages,
    isChatLoading,
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
    ...auxData,
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
    handleRespondDirectQuestion,
    handleToggleOption,
    handleSetModel,
    handleSetMode,
    handleStopAgent,
    fetchSnapshot,
  };
}
