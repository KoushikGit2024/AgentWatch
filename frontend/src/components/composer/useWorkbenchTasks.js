import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { toast } from '../../services/toastService';

export function useWorkbenchTasks(activeConversationId, activeAttachedTab, setActiveAttachedTab) {
  const [artifactsList, setArtifactsList] = useState([]);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [ideTerminalTasks, setIdeTerminalTasks] = useState([]);
  const [isLoadingTerminal, setIsLoadingTerminal] = useState(false);

  // Background slow poll (every 20s while tab is visible) for task status indicator dot
  useEffect(() => {
    let timeoutId = null;
    let isMounted = true;

    const schedulePoll = () => {
      if (!isMounted) return;
      if (document.hidden) {
        timeoutId = setTimeout(schedulePoll, 30000);
        return;
      }
      timeoutId = setTimeout(async () => {
        if (!isMounted) return;
        if (!document.hidden) {
          try {
            const res = await api.getTerminalTasks(activeConversationId);
            if (isMounted && res?.tasks) {
              setIdeTerminalTasks(res.tasks);
            }
          } catch {}
        }
        schedulePoll();
      }, 20000);
    };

    const initialFetch = async () => {
      try {
        const res = await api.getTerminalTasks(activeConversationId);
        if (isMounted && res?.tasks) {
          setIdeTerminalTasks(res.tasks);
        }
      } catch {}
    };
    initialFetch();
    schedulePoll();

    const onVisibilityChange = () => {
      if (!document.hidden && isMounted) {
        if (timeoutId) clearTimeout(timeoutId);
        initialFetch();
        schedulePoll();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Fast polling (every 3s) only while terminal tab is actively opened and visible
  useEffect(() => {
    if (activeAttachedTab !== 'terminal') return;
    let timeoutId = null;
    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;
      if (!document.hidden) {
        try {
          const res = await api.getTerminalTasks(activeConversationId);
          if (isMounted && res?.tasks) {
            setIdeTerminalTasks(res.tasks);
          }
        } catch {}
      }
      const delay = document.hidden ? 15000 : 3000;
      timeoutId = setTimeout(poll, delay);
    };

    poll();

    const onVisibility = () => {
      if (!document.hidden && isMounted) {
        if (timeoutId) clearTimeout(timeoutId);
        poll();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeAttachedTab]);

  // Reload artifacts when active conversation switches while artifacts tab is open
  useEffect(() => {
    if (activeAttachedTab === 'artifacts') {
      let isMounted = true;
      setIsLoadingArtifacts(true);
      api
        .getArtifacts(activeConversationId)
        .then(res => {
          if (isMounted) setArtifactsList(res?.artifacts || []);
        })
        .catch(err => {
          if (isMounted) toast.error(err.message || 'Could not load artifacts', 'Artifacts');
        })
        .finally(() => {
          if (isMounted) setIsLoadingArtifacts(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [activeConversationId, activeAttachedTab]);

  const handleRefreshTerminalTasks = useCallback(async () => {
    setIsLoadingTerminal(true);
    try {
      const res = await api.getTerminalTasks(activeConversationId);
      if (res?.tasks) setIdeTerminalTasks(res.tasks);
    } catch (err) {
      console.error('Terminal refresh error:', err);
    } finally {
      setIsLoadingTerminal(false);
    }
  }, [activeConversationId]);

  const handleToggleAttachedTab = useCallback(
    async tabName => {
      if (activeAttachedTab === tabName) {
        setActiveAttachedTab(null);
        return;
      }
      setActiveAttachedTab(tabName);
      if (tabName === 'artifacts') {
        setIsLoadingArtifacts(true);
        try {
          const res = await api.getArtifacts(activeConversationId);
          setArtifactsList(res?.artifacts || []);
        } catch (err) {
          toast.error(err.message || 'Could not load artifacts', 'Artifacts');
        } finally {
          setIsLoadingArtifacts(false);
        }
      } else if (tabName === 'terminal') {
        setIsLoadingTerminal(true);
        try {
          const tasksRes = await api.getTerminalTasks(activeConversationId);
          if (tasksRes?.tasks) {
            setIdeTerminalTasks(tasksRes.tasks);
          }
        } catch (err) {
          console.error('Terminal sync error:', err);
        } finally {
          setIsLoadingTerminal(false);
        }
      }
    },
    [activeAttachedTab, activeConversationId, setActiveAttachedTab]
  );

  return {
    artifactsList,
    isLoadingArtifacts,
    ideTerminalTasks,
    isLoadingTerminal,
    handleToggleAttachedTab,
    handleRefreshTerminalTasks,
    handleKillTask: async task => {
      if (!task?.pid) {
        toast.error('Task PID not found', 'Kill Process');
        return;
      }
      try {
        await api.killTerminalTask(task.pid);
        toast.info(`Terminated process ${task.pid}`, 'Task Stopped');
        // Refresh active tasks list immediately
        const res = await api.getTerminalTasks(activeConversationId);
        if (res?.tasks) setIdeTerminalTasks(res.tasks);
      } catch (err) {
        toast.error(err.message || 'Failed to terminate process', 'Kill Error');
      }
    },
  };
}
