import React, { useState, useRef } from 'react';
import { Icon } from '../../constants/icons';

export default function TerminalInputLine({
  isRunning = false,
  onExecute,
  cwd = '',
  onInterrupt,
}) {
  const [commandText, setCommandText] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRunning) return;
    const clean = commandText.trim();
    if (!clean) return;

    setHistory(prev => [...prev, clean]);
    setHistoryIdx(-1);
    setCommandText('');
    if (onExecute) onExecute(clean);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setCommandText(history[nextIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const nextIdx = historyIdx + 1;
      if (nextIdx >= history.length) {
        setHistoryIdx(-1);
        setCommandText('');
      } else {
        setHistoryIdx(nextIdx);
        setCommandText(history[nextIdx] || '');
      }
    } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      if (isRunning && onInterrupt) {
        e.preventDefault();
        onInterrupt();
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-3 py-1.5 bg-[#181818] border-t border-[#2B2B2B] text-xs font-mono select-none"
    >
      <div className="flex items-center gap-1.5 text-emerald-400 shrink-0">
        <span className="font-bold">{cwd ? cwd.split(/[\\/]/).pop() || 'workspace' : 'workspace'}</span>
        <span className="text-[#858585]">&gt;</span>
      </div>

      <input
        ref={inputRef}
        type="text"
        disabled={isRunning}
        value={commandText}
        onChange={e => setCommandText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isRunning ? "Process is running... Use '+' above for a new terminal, or click Interrupt to stop." : "Type terminal command and press Enter..."}
        className="flex-1 bg-transparent border-none outline-none text-[#CCCCCC] placeholder-[#555555] font-mono text-xs disabled:cursor-not-allowed disabled:text-[#666666]"
        autoFocus={!isRunning}
      />

      {isRunning ? (
        <button
          type="button"
          onClick={onInterrupt}
          title="Interrupt Process (Ctrl+C)"
          className="px-2 py-0.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 text-[11px] font-mono transition cursor-pointer flex items-center gap-1"
        >
          <div className="w-3 h-3 text-rose-400">{Icon.stop}</div>
          <span>Interrupt</span>
        </button>
      ) : (
        <button
          type="submit"
          disabled={!commandText.trim()}
          title="Execute Command"
          className="px-2 py-0.5 rounded bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-30 disabled:cursor-not-allowed text-white text-[11px] font-mono transition cursor-pointer flex items-center gap-1"
        >
          <div className="w-3 h-3">{Icon.send}</div>
          <span className="hidden sm:inline">Run</span>
        </button>
      )}
    </form>
  );
}

