import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from '../../constants/icons';

const STORAGE_KEY_HISTORY = 'aw_term_history';
const MAX_HISTORY_ITEMS = 100;

// Curated developer CLI preset list for fast autocomplete suggestions
const COMMON_CLI_PRESETS = [
  'git status',
  'git add .',
  'git commit -m ""',
  'git push',
  'git pull',
  'git checkout -b ',
  'git diff',
  'git log --oneline -n 10',
  'npm run dev',
  'npm test',
  'npm run build',
  'npm install',
  'pytest',
  'python -m pytest',
  'cd frontend',
  'cd backend',
  'cd ..',
  'dir',
  'cls',
  'clear',
];

export default function TerminalInputLine({
  sessionId = 'default',
  isRunning = false,
  onExecute,
  cwd = '',
  onInterrupt,
}) {
  const [commandText, setCommandText] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef(null);
  const draftRef = useRef('');

  // 1. Load history from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY_HISTORY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch {}
  }, []);

  // 2. Draft remembering: on tab switch/mount, recover tab-specific draft from sessionStorage
  useEffect(() => {
    if (!sessionId) return;
    try {
      const savedDraft = sessionStorage.getItem(`aw_term_draft_${sessionId}`) || '';
      setCommandText(savedDraft);
      draftRef.current = savedDraft;
      setHistoryIdx(-1);
    } catch {}
  }, [sessionId]);

  // Handle user input typing & sync to sessionStorage
  const handleInputChange = (e) => {
    const val = e.target.value;
    setCommandText(val);
    draftRef.current = val;
    setHistoryIdx(-1);
    try {
      if (sessionId) {
        if (val) {
          sessionStorage.setItem(`aw_term_draft_${sessionId}`, val);
        } else {
          sessionStorage.removeItem(`aw_term_draft_${sessionId}`);
        }
      }
    } catch {}
  };

  // 3. Compute ghost suggestion suffix
  const ghostSuggestion = useMemo(() => {
    const trimmed = commandText.trim();
    if (!trimmed || isRunning) return '';

    // Sourced from recent user history + common presets
    const candidates = [...history.slice().reverse(), ...COMMON_CLI_PRESETS];
    for (const cand of candidates) {
      if (cand.toLowerCase().startsWith(commandText.toLowerCase()) && cand.length > commandText.length) {
        return cand.slice(commandText.length);
      }
    }
    return '';
  }, [commandText, history, isRunning]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRunning) return;
    const clean = commandText.trim();
    if (!clean) return;

    // Update history in sessionStorage (deduplicated consecutive items, max 100)
    setHistory(prev => {
      const updated = prev[prev.length - 1] === clean ? prev : [...prev, clean].slice(-MAX_HISTORY_ITEMS);
      try {
        sessionStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Clear active tab's draft
    try {
      sessionStorage.removeItem(`aw_term_draft_${sessionId}`);
    } catch {}

    draftRef.current = '';
    setHistoryIdx(-1);
    setCommandText('');
    if (onExecute) onExecute(clean);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      if (historyIdx === -1) {
        draftRef.current = commandText;
      }
      const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setCommandText(history[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= history.length) {
        setHistoryIdx(-1);
        setCommandText(draftRef.current || '');
      } else {
        setHistoryIdx(nextIdx);
        setCommandText(history[nextIdx] || '');
      }
    } else if (e.key === 'Tab' || (e.key === 'ArrowRight' && inputRef.current?.selectionStart === commandText.length)) {
      if (ghostSuggestion) {
        e.preventDefault();
        const completed = commandText + ghostSuggestion;
        setCommandText(completed);
        draftRef.current = completed;
      }
    } else if (e.key === 'Escape') {
      if (ghostSuggestion) {
        e.preventDefault();
        // Clear ghost suggestion by temporarily unfocusing or handling via escape
      }
    } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      if (isRunning && onInterrupt) {
        e.preventDefault();
        onInterrupt();
      }
    }
  };

  const folderLeaf = cwd ? cwd.split(/[\\/]/).pop() || 'workspace' : 'workspace';

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-3 py-1.5 bg-[#181818] border-t border-[#2B2B2B] text-xs font-mono select-none relative"
    >
      <div className="flex items-center gap-1.5 text-emerald-400 shrink-0 select-none" title={cwd}>
        <span className="font-bold">{folderLeaf}</span>
        <span className="text-[#858585]">&gt;</span>
      </div>

      <div className="relative flex-1 flex items-center min-w-0">
        {/* Ghost text suggestion overlay */}
        {ghostSuggestion && !isRunning && (
          <div
            className="absolute left-0 top-0 bottom-0 pointer-events-none font-mono text-xs text-[#555555] flex items-center whitespace-pre overflow-hidden"
            aria-hidden="true"
          >
            <span className="opacity-0">{commandText}</span>
            <span className="text-[#666666]">{ghostSuggestion}</span>
            <span className="ml-2 text-[10px] text-[#444444] border border-[#333333] px-1 rounded select-none">
              Tab
            </span>
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          disabled={isRunning}
          value={commandText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isRunning
              ? "Process is running... Use '+' above for a new terminal, or click Interrupt to stop."
              : "Type terminal command and press Enter..."
          }
          className="w-full bg-transparent border-none outline-none text-[#CCCCCC] placeholder-[#555555] font-mono text-xs disabled:cursor-not-allowed disabled:text-[#666666] relative z-10"
          autoFocus={!isRunning}
        />
      </div>

      {isRunning ? (
        <button
          type="button"
          onClick={onInterrupt}
          title="Interrupt Process (Ctrl+C)"
          className="px-2 py-0.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 text-[11px] font-mono transition cursor-pointer flex items-center gap-1 z-10 shrink-0"
        >
          <div className="w-3 h-3 text-rose-400">{Icon.stop}</div>
          <span>Interrupt</span>
        </button>
      ) : (
        <button
          type="submit"
          disabled={!commandText.trim()}
          title="Execute Command"
          className="px-2 py-0.5 rounded bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-30 disabled:cursor-not-allowed text-white text-[11px] font-mono transition cursor-pointer flex items-center gap-1 z-10 shrink-0"
        >
          <div className="w-3 h-3">{Icon.send}</div>
          <span className="hidden sm:inline">Run</span>
        </button>
      )}
    </form>
  );
}
