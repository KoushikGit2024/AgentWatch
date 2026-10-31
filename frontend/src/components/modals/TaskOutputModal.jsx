import React, { useState, useEffect } from 'react';
import { Icon } from '../../constants/icons';
import { api } from '../../services/api';
import { toast } from '../../services/toastService';

export default function TaskOutputModal({ task, isOpen, onClose }) {
  const [logData, setLogData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !task) {
      setLogData(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const taskId = task.tooltip_id || task.id || `task-${task.index ?? 0}`;

    api
      .getTaskLog(taskId)
      .then(res => {
        if (isMounted) {
          setLogData(res);
        }
      })
      .catch(err => {
        if (isMounted) {
          setLogData({
            task_id: taskId,
            content: `No active log output file found yet for ${task.command || taskId}.\nStatus: ${task.is_running !== false ? 'Running' : 'Completed'}.\n\nOutput will appear once stdout is written by the IDE command process.`,
          });
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, task]);

  if (!isOpen || !task) return null;

  const handleCopy = async () => {
    if (!logData?.content) return;
    try {
      await navigator.clipboard.writeText(logData.content);
      setCopied(true);
      toast.success('Task output copied to clipboard');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy output');
    }
  };

  const commandTitle = task.command || task.tooltip_id || 'Terminal Command';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Terminal Task Output"
      className="fixed inset-0 z-[95] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl h-[85vh] sm:h-[80vh] bg-[#17191C] border border-[#30343A] rounded-xl shadow-2xl flex flex-col overflow-hidden select-text animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#30343A] bg-[#121316] px-3 py-2.5 shrink-0 select-none">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <div className="w-4 h-4 text-emerald-400 shrink-0">{Icon.terminal}</div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs font-semibold text-[#E8EAED] truncate max-w-[280px] sm:max-w-[450px]">
                {commandTitle}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 flex items-center gap-1 ${
                  task.is_running !== false
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : 'bg-[#1D2024] border border-[#30343A] text-[#A0A6AF]'
                }`}
              >
                {task.is_running !== false && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
                <span>{task.is_running !== false ? 'Running' : 'Done'}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!logData?.content}
              title="Copy Output"
              className="p-1 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer disabled:opacity-40"
            >
              <div className="w-3.5 h-3.5">{copied ? Icon.check : Icon.copy}</div>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="p-1 rounded text-[#A0A6AF] hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
            >
              <div className="w-4 h-4">{Icon.x}</div>
            </button>
          </div>
        </div>

        {/* Console Viewport */}
        <div className="flex-1 min-h-0 bg-[#0F1012] p-3 sm:p-4 overflow-auto font-mono text-xs text-[#E8EAED] leading-relaxed">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#A0A6AF] space-y-2">
              <span className="w-5 h-5 rounded-full border-2 border-[#7C9FC5] border-t-transparent animate-spin" />
              <span className="text-xs">Loading task output...</span>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-all select-text font-mono text-[11px] sm:text-xs text-[#D1D5DB]">
              {logData?.content || 'No output stream recorded for this process.'}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-4 py-1.5 bg-[#141619] border-t border-[#262A30] text-[11px] font-mono text-[#747C87] flex items-center justify-between shrink-0 select-none">
          <span>{logData?.filename ? `Log: ${logData.filename}` : 'Task stdout/stderr'}</span>
          <span>{logData?.total_bytes ? `${logData.total_bytes.toLocaleString()} bytes` : '0 bytes'}</span>
        </div>
      </div>
    </div>
  );
}

