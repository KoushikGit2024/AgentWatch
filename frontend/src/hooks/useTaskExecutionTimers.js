import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to track elapsed execution time for active terminal tasks.
 * Zero-load guarantee: runs purely in browser JS without sending HTTP requests to the server.
 */
export function useTaskExecutionTimers(tasks = []) {
  const [timers, setTimers] = useState({}); // { [taskId]: elapsedSeconds }
  const startTimesRef = useRef({}); // { [taskId]: timestampMs }
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // Track task starts without restarting the interval
  useEffect(() => {
    const now = Date.now();
    tasks.forEach((task, idx) => {
      const id = task.tooltip_id || task.id || `task-${idx}`;
      if (task.is_running !== false) {
        // Prefer exact process start timestamp from backend if available
        const taskStartedMs = task.started_at ? new Date(task.started_at).getTime() : null;
        if (taskStartedMs && !isNaN(taskStartedMs)) {
          startTimesRef.current[id] = taskStartedMs;
        } else if (!startTimesRef.current[id]) {
          startTimesRef.current[id] = now;
        }
      }
    });
  }, [tasks]);

  // Single persistent interval ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const current = Date.now();
      const currentTasks = tasksRef.current || [];
      if (!currentTasks.length) return;

      setTimers(prev => {
        let changed = false;
        const updated = { ...prev };
        currentTasks.forEach((task, idx) => {
          const id = task.tooltip_id || task.id || `task-${idx}`;
          if (task.is_running !== false && startTimesRef.current[id]) {
            const nextSec = Math.floor((current - startTimesRef.current[id]) / 1000);
            if (updated[id] !== nextSec) {
              updated[id] = nextSec;
              changed = true;
            }
          }
        });
        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = seconds => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return null;
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (d > 0) {
      return `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
    }
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}s`;
  };

  return {
    timers,
    formatDuration,
  };
}
