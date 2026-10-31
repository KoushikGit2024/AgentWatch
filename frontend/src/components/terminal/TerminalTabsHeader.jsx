import React from 'react';
import { Icon } from '../../constants/icons';

export default function TerminalTabsHeader({
  tabs = [],
  currentTabId,
  onSelectTab,
  onNewTab,
  onCloseTab,
  onKillTerminal,
  isMaximized,
  onToggleMaximize,
  onClosePanel,
}) {
  return (
    <div className="flex items-center justify-between h-[35px] bg-[#181818] border-b border-[#2B2B2B] px-2 select-none">
      {/* Left: Terminal Header Title */}
      <div className="flex items-center h-full gap-2 pl-1 pr-3 border-r border-[#2B2B2B]">
        <div className="w-4 h-4 text-[#0078D4]">{Icon.terminal}</div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[#CCCCCC] font-mono">
          Terminal
        </span>
      </div>

      {/* Middle/Left: Process Shell Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto flex-1 px-2.5">
        {tabs.map(tab => {
          const isSelected = tab.id === currentTabId;
          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition cursor-pointer border ${
                isSelected
                  ? 'bg-[#222222] border-[#3B3B3B] text-[#CCCCCC]'
                  : 'bg-[#181818] border-transparent text-[#858585] hover:text-[#CCCCCC] hover:bg-[#1E1E1E]'
              }`}
            >
              <div className="w-3.5 h-3.5 text-[#0078D4] shrink-0">{Icon.terminal}</div>
              <span className="truncate max-w-[100px]">{tab.title}</span>
              {tab.isRunning ? (
                <span className="w-1.5 h-1.5 rounded-full bg-[#0078D4] animate-pulse shrink-0" />
              ) : tab.exitCode === 0 ? (
                <span className="w-1.5 h-1.5 rounded-full bg-[#388A34] shrink-0" />
              ) : null}
              {tabs.length > 1 && (
                <button
                  type="button"
                  onClick={e => onCloseTab(tab.id, e)}
                  title="Close Terminal Instance"
                  className="p-0.5 hover:text-white rounded hover:bg-[#333333] transition"
                >
                  <div className="w-2.5 h-2.5">{Icon.x}</div>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Right: Actions Toolbar & Panel Controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onNewTab}
          title="New Terminal"
          className="p-1 rounded text-[#9D9D9D] hover:text-[#E8EAED] hover:bg-[#2A2A2A] transition cursor-pointer"
        >
          <div className="w-3.5 h-3.5">{Icon.plus}</div>
        </button>

        <button
          type="button"
          onClick={onKillTerminal}
          title="Kill Terminal"
          className="p-1 rounded text-[#9D9D9D] hover:text-[#F48771] hover:bg-[#2A2A2A] transition cursor-pointer"
        >
          <div className="w-3.5 h-3.5">{Icon.trash}</div>
        </button>

        <div className="h-3 w-[1px] bg-[#333333] mx-1" />

        <button
          type="button"
          onClick={onToggleMaximize}
          title={isMaximized ? 'Restore Panel Size' : 'Maximize Panel Size'}
          className="p-1 rounded text-[#9D9D9D] hover:text-[#E8EAED] hover:bg-[#2A2A2A] transition cursor-pointer"
        >
          <div className="w-3.5 h-3.5">{Icon.maximize}</div>
        </button>

        <button
          type="button"
          onClick={onClosePanel}
          title="Close Panel"
          className="p-1 rounded text-[#9D9D9D] hover:text-[#E8EAED] hover:bg-[#2A2A2A] transition cursor-pointer"
        >
          <div className="w-3.5 h-3.5">{Icon.x}</div>
        </button>
      </div>
    </div>
  );
}
