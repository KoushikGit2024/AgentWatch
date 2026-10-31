import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to track elapsed execution time for active terminal tasks.
 * Zero-load guarantee: runs purely in browser JS without sending HTTP requests to the server.
 */
export function useTaskExecutionTimers(tasks = []) {
  const [timers, setTimers] = useState({}); // { [taskId]: elapsedSeconds }
  const startTimesRef = useRef({}); // { [taskId]: timestampMs }

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

    const interval = setInterval(() => {
      const current = Date.now();
      const updated = {};
      tasks.forEach((task, idx) => {
        const id = task.tooltip_id || task.id || `task-${idx}`;
        if (task.is_running !== false && startTimesRef.current[id]) {
          const seconds = Math.floor((current - startTimesRef.current[id]) / 1000);
          updated[id] = seconds;
        } else if (timers[id] !== undefined) {
          // Freeze final duration when completed
          updated[id] = timers[id];
        }
      });
      setTimers(prev => ({ ...prev, ...updated }));
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks]);

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

