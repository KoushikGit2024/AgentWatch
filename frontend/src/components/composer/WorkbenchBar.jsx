import React from 'react';
import { Icon } from '../../constants/icons';
import { FileIcon } from '../../constants/fileIcons';

export default function WorkbenchBar({
  activeAttachedTab,
  onToggleAttachedTab,
  onCloseTab,
  onOpenReviewChanges,
  onOpenFile,
  recoveryCount = 0,
  isLoadingTerminal,
  ideTerminalTasks = [],
  onKillTerminalTask,
  onInspectTask,
  taskTimers = {},
  formatDuration,
  onRefreshTerminal,
  isLoadingArtifacts,
  artifactsList = [],
  onOpenTerminalPanel,
}) {
  return (
    <div className="relative z-20 flex min-h-[2rem] justify-between items-center px-2 py-1 border border-[#30343A] bg-[#17191C] rounded-md select-none">
      <div className="flex min-w-0 gap-x-1.5 overflow-hidden items-center">
        <button
          type="button"
          data-tooltip-id="tooltip-changesOverview"
          onClick={onOpenReviewChanges}
          title="Changes Overview"
          className="aw-focus-ring group rounded p-1.5 hover:bg-[#1D2024] text-[#A0A6AF] hover:text-[#E8EAED] transition cursor-pointer"
        >
          <div className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform">
            {Icon.fileEdit}
          </div>
        </button>

        <button
          type="button"
          data-tooltip-id="tooltip-terminal"
          onClick={() => onToggleAttachedTab('terminal')}
          title="AI Running Commands & Tasks"
          className={`aw-focus-ring group relative rounded p-1.5 transition cursor-pointer ${
            activeAttachedTab === 'terminal'
              ? 'bg-[#1D2024] text-[#E8EAED] border border-emerald-500/40'
              : 'hover:bg-[#1D2024] text-[#A0A6AF] hover:text-[#E8EAED]'
          }`}
        >
          {ideTerminalTasks &&
            ideTerminalTasks.length > 0 &&
            ideTerminalTasks.some(t => t.is_running !== false) && (
              <span className="absolute top-1 right-1 z-20 rounded-full bg-emerald-400 h-1.5 w-1.5 ring-2 ring-[#17191C] animate-pulse" />
            )}
          <div className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform">
            {Icon.terminal}
          </div>
        </button>

        {onOpenTerminalPanel && (
          <button
            type="button"
            onClick={onOpenTerminalPanel}
            title="Interactive Terminal Console (Ctrl+`)"
            className="aw-focus-ring group relative rounded p-1.5 hover:bg-[#1D2024] text-[#A0A6AF] hover:text-[#E8EAED] transition cursor-pointer"
          >
            <div className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform">
              {Icon.code}
            </div>
          </button>
        )}

        <button
          type="button"
          data-tooltip-id="tooltip-artifacts"
          onClick={() => onToggleAttachedTab('artifacts')}
          title="Workspace Artifacts"
          className={`aw-focus-ring group relative rounded p-1.5 transition cursor-pointer ${
            activeAttachedTab === 'artifacts'
              ? 'bg-[#1D2024] text-[#E8EAED] border border-amber-500/40'
              : 'hover:bg-[#1D2024] text-[#A0A6AF] hover:text-[#E8EAED]'
          }`}
        >
          {recoveryCount > 0 && (
            <span className="absolute top-1 right-1 z-20 rounded-full bg-amber-400 h-1.5 w-1.5 ring-2 ring-[#17191C]" />
          )}
          <div className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform">
            {Icon.file}
          </div>
        </button>
      </div>

      <div className="flex flex-none items-center gap-1">
        <button
          type="button"
          onClick={onOpenReviewChanges}
          className="aw-focus-ring group flex cursor-pointer items-center border border-[#30343A] hover:border-blue-500/40 justify-center gap-1.5 rounded bg-[#1D2024] hover:bg-[#23272D] px-2.5 py-1 text-xs font-medium text-[#E8EAED] transition"
        >
          <div className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform">
            {Icon.code}
          </div>
          <span>Review Changes</span>
        </button>
      </div>

      {activeAttachedTab && (
        <div className="absolute bottom-full left-0 right-0 mb-1.5 z-30 overflow-hidden rounded-lg border border-[#30343A] bg-[#17191C] shadow-xl">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#262A30] bg-[#1D2024] text-xs">
            <div className="flex items-center gap-2 font-medium text-[#E8EAED]">
              {activeAttachedTab === 'terminal' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#7C9FC5]" />
                  <span>Active Terminal & Executing Commands</span>
                </>
              ) : (
                <>
                  <div className="w-3.5 h-3.5 text-[#7C9FC5]">{Icon.file}</div>
                  <span>Generated Artifacts & Media</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {activeAttachedTab === 'terminal' && onRefreshTerminal && (
                <button
                  type="button"
                  onClick={onRefreshTerminal}
                  aria-label="Refresh terminal processes"
                  title="Refresh terminal processes"
                  disabled={isLoadingTerminal}
                  className="p-1 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer disabled:opacity-40"
                >
                  <div className={`w-3.5 h-3.5 ${isLoadingTerminal ? 'animate-spin text-[#7C9FC5]' : ''}`}>
                    {Icon.refreshCw}
                  </div>
                </button>
              )}
              <button
                type="button"
                onClick={onCloseTab}
                aria-label="Close popover"
                className="p-1 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer"
              >
                <div className="w-3.5 h-3.5">{Icon.x}</div>
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-2">
            {activeAttachedTab === 'terminal' ? (
              isLoadingTerminal ? (
                <div className="flex items-center justify-center py-5 text-xs text-[#A0A6AF] gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-[#7C9FC5] border-t-transparent animate-spin" />
                  <span>Syncing terminal from IDE...</span>
                </div>
              ) : ideTerminalTasks.length > 0 ? (
                <div className="flex flex-col divide-y divide-[#262A30]">
                  {ideTerminalTasks.map((task, idx) => {
                    const taskId = task.tooltip_id || task.id || `task-${idx}`;
                    const durationStr = formatDuration ? formatDuration(taskTimers[taskId]) : null;

                    return (
                      <div
                        key={taskId}
                        className="flex flex-row items-center justify-between gap-x-2 p-2 hover:bg-[#1D2024] transition rounded group"
                      >
                        <div
                          onClick={() => onInspectTask && onInspectTask(task)}
                          title="Click to view task log output"
                          className="flex min-w-0 flex-1 items-center gap-x-2 cursor-pointer"
                        >
                          {task.is_running !== false ? (
                            <span className="w-3 h-3 shrink-0 rounded-full border-2 border-[#7C9FC5] border-t-transparent animate-spin inline-block" />
                          ) : (
                            <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-[#79B89A] inline-block" />
                          )}
                          <span className="truncate font-mono text-xs text-[#E8EAED] group-hover:text-sky-300 transition-colors">
                            {task.command || 'terminal command'}
                          </span>
                          {durationStr && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#141619] text-[#7C9FC5] border border-[#30343A] shrink-0 tabular-nums">
                              {durationStr}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onInspectTask && onInspectTask(task)}
                            title="Inspect Task Output"
                            className="p-1 rounded text-[#747C87] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer"
                          >
                            <div className="w-3.5 h-3.5">{Icon.terminal}</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => onKillTerminalTask(task.index ?? idx, task.tooltip_id)}
                            title="Terminate Command in IDE"
                            className="p-1 rounded text-[#A0A6AF] hover:bg-[#D77E83]/15 hover:text-[#D77E83] transition cursor-pointer"
                          >
                            <div className="w-3.5 h-3.5">{Icon.x}</div>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-5 text-[#747C87] text-xs">
                  No active or running terminal commands in IDE.
                </div>
              )
            ) : isLoadingArtifacts ? (
              <div className="flex items-center justify-center py-5 text-xs text-[#A0A6AF] gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[#7C9FC5] border-t-transparent animate-spin" />
                <span>Loading workspace artifacts...</span>
              </div>
            ) : artifactsList.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
                {artifactsList.map(art => (
                  <button
                    key={art.id || art.path}
                    type="button"
                    onClick={() => {
                      if (onOpenFile) {
                        onOpenFile(art.path);
                        onCloseTab();
                      } else {
                        window.open(art.path, '_blank');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-[#E8EAED] py-1.5 px-2.5 bg-[#1D2024] hover:bg-[#23272D] border border-[#30343A] cursor-pointer transition text-left"
                  >
                    <FileIcon path={art.filename || art.path} className="w-3.5 h-3.5 shrink-0" />
                    <span className="break-all leading-tight">{art.title || art.filename}</span>
                    {art.type && art.type !== 'markdown' && (
                      <span className="ml-1 text-[9px] uppercase px-1 py-0.5 rounded bg-[#101113] text-[#A0A6AF] font-mono">
                        {art.type}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 text-[#747C87] text-xs">
                No artifacts found in the active workspace.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
