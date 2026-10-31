import React from 'react';
import { Icon } from '../../constants/icons';
import { FileIcon } from '../../constants/fileIcons';

export function FileViewerTabBar({
  tabs,
  activeTabPath,
  setActiveTabPath,
  handleCloseTab,
  onToggleTreeDrawer,
  canTogglePreview,
  viewMode,
  activePath,
  setTabDataMap,
  copiedPath,
  copiedContent,
  fileData,
  handleCopyPath,
  handleCopyCode,
  setIsMinimized,
  isMaximized,
  setIsMaximized,
  handleCloseAll,
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#30343A] bg-[#121316] px-1 select-none overflow-hidden shrink-0">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
        {onToggleTreeDrawer && (
          <button
            type="button"
            onClick={onToggleTreeDrawer}
            title="Toggle Project File Tree"
            className="aw-focus-ring flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] border border-transparent hover:border-[#30343A] transition cursor-pointer shrink-0 mr-1"
          >
            <div className="w-3.5 h-3.5 text-amber-400">{Icon.folder}</div>
            <span className="hidden sm:inline">Files</span>
          </button>
        )}

        {tabs.map(tab => {
          const isActive = tab.path === activeTabPath;
          return (
            <div
              key={tab.path}
              onClick={() => setActiveTabPath(tab.path)}
              title={tab.path}
              className={`aw-focus-ring group flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs font-mono font-medium transition cursor-pointer shrink-0 max-w-[210px] border-t border-l border-r ${
                isActive
                  ? 'bg-[#17191C] text-[#E8EAED] border-[#30343A] shadow-xs'
                  : 'bg-[#15171A] text-[#747C87] hover:text-[#A0A6AF] hover:bg-[#1A1C20] border-transparent'
              }`}
            >
              <FileIcon path={tab.path} className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.filename}</span>
              {tab.hasHighlight && (
                <span className="text-[9px] px-1 rounded bg-[#7C9FC5]/20 text-[#7C9FC5] shrink-0 tabular-nums">
                  {tab.startLine === tab.endLine
                    ? `L${tab.startLine}`
                    : `L${tab.startLine}-${tab.endLine}`}
                </span>
              )}
              <button
                type="button"
                onClick={e => handleCloseTab(e, tab.path)}
                title="Close Tab"
                className="w-4 h-4 rounded hover:bg-[#30343A] flex items-center justify-center text-[#747C87] hover:text-[#E8EAED] transition shrink-0 ml-0.5 cursor-pointer"
              >
                <div className="w-3 h-3">{Icon.x}</div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Window Controls */}
      <div className="flex items-center gap-1 shrink-0 px-2">
        {canTogglePreview && (
          <div className="flex items-center rounded bg-[#101113] border border-[#30343A] p-0.5 text-xs mr-1">
            <button
              type="button"
              onClick={() =>
                setTabDataMap(prev => ({
                  ...prev,
                  [activePath]: { ...prev[activePath], viewMode: 'preview' },
                }))
              }
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                viewMode === 'preview'
                  ? 'bg-[#1D2024] text-[#E8EAED] border border-[#30343A]'
                  : 'text-[#A0A6AF] hover:text-[#E8EAED]'
              }`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() =>
                setTabDataMap(prev => ({
                  ...prev,
                  [activePath]: { ...prev[activePath], viewMode: 'code' },
                }))
              }
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                viewMode === 'code'
                  ? 'bg-[#1D2024] text-[#E8EAED] border border-[#30343A]'
                  : 'text-[#A0A6AF] hover:text-[#E8EAED]'
              }`}
            >
              Source
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleCopyPath}
          title="Copy file path"
          className="p-1 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer"
        >
          <span className="text-[11px] font-mono flex items-center gap-1">
            <div className="w-3.5 h-3.5 text-[#79B89A]">
              {copiedPath ? Icon.check : Icon.copy}
            </div>
            <span className="hidden sm:inline">Path</span>
          </span>
        </button>

        <button
          type="button"
          onClick={handleCopyCode}
          disabled={!fileData?.content}
          title="Copy file content"
          className="p-1 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer disabled:opacity-40"
        >
          <span className="text-[11px] font-mono flex items-center gap-1">
            <div className="w-3.5 h-3.5">{copiedContent ? Icon.check : Icon.copy}</div>
            <span className="hidden sm:inline">{copiedContent ? 'Copied' : 'Copy'}</span>
          </span>
        </button>

        {/* Window Controls: Minimize */}
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          title="Minimize to Floating Dock"
          className="p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer ml-1"
        >
          <div className="w-3.5 h-3.5">{Icon.minimize}</div>
        </button>

        {/* Window Controls: Maximize / Restore */}
        <button
          type="button"
          onClick={() => setIsMaximized(prev => !prev)}
          title={isMaximized ? 'Restore down' : 'Maximize window'}
          className="p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer"
        >
          <div className="w-3.5 h-3.5">{isMaximized ? Icon.restore : Icon.maximize}</div>
        </button>

        {/* Close All */}
        <button
          type="button"
          onClick={handleCloseAll}
          aria-label="Close inspector"
          title="Close Inspector (Esc)"
          className="p-1.5 rounded text-[#A0A6AF] hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer ml-0.5"
        >
          <div className="w-4 h-4">{Icon.x}</div>
        </button>
      </div>
    </div>
  );
}
