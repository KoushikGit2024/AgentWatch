import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../constants/icons';
import { api } from '../../services/api';
import TerminalTabsHeader from './TerminalTabsHeader';

export default function AntigravityTerminalPanel({
  isOpen,
  onClose,
  initialTasks = [],
  onKillTask,
  activeTaskId,
  onSelectTask,
}) {
  const [tabs, setTabs] = useState([]);
  const [currentTabId, setCurrentTabId] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeView, setActiveView] = useState('terminal'); // 'problems', 'output', 'terminal', 'ports'
  const [terminalLogs, setTerminalLogs] = useState({});
  const [isLoadingLog, setIsLoadingLog] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterText, setFilterText] = useState('');
  const logContainerRef = useRef(null);

  // Sync tasks from workbench / agent executions into terminal tabs
  useEffect(() => {
    if (!initialTasks || initialTasks.length === 0) {
      if (tabs.length === 0) {
        const defaultTab = {
          id: 'term-default',
          title: 'python',
          command: 'python',
          isRunning: false,
          exitCode: 0,
        };
        setTabs([defaultTab]);
        setCurrentTabId(defaultTab.id);
      }
      return;
    }

    setTabs(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const newTabs = [...prev];

      initialTasks.forEach((task, idx) => {
        const taskId = task.tooltip_id || task.id || `task-${idx}`;
        const cmdName = task.command ? task.command.split(' ')[0] : 'python';
        if (!existingIds.has(taskId)) {
          newTabs.push({
            id: taskId,
            title: cmdName,
            command: task.command || 'terminal command',
            isRunning: task.is_running !== false,
            exitCode: task.exit_code,
            rawTask: task,
          });
        } else {
          const tabIdx = newTabs.findIndex(t => t.id === taskId);
          if (tabIdx >= 0) {
            newTabs[tabIdx] = {
              ...newTabs[tabIdx],
              isRunning: task.is_running !== false,
              exitCode: task.exit_code,
              command: task.command || newTabs[tabIdx].command,
            };
          }
        }
      });
      return newTabs;
    });
  }, [initialTasks]);

  useEffect(() => {
    if (activeTaskId) {
      setCurrentTabId(activeTaskId);
    } else if (!currentTabId && tabs.length > 0) {
      setCurrentTabId(tabs[0].id);
    }
  }, [activeTaskId, tabs, currentTabId]);

  // Fetch log for current tab
  useEffect(() => {
    if (!isOpen || !currentTabId) return;

    let isMounted = true;
    const fetchLog = async () => {
      try {
        setIsLoadingLog(true);
        const res = await api.getTaskLog(currentTabId, 60000);
        if (isMounted && res && res.success) {
          setTerminalLogs(prev => ({
            ...prev,
            [currentTabId]: res.content || '',
          }));
        }
      } catch {
        // Silently keep cached log if endpoint is unavailable
      } finally {
        if (isMounted) setIsLoadingLog(false);
      }
    };

    fetchLog();
    const interval = setInterval(fetchLog, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, currentTabId]);

  // Auto-scroll log viewport
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [terminalLogs, currentTabId, autoScroll]);

  if (!isOpen) return null;

  const currentTab = tabs.find(t => t.id === currentTabId) || tabs[0];
  const activeLog = (currentTab && terminalLogs[currentTab.id]) || '';

  const filteredLines = activeLog
    ? activeLog.split('\n').filter(l => !filterText || l.toLowerCase().includes(filterText.toLowerCase()))
    : [];

  const handleAddNewTab = () => {
    const newId = `term-${Date.now()}`;
    const newTab = {
      id: newId,
      title: 'powershell',
      command: 'powershell.exe',
      isRunning: true,
      exitCode: null,
    };
    setTabs(prev => [...prev, newTab]);
    setCurrentTabId(newId);
  };

  const handleCloseTab = (tabId, e) => {
    if (e) e.stopPropagation();
    setTabs(prev => {
      const next = prev.filter(t => t.id !== tabId);
      if (currentTabId === tabId && next.length > 0) {
        setCurrentTabId(next[0].id);
      }
      return next;
    });
  };

  const handleKillCurrentTab = () => {
    if (!currentTab) return;
    if (onKillTask && currentTab.rawTask) {
      onKillTask(currentTab.rawTask.index ?? 0, currentTab.id);
    }
    setTabs(prev =>
      prev.map(t => (t.id === currentTab.id ? { ...t, isRunning: false, exitCode: 1 } : t))
    );
  };

  return (
    <div
      id="workbench.parts.panel"
      className={`fixed left-0 right-0 bottom-0 z-40 bg-[#181818] border-t border-[#2B2B2B] shadow-2xl flex flex-col font-sans select-none transition-all duration-150 ${
        isMaximized ? 'h-[75dvh]' : 'h-[240px] sm:h-[260px]'
      }`}
    >
      {/* Top Composite View Switcher & Action Bar */}
      <TerminalTabsHeader
        activeView={activeView}
        onSelectView={setActiveView}
        tabs={tabs}
        currentTabId={currentTabId}
        onSelectTab={id => {
          setCurrentTabId(id);
          if (onSelectTask) onSelectTask(id);
        }}
        onNewTab={handleAddNewTab}
        onCloseTab={handleCloseTab}
        onKillTerminal={handleKillCurrentTab}
        isMaximized={isMaximized}
        onToggleMaximize={() => setIsMaximized(v => !v)}
        onClosePanel={onClose}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#181818] text-[#CCCCCC]">
        {/* Sticky Command Line Sub-header */}
        <div className="flex items-center justify-between px-3 py-1 bg-[#1E1E1E] border-b border-[#2B2B2B] text-xs font-mono">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[#858585]">$</span>
            <span className="text-[#E8EAED] truncate font-medium">
              {currentTab ? currentTab.command : 'python'}
            </span>
            {currentTab?.isRunning && (
              <span className="w-2 h-2 rounded-full bg-[#0078D4] animate-pulse shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Filter terminal output..."
              className="px-2 py-0.5 rounded bg-[#181818] border border-[#333333] text-[11px] text-[#CCCCCC] placeholder-[#666666] outline-none focus:border-[#0078D4]"
            />
            <button
              type="button"
              onClick={() => setAutoScroll(v => !v)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                autoScroll ? 'bg-[#0078D4]/20 text-[#0078D4] border border-[#0078D4]/40' : 'text-[#858585] hover:text-[#CCCCCC]'
              }`}
            >
              Scroll Lock
            </button>
          </div>
        </div>

        {/* Terminal Log Viewport */}
        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto p-3 font-mono text-[12px] sm:text-[13px] leading-relaxed text-[#D4D4D4] select-text"
          style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
        >
          {isLoadingLog && !activeLog ? (
            <div className="flex items-center justify-center h-full text-xs text-[#858585] gap-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-[#0078D4] border-t-transparent animate-spin" />
              <span>Attaching to terminal process...</span>
            </div>
          ) : filteredLines.length > 0 ? (
            <div className="space-y-0.5">
              {filteredLines.map((line, idx) => (
                <div key={idx} className="whitespace-pre-wrap break-all hover:bg-[#202020] px-1 rounded">
                  {line}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[#666666] italic py-4">
              Terminal process started. Waiting for command output...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
