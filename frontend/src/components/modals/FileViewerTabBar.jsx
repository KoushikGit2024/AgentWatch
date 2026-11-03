import React from 'react';
import { Icon } from '../../constants/icons';
import { FileIcon } from '../../constants/fileIcons';

export function FileViewerTabBar({
  tabs,
  activeTabPath,
  setActiveTabPath,
  handleCloseTab,
  isTreeOpen,
  onToggleTree,
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
    <div className="flex items-center justify-between border-b border-[#22262B] bg-[#121417] px-2 select-none overflow-hidden shrink-0">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
        {onToggleTree && (
          <button
            type="button"
            onClick={onToggleTree}
            title={isTreeOpen ? 'Collapse Project File Tree' : 'Expand Project File Tree'}
            className={`aw-focus-ring flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer shrink-0 mr-1.5 border ${
              isTreeOpen
                ? 'bg-[#1A1D22] text-amber-300 border-[#2D3138]'
                : 'text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1A1D22] border-transparent hover:border-[#262A30]'
            }`}
          >
            <div className="w-3.5 h-3.5 text-amber-400">
              {isTreeOpen ? Icon.folderOpen : Icon.folder}
            </div>
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
              className={`aw-focus-ring group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium transition cursor-pointer shrink-0 max-w-[220px] border-t border-l border-r ${
                isActive
                  ? 'bg-[#15171B] text-[#E8EAED] border-[#292D33] shadow-sm'
                  : 'bg-[#101215] text-[#747C87] hover:text-[#A0A6AF] hover:bg-[#16181D] border-transparent'
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
                className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                title="Close tab (Ctrl+W)"
              >
                <div className="w-3 h-3">{Icon.x}</div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-1 shrink-0 py-1 pr-1">
        {canTogglePreview && (
          <button
            type="button"
            onClick={() => {
              setTabDataMap(prev => ({
                ...prev,
                [activePath]: {
                  ...prev[activePath],
                  viewMode: viewMode === 'code' ? 'preview' : 'code',
                },
              }));
            }}
            title={viewMode === 'code' ? 'Switch to Preview' : 'Switch to Raw Code'}
            className="aw-focus-ring flex items-center gap-1 px-2 py-1 rounded text-xs font-mono bg-[#1D2024] hover:bg-[#262A30] text-[#E8EAED] border border-[#30343A] transition cursor-pointer"
          >
            <div className="w-3.5 h-3.5 text-blue-400">
              {viewMode === 'code' ? Icon.eye : Icon.code}
            </div>
            <span className="hidden sm:inline capitalize">
              {viewMode === 'code' ? 'Preview' : 'Code'}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCopyPath}
          title="Copy file path"
          className="aw-focus-ring p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer"
        >
          <div className="w-3.5 h-3.5">{copiedPath ? Icon.check : Icon.copy}</div>
        </button>

        {fileData?.content && !fileData?.is_binary && (
          <button
            type="button"
            onClick={handleCopyCode}
            title="Copy file content"
            className="aw-focus-ring p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer"
          >
            <div className="w-3.5 h-3.5">{copiedContent ? Icon.check : Icon.fileText}</div>
          </button>
        )}

        {/* Minimize Button */}
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          title="Minimize viewer to bottom bar"
          className="aw-focus-ring p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer"
        >
          <div className="w-3.5 h-3.5">{Icon.minus}</div>
        </button>

        {/* Maximize / Restore Button */}
        <button
          type="button"
          onClick={() => setIsMaximized(!isMaximized)}
          title={isMaximized ? 'Restore normal size' : 'Maximize viewer'}
          className="aw-focus-ring p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer"
        >
          <div className="w-3.5 h-3.5">{isMaximized ? Icon.minimize : Icon.maximize}</div>
        </button>

        {/* Close All Tabs Button */}
        <button
          type="button"
          onClick={handleCloseAll}
          title="Close viewer (Esc)"
          className="aw-focus-ring p-1.5 rounded text-[#A0A6AF] hover:text-rose-400 hover:bg-[#1D2024] transition cursor-pointer"
        >
          <div className="w-4 h-4">{Icon.x}</div>
        </button>
      </div>
    </div>
  );
}
