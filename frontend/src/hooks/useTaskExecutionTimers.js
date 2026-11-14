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
        if (!startTimesRef.current[id]) {
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
        const updated = { ...prev };
        currentTasks.forEach((task, idx) => {
          const id = task.tooltip_id || task.id || `task-${idx}`;
          if (task.is_running !== false && startTimesRef.current[id]) {
            updated[id] = Math.floor((current - startTimesRef.current[id]) / 1000);
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = seconds => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}s`;
  };

  return {
    timers,
    formatDuration,
  };
}
