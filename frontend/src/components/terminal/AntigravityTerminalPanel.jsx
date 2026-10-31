import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '../../constants/icons';
import { api } from '../../services/api';
import { toast } from '../../services/toastService';
import TerminalTabsHeader from './TerminalTabsHeader';
import TerminalInputLine from './TerminalInputLine';

export default function AntigravityTerminalPanel({
  isOpen,
  onClose,
}) {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeView, setActiveView] = useState('terminal');
  const [sessionOutputs, setSessionOutputs] = useState({});
  const [isLoadingOutput, setIsLoadingOutput] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterText, setFilterText] = useState('');
  const logContainerRef = useRef(null);
  const isFetchingRef = useRef(false);

  // 1. Fetch sessions list on open (lightweight, zero busy loop)
  const loadSessions = useCallback(async () => {
    try {
      const res = await api.listTerminalSessions();
      if (res && res.success && Array.isArray(res.sessions)) {
        setSessions(res.sessions);
        if (!currentSessionId && res.sessions.length > 0) {
          setCurrentSessionId(res.sessions[0].session_id);
        }
      }
    } catch {}
  }, [currentSessionId]);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, loadSessions]);

  // 2. Fetch output for active session tab with adaptive interval (3s when idle, 1s when running)
  useEffect(() => {
    if (!isOpen || !currentSessionId) return;

    let isMounted = true;
    const fetchOutput = async () => {
      if (isFetchingRef.current) return;
      try {
        isFetchingRef.current = true;
        const res = await api.getTerminalSessionOutput(currentSessionId, 400);
        if (isMounted && res && res.success) {
          setSessionOutputs(prev => ({
            ...prev,
            [currentSessionId]: res.lines || [],
          }));
          // update running state in session list
          setSessions(prev =>
            prev.map(s =>
              s.session_id === currentSessionId
                ? { ...s, is_running: res.is_running, exit_code: res.exit_code }
                : s
            )
          );
        }
      } catch {
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchOutput();
    const intervalMs = 2000;
    const interval = setInterval(fetchOutput, intervalMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, currentSessionId]);

  // Auto-scroll viewport
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [sessionOutputs, currentSessionId, autoScroll]);

  if (!isOpen) return null;

  const currentSession = sessions.find(s => s.session_id === currentSessionId) || sessions[0];
  const activeLines = (currentSession && sessionOutputs[currentSession.session_id]) || [];

  const filteredLines = activeLines.filter(l =>
    !filterText || l.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleCreateNewTab = async (shellType = 'powershell') => {
    try {
      const res = await api.createTerminalSession(shellType);
      if (res && res.success) {
        await loadSessions();
        setCurrentSessionId(res.session_id);
      }
    } catch {}
  };

  const handleCloseTab = async (sessionId, e) => {
    if (e) e.stopPropagation();
    try {
      await api.closeTerminalSession(sessionId);
      const remaining = sessions.filter(s => s.session_id !== sessionId);
      setSessions(remaining);
      if (currentSessionId === sessionId && remaining.length > 0) {
        setCurrentSessionId(remaining[0].session_id);
      }
    } catch {}
  };

  const handleExecuteCommand = async (cmd) => {
    if (!currentSessionId) return;
    try {
      await api.executeTerminalCommand(currentSessionId, cmd);
      // Immediately fetch latest output without waiting for timer
      const res = await api.getTerminalSessionOutput(currentSessionId, 400);
      if (res && res.success) {
        setSessionOutputs(prev => ({
          ...prev,
          [currentSessionId]: res.lines || [],
        }));
      }
    } catch {}
  };

  const handleKillCurrentProcess = async () => {
    if (!currentSessionId) return;
    try {
      const resKill = await api.killTerminalSession(currentSessionId);
      if (resKill && resKill.success) {
        toast.success('Terminal process terminated', 'Process Stopped');
      } else {
        toast.info('No active process running to terminate', 'Terminal Idle');
      }
      const res = await api.getTerminalSessionOutput(currentSessionId, 400);
      if (res && res.success) {
        setSessionOutputs(prev => ({
          ...prev,
          [currentSessionId]: res.lines || [],
        }));
        setSessions(prev =>
          prev.map(s =>
            s.session_id === currentSessionId
              ? { ...s, is_running: false, exit_code: -1 }
              : s
          )
        );
      }
    } catch {
      toast.error('Failed to send interrupt signal to terminal', 'Terminal Error');
    }
  };

  return (
    <div
      id="workbench.parts.panel"
      className={`fixed left-0 right-0 bottom-0 z-40 bg-[#181818] border-t border-[#2B2B2B] shadow-2xl flex flex-col font-sans select-none transition-all duration-150 ${
        isMaximized ? 'h-[75dvh]' : 'h-[280px] sm:h-[300px]'
      }`}
    >
      <TerminalTabsHeader
        tabs={sessions.map(s => ({
          id: s.session_id,
          title: s.shell_type || 'shell',
          isRunning: s.is_running,
          exitCode: s.exit_code,
        }))}
        currentTabId={currentSessionId}
        onSelectTab={id => setCurrentSessionId(id)}
        onNewTab={() => handleCreateNewTab('powershell')}
        onCloseTab={handleCloseTab}
        onKillTerminal={handleKillCurrentProcess}
        isMaximized={isMaximized}
        onToggleMaximize={() => setIsMaximized(v => !v)}
        onClosePanel={onClose}
      />

      <div className="flex-1 flex flex-col min-h-0 bg-[#181818] text-[#CCCCCC]">
        {/* Sticky Filter Header */}
        <div className="flex items-center justify-between px-3 py-1 bg-[#1E1E1E] border-b border-[#2B2B2B] text-xs font-mono">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[#858585]">$</span>
            <span className="text-[#E8EAED] truncate font-medium">
              {currentSession?.current_command || currentSession?.shell_type || 'shell'}
            </span>
            {currentSession?.is_running && (
              <span className="w-2 h-2 rounded-full bg-[#0078D4] animate-pulse shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Filter output..."
              className="px-2 py-0.5 rounded bg-[#181818] border border-[#333333] text-[11px] text-[#CCCCCC] placeholder-[#666666] outline-none focus:border-[#0078D4]"
            />
            <button
              type="button"
              onClick={() => setAutoScroll(v => !v)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                autoScroll ? 'bg-[#0078D4]/20 text-[#0078D4] border border-[#0078D4]/40' : 'text-[#858585] hover:text-[#CCCCCC]'
              }`}
            >
              Follow Tail
            </button>
          </div>
        </div>

        {/* Viewport Output */}
        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto p-3 font-mono text-[12px] sm:text-[13px] leading-relaxed text-[#D4D4D4] select-text"
          style={{ fontFamily: 'Consolas, "Courier New", monospace' }}
        >
          {filteredLines.length > 0 ? (
            <div className="space-y-0.5">
              {filteredLines.map((line, idx) => (
                <div key={idx} className="whitespace-pre-wrap break-all hover:bg-[#202020] px-1 rounded">
                  {line}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[#666666] italic py-4">
              Terminal ready. Type a command in the input line below and press Enter.
            </div>
          )}
        </div>

        {/* Interactive Command Input Line */}
        <TerminalInputLine
          isRunning={Boolean(currentSession?.is_running)}
          onExecute={handleExecuteCommand}
          cwd={currentSession?.cwd || ''}
          onInterrupt={handleKillCurrentProcess}
        />
      </div>
    </div>
  );
}
