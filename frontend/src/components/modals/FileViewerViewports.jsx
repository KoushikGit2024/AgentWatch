import React from 'react';
import { Icon } from '../../constants/icons';

export function FileViewerErrorViewport({ error, activePath, onRetry }) {
  const isLarge =
    error.toLowerCase().includes('large') ||
    error.toLowerCase().includes('size') ||
    error.toLowerCase().includes('exceed');

  return (
    <div className="p-6 text-center flex-1 flex flex-col items-center justify-center max-w-md mx-auto select-text">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-sm">
        <div className="w-6 h-6">{Icon.alertCircle}</div>
      </div>
      <h3 className="text-sm font-semibold text-[#E8EAED] tracking-tight mb-1">
        {isLarge ? 'File Too Large to Preview' : 'Unable to Display File'}
      </h3>
      <p className="text-xs text-[#A0A6AF] leading-relaxed mb-3">{error}</p>
      <div className="px-3 py-1.5 rounded-md bg-[#17191C] border border-[#262A30] font-mono text-[11px] text-[#747C87] break-all max-w-full mb-4">
        {activePath}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 rounded-md bg-[#1D2024] hover:bg-[#23272D] border border-[#30343A] hover:border-[#7C9FC5]/40 text-xs font-medium text-[#E8EAED] transition cursor-pointer"
        >
          Retry Loading
        </button>
        <a
          href={`/api/v1/files/raw?path=${encodeURIComponent(activePath)}`}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="px-3 py-1.5 rounded-md bg-[#7C9FC5]/20 hover:bg-[#7C9FC5]/30 border border-[#7C9FC5]/40 text-xs font-medium text-[#7C9FC5] transition cursor-pointer flex items-center gap-1.5"
        >
          <div className="w-3.5 h-3.5">{Icon.externalLink}</div>
          <span>Download Raw</span>
        </a>
      </div>
    </div>
  );
}

export function FileViewerFooterBar({ activeTab, fileData, activePath, language, tabsCount }) {
  return (
    <div className="px-3 sm:px-4 py-1.5 bg-[#1D2024] border-t border-[#30343A] text-[11px] font-mono text-[#A0A6AF] flex items-center justify-between gap-2 select-none shrink-0">
      <span className="truncate tabular-nums">
        {activeTab?.hasHighlight
          ? `Lines ${activeTab.startLine}–${activeTab.endLine} (${activeTab.endLine - activeTab.startLine + 1} lines)`
          : `${(language || 'PLAIN').toUpperCase()} · ${fileData?.total_lines || 0} lines`}
      </span>
      <span className="text-[10px] text-[#747C87] hidden sm:inline">
        {tabsCount} open tab{tabsCount > 1 ? 's' : ''} · Press Ctrl+W to close tab
      </span>
    </div>
  );
}
