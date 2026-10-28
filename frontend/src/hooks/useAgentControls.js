import { useCallback } from 'react';
import { api } from '../services/api';
import { toast } from '../services/toastService';

export function useAgentControls({ setAppState, setChatMessages, fetchAppState, fetchChatMessages, isMountedRef }) {
  const handleSetModel = useCallback(
    async model => {
      try {
        await api.setModel(model);
        setAppState(prev => ({ ...prev, model }));
        toast.success(`Switched active plan model to ${model}`, 'Model Updated');
        await fetchAppState();
      } catch (err) {
        toast.error(err.message || 'Failed to switch model', 'Model Switch Failed');
      }
    },
    [fetchAppState, setAppState]
  );

  const handleSetMode = useCallback(
    async mode => {
      try {
        await api.setMode(mode);
        setAppState(prev => ({ ...prev, mode }));
        toast.success(`Switched execution mode to ${mode}`, 'Mode Updated');
        await fetchAppState();
      } catch (err) {
        toast.error(err.message || 'Failed to switch mode', 'Mode Switch Failed');
      }
    },
    [fetchAppState, setAppState]
  );

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
  }, [fetchChatMessages, setChatMessages]);

  return {
    handleSetModel,
    handleSetMode,
    handleStopAgent,
  };
}

