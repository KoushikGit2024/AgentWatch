import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { toast } from '../../services/toastService';

export function useWorkbenchTasks(activeConversationId, activeAttachedTab, setActiveAttachedTab) {
  const [artifactsList, setArtifactsList] = useState([]);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [ideTerminalTasks, setIdeTerminalTasks] = useState([]);
  const [isLoadingTerminal, setIsLoadingTerminal] = useState(false);

  // Background slow poll (every 15s) for task status indicator dot
  useEffect(() => {
    let isMounted = true;
    const fetchTasks = async () => {
      try {
        const res = await api.getTerminalTasks();
        if (isMounted && res?.tasks) {
          setIdeTerminalTasks(res.tasks);
        }
      } catch {}
    };
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fast polling (every 2.5s) while terminal tab is actively opened
  useEffect(() => {
    if (activeAttachedTab !== 'terminal') return;
    let isMounted = true;
    const fastPoll = async () => {
      try {
        const res = await api.getTerminalTasks();
        if (isMounted && res?.tasks) {
          setIdeTerminalTasks(res.tasks);
        }
      } catch {}
    };
    const interval = setInterval(fastPoll, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
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
      const res = await api.getTerminalTasks();
      if (res?.tasks) setIdeTerminalTasks(res.tasks);
    } catch (err) {
      console.error('Terminal refresh error:', err);
    } finally {
      setIsLoadingTerminal(false);
    }
  }, []);

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
          const tasksRes = await api.getTerminalTasks();
          if (tasksRes?.tasks && tasksRes.tasks.length > 0) {
            setIdeTerminalTasks(tasksRes.tasks);
          } else {
            const toggleRes = await api.toggleTerminal();
            if (toggleRes?.tasks && Array.isArray(toggleRes.tasks)) {
              setIdeTerminalTasks(toggleRes.tasks);
            }
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

  const handleKillIdeTerminalTask = useCallback(async (taskIndex, tooltipId) => {
    try {
      await api.killTerminalTask(taskIndex, tooltipId);
      toast.success('Command terminated in IDE', 'Terminal');
      setIdeTerminalTasks(prev => prev.filter((_, idx) => idx !== taskIndex));
      setTimeout(async () => {
        try {
          const refreshed = await api.getTerminalTasks();
          if (refreshed?.tasks) setIdeTerminalTasks(refreshed.tasks);
        } catch {}
      }, 300);
    } catch (err) {
      toast.error(err.message || 'Could not terminate command in IDE', 'Terminal');
    }
  }, []);

  return {
    artifactsList,
    isLoadingArtifacts,
    ideTerminalTasks,
    isLoadingTerminal,
    handleToggleAttachedTab,
    handleRefreshTerminalTasks,
    handleKillIdeTerminalTask,
  };
}
