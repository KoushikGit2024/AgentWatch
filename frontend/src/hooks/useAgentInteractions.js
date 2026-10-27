import { useState, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { toast } from '../services/toastService';

export function useAgentInteractions({ fetchChatMessages, isMountedRef }) {
  const [pendingInteraction, setPendingInteraction] = useState(null);
  const [isInteractionMinimized, setIsInteractionMinimized] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState(new Set());
  const [customResponse, setCustomResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [approvals, setApprovals] = useState({});
  const [pendingApproval, setPendingApproval] = useState(null);
  const [isApprovalMinimized, setIsApprovalMinimized] = useState(false);
  const [isApprovaling, setIsApprovaling] = useState(false);

  const dismissedApprovalStepRef = useRef(null);

  const handleToggleOption = useCallback(
    (id, questionContext = null) => {
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
          const isMulti =
            pendingInteraction?.kind === 'multiple_choice' ||
            Boolean(pendingInteraction?.is_multi_select);
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
        }
        return next;
      });
    },
    [pendingInteraction]
  );

  const handleApproval = useCallback(
    async (
      requestType,
      target,
      decision,
      stepId,
      customInstructions = null,
      optionLabel = null
    ) => {
      setIsApprovaling(true);
      try {
        const res = await api.submitApproval(
          requestType,
          target,
          decision,
          stepId,
          customInstructions,
          optionLabel
        );
        const forwarded = res?.forwarded_to_ide;
        const customSent = res?.custom_response_dispatched;
        const receiptConfirmed = res?.forward_details?.receipt_confirmed ?? forwarded;

        if (stepId) {
          setApprovals(prev => ({ ...prev, [stepId]: decision }));
        }

        if (customSent) {
          toast.success(
            `'${decision}' and custom instructions dispatched with receipt.`,
            'Receipt Confirmed'
          );
        } else if (receiptConfirmed) {
          toast.success(
            `'${decision}' accepted by Antigravity IDE (receipt confirmed).`,
            'Receipt Confirmed'
          );
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
    },
    [fetchChatMessages, isMountedRef]
  );

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
  }, [pendingInteraction, isSubmitting, selectedOptions, customResponse, fetchChatMessages, isMountedRef]);

  return {
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
  };
}
