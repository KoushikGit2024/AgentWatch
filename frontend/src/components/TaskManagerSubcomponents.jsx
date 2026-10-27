import React from 'react';
import { Icon } from '../constants/icons';

export function ProcessRow({
  proc,
  idx,
  terminatingPid,
  onEndTask,
}) {
  const isAntigravity = proc.name.toLowerCase().includes('antigravity');
  const isChrome = proc.name.toLowerCase().includes('chrome');
  const isTerminating =
    terminatingPid &&
    (proc.pids?.includes(terminatingPid) || proc.pid === terminatingPid);

  return (
    <div
      className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center text-xs transition hover:bg-zinc-800/40 ${
        isAntigravity ? 'bg-blue-950/15' : ''
      }`}
    >
      {/* Name and Group Count */}
      <div className="col-span-5 flex items-center gap-2 min-w-0">
        <span className="w-5 text-[10px] font-mono text-zinc-500 shrink-0">
          #{idx + 1}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className={`font-medium truncate ${
                isAntigravity
                  ? 'text-blue-300'
                  : isChrome
                    ? 'text-zinc-100'
                    : 'text-zinc-200'
              }`}
            >
              {proc.name}
            </span>
            {proc.count > 1 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 shrink-0">
                ({proc.count})
              </span>
            )}
          </div>
          {proc.pid && (
            <span className="text-[10px] font-mono text-zinc-500">PID: {proc.pid}</span>
          )}
          {proc.is_self && (
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950/70 text-cyan-400 border border-cyan-800/40 ml-1">
              AgentWatch
            </span>
          )}
        </div>
      </div>

      {/* CPU Column */}
      <div className="col-span-2 text-right">
        <span
          className={`font-mono text-xs ${
            proc.cpu_percent > 15
              ? 'text-amber-400 font-semibold'
              : proc.cpu_percent > 0
                ? 'text-zinc-200'
                : 'text-zinc-500'
          }`}
        >
          {proc.cpu_percent}%
        </span>
      </div>

      {/* Memory Column */}
      <div className="col-span-3 text-right">
        <div className="font-mono text-xs text-zinc-200 font-medium">
          {proc.memory_mb >= 1024
            ? `${(proc.memory_mb / 1024).toFixed(2)} GB`
            : `${proc.memory_mb.toLocaleString()} MB`}
        </div>
        <div className="text-[10px] font-mono text-zinc-500">
          {proc.memory_percent}%
        </div>
      </div>

      {/* End Task Button */}
      <div className="col-span-2 flex items-center justify-end">
        {proc.is_protected ? (
          <span
            className="text-[10px] text-zinc-600 font-mono select-none"
            title="Protected system or server process"
          >
            Locked
          </span>
        ) : (
          <button
            type="button"
            disabled={Boolean(terminatingPid)}
            onClick={() => onEndTask(proc)}
            title={`End Task for ${proc.name}`}
            className="aw-focus-ring inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-rose-950/30 text-rose-300 border border-rose-800/40 hover:bg-rose-900/40 hover:border-rose-700/60 transition disabled:opacity-40 cursor-pointer"
          >
            {isTerminating ? (
              <span className="w-3 h-3 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
            ) : (
              <div className="w-3 h-3 text-rose-400">{Icon.stop}</div>
            )}
            <span className="hidden sm:inline">End</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function SystemSummaryGauges({ summary }) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 gap-3 p-4 bg-zinc-950/40 border-b border-zinc-800/80">
      {/* CPU Card */}
      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5 font-medium">
            <div className="w-3.5 h-3.5 text-indigo-400">{Icon.cpu}</div>
            CPU Usage
          </span>
          <span className="font-mono text-zinc-200 font-semibold">
            {summary.total_cpu_percent}%
          </span>
        </div>
        <div className="mt-2.5 w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(summary.total_cpu_percent, 100)}%` }}
          />
        </div>
      </div>

      {/* RAM Card */}
      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5 font-medium">
            <div className="w-3.5 h-3.5 text-blue-400">{Icon.activity}</div>
            Memory (RAM)
          </span>
          <span className="font-mono text-zinc-200 font-semibold">
            {summary.memory_percent}%
          </span>
        </div>
        <div className="mt-2.5 w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              summary.memory_percent > 85
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-blue-500 to-cyan-400'
            }`}
            style={{ width: `${Math.min(summary.memory_percent, 100)}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>{(summary.used_memory_mb / 1024).toFixed(1)} GB used</span>
          <span>{(summary.total_memory_mb / 1024).toFixed(1)} GB total</span>
        </div>
      </div>
    </div>
  );
}
