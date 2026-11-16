import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Play, Square, X } from 'lucide-react';
import ApprovalView from './ApprovalView';
import QuestionView from './QuestionView';
import TerminalView from './TerminalView';
import DiffView from './DiffView';
import useReducedMotion from '../../hooks/useReducedMotion';
import { SAMPLE_TERMINAL } from '../../data/simulatorData';

const TABS = [
  { id: 'approval', label: 'Approval' },
  { id: 'question', label: 'Question' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'diff', label: 'Diff' },
];

const STATUS = {
  pending: { label: 'Waiting for you', Icon: Square, text: 'text-status-warning' },
  running: { label: 'Running', Icon: Play, text: 'text-accent' },
  finished: { label: 'Finished', Icon: Check, text: 'text-status-success' },
  denied: { label: 'Denied', Icon: X, text: 'text-status-error' },
};

export default function PhoneSimulator() {
  const reduced = useReducedMotion();
  const [tab, setTab] = useState('approval');
  const [phase, setPhase] = useState('pending'); // pending | allowed | denied
  const [note, setNote] = useState('');
  const [streamed, setStreamed] = useState(0);
  const tabRefs = useRef({});

  const total = SAMPLE_TERMINAL.length;
  const shown = phase === 'allowed' && reduced ? total : streamed;
  const running = phase === 'allowed' && shown < total;
  const statusKey =
    phase === 'pending'
      ? 'pending'
      : phase === 'denied'
        ? 'denied'
        : running
          ? 'running'
          : 'finished';
  const status = STATUS[statusKey];

  // Stream the sample output line by line after "Allow".
  useEffect(() => {
    if (phase !== 'allowed') return undefined;
    if (reduced) return undefined;
    const id = setInterval(() => {
      setStreamed(n => {
        if (n >= total) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 420);
    return () => clearInterval(id);
  }, [phase, reduced, total]);

  const allow = useCallback(() => {
    setStreamed(1);
    setPhase('allowed');
    setTab('terminal');
  }, []);
  const deny = useCallback(text => {
    setNote(text);
    setPhase('denied');
  }, []);
  const reset = useCallback(() => {
    setPhase('pending');
    setNote('');
    setStreamed(0);
    setTab('approval');
  }, []);

  const onTabKey = e => {
    const i = TABS.findIndex(t => t.id === tab);
    let next = null;
    if (e.key === 'ArrowRight') next = TABS[(i + 1) % TABS.length];
    if (e.key === 'ArrowLeft') next = TABS[(i - 1 + TABS.length) % TABS.length];
    if (e.key === 'Home') next = TABS[0];
    if (e.key === 'End') next = TABS[TABS.length - 1];
    if (next) {
      e.preventDefault();
      setTab(next.id);
      tabRefs.current[next.id]?.focus();
    }
  };

  return (
    <figure className="w-full max-w-[22.5rem]" aria-label="AgentWatch mobile client">
      <div className="overflow-hidden rounded-2xl border border-border-strong bg-bg-surface shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]">
        {/* App bar */}
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <span className="font-mono text-xs font-medium">AgentWatch</span>
          <span
            className={`flex items-center gap-1.5 font-mono text-[11px] ${status.text}`}
            role="status"
            aria-live="polite"
          >
            <status.Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
            {status.label}
          </span>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Sample screens"
          onKeyDown={onTabKey}
          className="flex border-b border-border-subtle px-2"
        >
          {TABS.map(t => {
            const selected = tab === t.id;
            const dot = t.id === 'terminal' && phase === 'allowed' && tab !== 'terminal';
            return (
              <button
                key={t.id}
                ref={el => (tabRefs.current[t.id] = el)}
                role="tab"
                id={`sim-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`sim-panel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative flex-1 px-1 py-3 text-[13px] transition-colors ${
                  selected ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {t.label}
                {dot && (
                  <span
                    className="absolute right-1 top-2 h-1.5 w-1.5 rounded-sm bg-accent"
                    aria-label="new output"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-2 -bottom-px h-0.5 bg-accent transition-opacity duration-200 ${selected ? 'opacity-100' : 'opacity-0'}`}
                />
              </button>
            );
          })}
        </div>

        {/* Screen. Fixed height so switching tabs never shifts the page. */}
        <div
          role="tabpanel"
          id={`sim-panel-${tab}`}
          aria-labelledby={`sim-tab-${tab}`}
          tabIndex={0}
          className="h-[23rem] overflow-y-auto bg-bg-app p-4"
        >
          <div key={tab} className="enter">
            {tab === 'approval' && (
              <ApprovalView
                phase={phase}
                note={note}
                onAllow={allow}
                onDeny={deny}
                onReset={reset}
              />
            )}
            {tab === 'question' && <QuestionView />}
            {tab === 'terminal' && (
              <TerminalView phase={phase} shown={shown} running={running} onAllow={allow} />
            )}
            {tab === 'diff' && <DiffView />}
          </div>
        </div>
      </div>
    </figure>
  );
}
