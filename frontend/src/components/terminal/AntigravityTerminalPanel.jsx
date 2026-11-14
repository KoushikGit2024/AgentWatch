import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from '../../constants/icons';
import { terminalApi } from '../../services/terminalApi';
import { toast } from '../../services/toastService';
import TerminalTabsHeader from './TerminalTabsHeader';
import TerminalInputLine from './TerminalInputLine';

export default function AntigravityTerminalPanel({ isOpen, onClose, embedded = false }) {
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
      const res = await terminalApi.listSessions();
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
        const res = await terminalApi.getSessionOutput(currentSessionId, 400);
        if (isMounted && res && res.success) {
          setSessionOutputs(prev => ({
            ...prev,
            [currentSessionId]: res.lines || [],
          }));
          // update running state and cwd in session list
          setSessions(prev =>
            prev.map(s =>
              s.session_id === currentSessionId
                ? {
                    ...s,
                    is_running: res.is_running,
                    exit_code: res.exit_code,
                    cwd: res.cwd || s.cwd,
                  }
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

  const filteredLines = activeLines.filter(
    l => !filterText || l.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleCreateNewTab = async (shellType = 'powershell') => {
    try {
      const res = await terminalApi.createSession(shellType);
      if (res && res.success) {
        setSessions(prev => [
          ...prev,
          {
            session_id: res.session_id,
            shell_type: res.shell_type,
            cwd: res.cwd,
            is_running: false,
            created_at: new Date().toISOString(),
          },
        ]);
        setCurrentSessionId(res.session_id);
        toast.success(`Spawned new ${res.shell_type} terminal tab`, 'Terminal Created');
      }
    } catch {
      toast.error('Failed to create new terminal session tab', 'Terminal Error');
    }
  };

  const handleCloseTab = async sessionIdToClose => {
    try {
      await terminalApi.closeSession(sessionIdToClose);
      const remaining = sessions.filter(s => s.session_id !== sessionIdToClose);
      setSessions(remaining);
      if (currentSessionId === sessionIdToClose) {
        if (remaining.length > 0) {
          setCurrentSessionId(remaining[0].session_id);
        } else {
          setCurrentSessionId(null);
          if (onClose) onClose();
        }
      } else if (remaining.length === 0) {
        setCurrentSessionId(null);
        if (onClose) onClose();
      }
    } catch {
      const remaining = sessions.filter(s => s.session_id !== sessionIdToClose);
      setSessions(remaining);
      if (remaining.length === 0) {
        setCurrentSessionId(null);
        if (onClose) onClose();
      }
    }
  };

  const handleExecuteCommand = async cmd => {
    if (!currentSessionId) return;
    try {
      const resExec = await terminalApi.executeCommand(currentSessionId, cmd);
      if (resExec && resExec.cwd) {
        setSessions(prev =>
          prev.map(s => (s.session_id === currentSessionId ? { ...s, cwd: resExec.cwd } : s))
        );
      }
      // Immediately fetch latest output without waiting for timer
      const res = await terminalApi.getSessionOutput(currentSessionId, 400);
      if (res && res.success) {
        setSessionOutputs(prev => ({
          ...prev,
          [currentSessionId]: res.lines || [],
        }));
        if (res.cwd) {
          setSessions(prev =>
            prev.map(s => (s.session_id === currentSessionId ? { ...s, cwd: res.cwd } : s))
          );
        }
      }
    } catch {}
  };

  const handleKillCurrentProcess = async () => {
    if (!currentSessionId) return;
    try {
      const resKill = await terminalApi.killSession(currentSessionId);
      if (resKill && resKill.success) {
        toast.success('Terminal process terminated', 'Process Stopped');
      } else {
        toast.info('No active process running to terminate', 'Terminal Idle');
      }
      const res = await terminalApi.getSessionOutput(currentSessionId, 400);
      if (res && res.success) {
        setSessionOutputs(prev => ({
          ...prev,
          [currentSessionId]: res.lines || [],
        }));
        setSessions(prev =>
          prev.map(s =>
            s.session_id === currentSessionId
              ? { ...s, is_running: false, exit_code: -1, cwd: res.cwd || s.cwd }
              : s
          )
        );
      }
    } catch {
      toast.error('Failed to send interrupt signal to terminal', 'Terminal Error');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="workbench.parts.panel"
      className={
        embedded
          ? `w-full rounded-lg border border-[#30343A] bg-[#181818] shadow-lg flex flex-col font-sans select-none overflow-hidden transition-all duration-150 ${
              isMaximized ? 'h-[75vh]' : 'h-64 sm:h-72'
            }`
          : `fixed left-0 right-0 bottom-0 z-40 bg-[#181818] border-t border-[#2B2B2B] shadow-2xl flex flex-col font-sans select-none transition-all duration-150 ${
              isMaximized ? 'h-[85vh]' : 'h-80 sm:h-96'
            }`
      }
    >
      {/* Visual Studio Code Style Header Tabs */}
      <TerminalTabsHeader
        tabs={sessions.map(s => ({
          id: s.session_id,
          title: s.shell_type || 'shell',
          isRunning: s.is_running,
          exitCode: s.exit_code,
        }))}
        currentTabId={currentSessionId}
        onSelectTab={setCurrentSessionId}
        onNewTab={() => handleCreateNewTab('powershell')}
        onCloseTab={handleCloseTab}
        isMaximized={isMaximized}
        onToggleMaximize={() => setIsMaximized(v => !v)}
        onClosePanel={onClose}
      />

      {/* Terminal View Body */}
      <div className="flex-1 flex flex-col bg-[#141414] overflow-hidden min-h-0">
        {/* Sub-toolbar: Active Directory Breadcrumb & Output Filter */}
        <div className="flex items-center justify-between px-3 py-1 bg-[#1A1A1A] border-b border-[#252525] text-xs font-mono text-[#858585]">
          <div className="flex items-center gap-2 truncate">
            <span className="text-[#AAAAAA]">{currentSession?.shell_type || 'powershell'}</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold truncate" title={currentSession?.cwd || ''}>
              {currentSession?.cwd || 'workspace'}
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
                autoScroll
                  ? 'bg-[#0078D4]/20 text-[#0078D4] border border-[#0078D4]/40'
                  : 'text-[#858585] hover:text-[#CCCCCC]'
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
                <div
                  key={idx}
                  className="whitespace-pre-wrap break-all hover:bg-[#202020] px-1 rounded"
                >
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

        {/* Interactive Command Input Line with sessionStorage history and draft remembering */}
        <TerminalInputLine
          sessionId={currentSession?.session_id || 'default'}
          isRunning={Boolean(currentSession?.is_running)}
          onExecute={handleExecuteCommand}
          cwd={currentSession?.cwd || ''}
          onInterrupt={handleKillCurrentProcess}
        />
      </div>
    </div>
  );
}
