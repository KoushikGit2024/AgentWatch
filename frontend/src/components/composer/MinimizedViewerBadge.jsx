import React from 'react';
import { Icon } from '../../constants/icons';
import { FileIcon } from '../../constants/fileIcons';

export function MinimizedViewerBadge({ status }) {
  if (!status?.isMinimized || !status?.hasTabs) return null;

  return (
    <div className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-md bg-[#7C9FC5]/15 border border-[#7C9FC5]/40 text-[#7C9FC5] hover:bg-[#7C9FC5]/25 transition-all shadow-xs animate-in fade-in duration-150">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('agentwatch:file-viewer-restore'))}
        title={`Restore File Viewer: ${status.activeTab?.filename || 'File'}`}
        className="aw-focus-ring flex items-center gap-1.5 cursor-pointer max-w-[120px] xs:max-w-[160px]"
      >
        <div className="w-3.5 h-3.5 shrink-0 text-[#7C9FC5]">
          <FileIcon path={status.activeTab?.path || ''} className="w-3.5 h-3.5" />
        </div>
        <span className="text-[11px] font-mono font-medium text-[#E8EAED] truncate">
          {status.activeTab?.filename || 'File Viewer'}
        </span>
        <span className="text-[9px] px-1 rounded bg-[#7C9FC5]/20 text-[#7C9FC5] font-mono shrink-0">
          {status.tabsCount}
        </span>
      </button>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('agentwatch:file-viewer-restore'))}
        title="Expand Window"
        className="p-0.5 rounded hover:bg-[#7C9FC5]/30 text-[#A0A6AF] hover:text-[#E8EAED] transition cursor-pointer"
      >
        <div className="w-3.5 h-3.5">{Icon.maximize}</div>
      </button>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('agentwatch:file-viewer-close'))}
        title="Close File Viewer"
        className="p-0.5 rounded hover:bg-rose-500/30 text-[#A0A6AF] hover:text-rose-300 transition cursor-pointer"
      >
        <div className="w-3.5 h-3.5">{Icon.x}</div>
      </button>
    </div>
  );
}
