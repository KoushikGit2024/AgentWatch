import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { toast } from '../services/toastService';
import { useAgentAuxData } from './useAgentAuxData';
import { useAgentSocket } from './useAgentSocket';

const PAGE_BLOCK_SIZE = 15;

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
    const [appState, setAppState] = useState({
        status: 'Connecting...',
        connected: false,
        mode: 'Fast',
        model: null,
        available_models: [],
        available_modes: ['Fast', 'Planning']
    });
    const [snapshotData, setSnapshotData] = useState(null);
    const [isSnapshotLoading, setIsSnapshotLoading] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [isChatLoading, setIsChatLoading] = useState(true);
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);

    const [pendingInteraction, setPendingInteraction] = useState(null);
    const [isInteractionMinimized, setIsInteractionMinimized] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState(new Set());
    const [customResponse, setCustomResponse] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [isSendingPrompt, setIsSendingPrompt] = useState(false);

    const [approvals, setApprovals] = useState({});
    const [pendingApproval, setPendingApproval] = useState(null);
    const [isApprovalMinimized, setIsApprovalMinimized] = useState(false);
    const [isApprovaling, setIsApprovaling] = useState(false);

    const isMountedRef = useRef(true);
    const snapshotSeqRef = useRef(0);
    const lastSnapshotHashRef = useRef(null);
    const dismissedApprovalStepRef = useRef(null);
    const oldestTurnIndexRef = useRef(null);
    const isLoadingOlderRef = useRef(false);

    const auxData = useAgentAuxData(isMountedRef);

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
                    const prevKey = prev ? (prev.step_id || prev.target) : null;
                    if (prev && prevKey === incomingKey) return prev;
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
                setIsChatLoading(false);
            }
        } catch {
            if (isMountedRef.current) {
                setIsChatLoading(false);
            }
        }
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
            if (isMountedRef.current) setIsLoadingOlder(false);
        }
        return false;
    }, []);

    const handleApproval = useCallback(async (requestType, target, decision, stepId, customInstructions = '', optionLabel = '') => {
        setIsApprovaling(true);
        try {
            const res = await api.submitApproval(requestType, target, decision, stepId, customInstructions, optionLabel);
            const forwarded = res?.forwarded_to_ide;
            const customSent = res?.custom_response_dispatched;
            const receiptConfirmed = res?.forward_details?.receipt_confirmed ?? forwarded;

            if (stepId) {
                setApprovals(prev => ({ ...prev, [stepId]: decision }));
            }

            if (customSent) {
                toast.success(`'${decision}' and custom instructions dispatched with receipt.`, 'Receipt Confirmed');
            } else if (receiptConfirmed) {
                toast.success(`'${decision}' accepted by Antigravity IDE (receipt confirmed).`, 'Receipt Confirmed');
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
            }, 600);

            return res;
        } catch (err) {
            toast.error(err.message || 'Failed to submit approval decision', 'Approval Error');
            throw err;
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

    const handleReopenApproval = useCallback(() => setIsApprovalMinimized(false), []);
    const handleDismissInteraction = useCallback(() => setIsInteractionMinimized(true), []);
    const handleReopenInteraction = useCallback(() => setIsInteractionMinimized(false), []);

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
            if (isMountedRef.current) setIsSendingPrompt(false);
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
            if (isMountedRef.current) setIsSubmitting(false);
        }
    }, [pendingInteraction, isSubmitting, selectedOptions, customResponse, fetchChatMessages]);

    const handleToggleOption = useCallback((id, questionContext = null) => {
        setSelectedOptions(prev => {
            const next = new Set(prev);
            if (questionContext) {
                const siblingIds = new Set((questionContext.options || []).map(o => o.id));
                if (next.has(id)) {
                    next.delete(id);
                } else {
                    if (!questionContext.is_multi_select) {
                        for (const sid of siblingIds) next.delete(sid);
                    }
                    next.add(id);
                }
            } else {
                const isMulti = pendingInteraction?.kind === 'multiple_choice' || Boolean(pendingInteraction?.is_multi_select);
                if (isMulti) {
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                } else {
                    if (next.has(id)) next.clear();
                    else { next.clear(); next.add(id); }
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

    useEffect(() => {
        if (!isScreenActive) return;
        // Immediate force refresh without stale hash comparison so screen appears instantly on tab switch
        fetchSnapshot(true);
        const timer = setInterval(() => fetchSnapshot(false), 1300);
        return () => clearInterval(timer);
    }, [isScreenActive, fetchSnapshot]);

    useAgentSocket({
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
        handleToggleOption,
        handleSetModel,
        handleSetMode,
        handleStopAgent,
        fetchSnapshot
    };
}
