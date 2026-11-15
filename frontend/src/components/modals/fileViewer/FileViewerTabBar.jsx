import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../../../constants/icons';
import { FileIcon } from '../../../constants/fileIcons';

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
  isDirty,
  isSaving,
  onSaveFile,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <div className="flex items-center justify-between border-b border-[#22262B] bg-[#121417] px-1.5 sm:px-2 select-none shrink-0 relative z-20">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 min-w-0 flex-1 mr-1">
        {onToggleTree && (
          <button
            type="button"
            onClick={onToggleTree}
            title={isTreeOpen ? 'Collapse Project File Tree' : 'Expand Project File Tree'}
            className={`aw-focus-ring flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition cursor-pointer shrink-0 mr-1 border ${
              isTreeOpen
                ? 'bg-[#1A1D22] text-amber-300 border-[#2D3138]'
                : 'text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1A1D22] border-transparent hover:border-[#262A30]'
            }`}
          >
            <div className="w-3.5 h-3.5 text-amber-400">
              {isTreeOpen ? Icon.folderOpen : Icon.folder}
            </div>
            <span className="hidden md:inline">Files</span>
          </button>
        )}

        {tabs.map(tab => {
          const isActive = tab.path === activeTabPath;
          return (
            <div
              key={tab.path}
              onClick={() => setActiveTabPath(tab.path)}
              title={tab.path}
              className={`aw-focus-ring group flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium transition cursor-pointer shrink-0 max-w-[140px] sm:max-w-[220px] border-t border-l border-r ${
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
              {/* Dirty indicator or close button */}
              <button
                type="button"
                onClick={e => handleCloseTab(e, tab.path)}
                className={`p-0.5 rounded transition cursor-pointer flex items-center justify-center ${
                  isDirty && isActive
                    ? 'text-amber-400 hover:text-rose-400'
                    : 'text-[#747C87] hover:text-rose-400 sm:opacity-0 sm:group-hover:opacity-100 opacity-80'
                }`}
                title={
                  isDirty && isActive ? 'Unsaved changes (Click to close)' : 'Close tab (Ctrl+W)'
                }
              >
                {isDirty && isActive ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400 group-hover:hidden" />
                ) : null}
                <div className={`w-3 h-3 ${isDirty && isActive ? 'hidden group-hover:block' : ''}`}>
                  {Icon.x}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-1 shrink-0 py-1">
        {/* Sync Changes to Disk Button */}
        <button
          type="button"
          onClick={onSaveFile}
          disabled={isSaving || !isDirty}
          title={isDirty ? 'Sync changes to disk (Ctrl+S)' : 'File is synchronized with device'}
          className={`aw-focus-ring flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded text-xs font-mono border transition ${
            isDirty
              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/50 cursor-pointer shadow-sm animate-pulse'
              : 'bg-[#181B1F] text-[#747C87] border-[#2A2E35] opacity-60 cursor-default'
          }`}
        >
          <div className="w-3.5 h-3.5">
            {isSaving ? Icon.refresh : isDirty ? Icon.check : Icon.checkCheck || Icon.check}
          </div>
          <span className="hidden sm:inline font-semibold">
            {isSaving ? 'Syncing...' : isDirty ? 'Sync' : 'Synced'}
          </span>
        </button>

        {/* Preview / Raw Code Toggle */}
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
            className="aw-focus-ring flex items-center gap-1 p-1.5 sm:px-2 sm:py-1 rounded text-xs font-mono bg-[#1D2024] hover:bg-[#262A30] text-[#E8EAED] border border-[#30343A] transition cursor-pointer"
          >
            <div className="w-3.5 h-3.5 text-blue-400">
              {viewMode === 'code' ? Icon.eye : Icon.code}
            </div>
            <span className="hidden md:inline capitalize">
              {viewMode === 'code' ? 'Preview' : 'Code'}
            </span>
          </button>
        )}

        {/* Desktop-only Direct Action Buttons */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyPath}
            title="Copy file path"
            className="aw-focus-ring p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer"
          >
            <div className="w-3.5 h-3.5">{copiedPath ? Icon.check : Icon.fileText}</div>
          </button>

          {fileData?.content && !fileData?.is_binary && (
            <button
              type="button"
              onClick={handleCopyCode}
              title="Copy file content"
              className="aw-focus-ring p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer"
            >
              <div className="w-3.5 h-3.5">{copiedContent ? Icon.check : Icon.copy}</div>
            </button>
          )}
        </div>

        {/* Mobile / Compact More Actions Dropdown Menu */}
        <div className="relative sm:hidden" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(prev => !prev)}
            title="More actions"
            className={`aw-focus-ring p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer ${
              isMenuOpen ? 'bg-[#1D2024] text-[#E8EAED]' : ''
            }`}
          >
            <div className="w-3.5 h-3.5">{Icon.menu}</div>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 rounded-lg bg-[#17191C] border border-[#30343A] shadow-2xl py-1.5 z-50 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  handleCopyPath();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[#C2C7CF] hover:text-white hover:bg-[#23272D] transition cursor-pointer"
              >
                <div className="w-3.5 h-3.5 text-[#7C9FC5]">
                  {copiedPath ? Icon.check : Icon.fileText}
                </div>
                <span>{copiedPath ? 'Path Copied!' : 'Copy File Path'}</span>
              </button>

              {fileData?.content && !fileData?.is_binary && (
                <button
                  type="button"
                  onClick={() => {
                    handleCopyCode();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[#C2C7CF] hover:text-white hover:bg-[#23272D] transition cursor-pointer"
                >
                  <div className="w-3.5 h-3.5 text-[#7C9FC5]">
                    {copiedContent ? Icon.check : Icon.copy}
                  </div>
                  <span>{copiedContent ? 'Content Copied!' : 'Copy Code'}</span>
                </button>
              )}
            </div>
          )}
        </div>

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
          <div className="w-3.5 h-3.5">{isMaximized ? Icon.minimize2 : Icon.maximize}</div>
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
