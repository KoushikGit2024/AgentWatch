import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { toast } from '../services/toastService';

/**
 * Custom hook to monitor and control queued messages
 * (both native IDE workbench queued items and offline/local buffer).
 */
export function useQueuedMessages(isWorking = false) {
  const [queuedMessages, setQueuedMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);
  const pollIntervalRef = useRef(null);

  const fetchQueuedMessages = useCallback(async () => {
    try {
      const res = await api.getQueuedMessages();
      if (res && res.messages) {
        setQueuedMessages(res.messages);
      }
    } catch (err) {
      console.debug('Failed to fetch queued messages:', err.message);
    }
  }, []);

  // Poll frequently (every 2.5s) while the agent is actively working or when messages are queued
  useEffect(() => {
    fetchQueuedMessages();
    const intervalTime = isWorking || queuedMessages.length > 0 ? 2500 : 7000;
    pollIntervalRef.current = setInterval(fetchQueuedMessages, intervalTime);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isWorking, queuedMessages.length, fetchQueuedMessages]);

  const handleSendNow = useCallback(
    async item => {
      setIsActionPending(true);
      try {
        await api.executeQueuedAction(item.id, 'send_now');
        toast.success('Queued prompt dispatched immediately', 'Dispatched');
        await fetchQueuedMessages();
      } catch (err) {
        toast.error(err.message || 'Failed to dispatch queued prompt', 'Send Now Error');
      } finally {
        setIsActionPending(false);
      }
    },
    [fetchQueuedMessages]
  );

  const handleDelete = useCallback(async item => {
    setIsActionPending(true);
    try {
      await api.executeQueuedAction(item.id, 'delete');
      toast.info('Queued message removed', 'Queue Updated');
      setQueuedMessages(prev => prev.filter(m => m.id !== item.id));
    } catch (err) {
      toast.error(err.message || 'Failed to remove queued message', 'Delete Error');
    } finally {
      setIsActionPending(false);
    }
  }, []);

  const handleEdit = useCallback(async (item, newText) => {
    if (!newText || !newText.trim()) return;
    setIsActionPending(true);
    try {
      await api.executeQueuedAction(item.id, 'edit', newText.trim());
      toast.success('Queued message updated', 'Queue Updated');
      setQueuedMessages(prev =>
        prev.map(m => (m.id === item.id ? { ...m, text: newText.trim() } : m))
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update queued message', 'Edit Error');
    } finally {
      setIsActionPending(false);
    }
  }, []);

  const handleQueueMessage = useCallback(
    async (text, attachments = []) => {
      try {
        const res = await api.queueMessage(text, attachments);
        toast.success('Message queued for dispatch after agent finishes', 'Message Queued');
        await fetchQueuedMessages();
        return res;
      } catch (err) {
        toast.error(err.message || 'Failed to queue message', 'Queue Error');
        throw err;
      }
    },
    [fetchQueuedMessages]
  );

  return {
    queuedMessages,
    isLoading,
    isActionPending,
    fetchQueuedMessages,
    handleSendNow,
    handleDelete,
    handleEdit,
    handleQueueMessage,
  };
}
