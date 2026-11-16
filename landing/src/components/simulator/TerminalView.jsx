import { Check } from 'lucide-react';
import {
  PRIOR_TERMINAL_LOGS,
  SAMPLE_COMMAND,
  SAMPLE_DIRECTORY,
  SAMPLE_TERMINAL,
} from '../../data/simulatorData';

const LOG_TAG_COLORS = {
  session: 'text-status-purple',
  thought: 'text-text-muted',
  tool: 'text-accent',
  stdout: 'text-text-secondary',
};

export default function TerminalView({ phase, shown, running, onAllow }) {
  const lines = phase === 'allowed' ? SAMPLE_TERMINAL.slice(0, shown) : [];

  return (
    <div className="space-y-2 text-xs font-mono">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-1.5 text-[11px] text-text-muted">
        <span className="truncate pr-2">pwsh · pid 14280</span>
        <div className="shrink-0">
          {running ? (
            <span className="text-accent font-mono">streaming…</span>
          ) : phase === 'allowed' ? (
            <span className="text-status-success font-medium">exit 0</span>
          ) : phase === 'denied' ? (
            <span className="text-status-error font-medium">exit 1</span>
          ) : (
            <span className="text-status-warning font-medium">paused</span>
          )}
        </div>
      </div>

      {/* Terminal Screen Container */}
      <div
        className="code rounded-md p-3 text-[11.5px] leading-relaxed max-h-[18.5rem] overflow-y-auto space-y-1.5"
        role="log"
        aria-live="off"
      >
        {/* Prior agent session activity */}
        <div className="space-y-1 border-b border-border-subtle pb-2 opacity-80">
          {PRIOR_TERMINAL_LOGS.map((entry, idx) => (
            <div key={idx} className="flex items-baseline gap-2 text-[11px]">
              <span
                className={`w-14 shrink-0 text-right ${LOG_TAG_COLORS[entry.tag] ?? 'text-text-muted'}`}
              >
                [{entry.tag}]
              </span>
              <span className="text-text-secondary">{entry.text}</span>
            </div>
          ))}
        </div>

        {/* Current Command Prompt */}
        <div className="pt-1">
          <div className="text-text-muted text-[10.5px]">{SAMPLE_DIRECTORY}</div>
          <div className="flex items-center gap-1.5 text-text-primary font-medium">
            <span className="text-status-success select-none">❯</span>
            <span>{SAMPLE_COMMAND}</span>
          </div>
        </div>

        {/* State: Pending Approval */}
        {phase === 'pending' && (
          <div className="rounded border border-status-warning/30 bg-status-warning/10 p-2.5 my-2">
            <div className="flex items-center gap-2 text-status-warning font-medium text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-status-warning" aria-hidden="true" />
              <span>Awaiting permission to run</span>
            </div>
            <p className="mt-1 text-[11px] text-text-secondary">
              Privileged execution requires your decision.
            </p>
            {onAllow && (
              <button
                type="button"
                onClick={onAllow}
                className="mt-2 inline-flex items-center gap-1.5 rounded border border-status-success/50 bg-status-success/15 px-2.5 py-1 text-[11px] font-medium text-status-success transition-colors hover:bg-status-success/25"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Allow & run now</span>
              </button>
            )}
          </div>
        )}

        {/* State: Denied */}
        {phase === 'denied' && (
          <div className="rounded border border-status-error/30 bg-status-error/10 p-2 my-2 text-[11px] text-status-error">
            <span>[command denied by user dispatch via CDP — execution aborted]</span>
          </div>
        )}

        {/* State: Output Streaming */}
        {phase === 'allowed' && (
          <div className="space-y-0.5 pt-1 text-text-secondary">
            {lines.map((l, i) => {
              const pass = l.includes('PASSED');
              const summary = l.includes('passed in');
              return (
                <div
                  key={i}
                  className={`enter ${
                    summary
                      ? 'text-status-success font-semibold border-t border-border-subtle pt-1 mt-1'
                      : pass
                        ? 'text-status-success'
                        : 'text-text-secondary'
                  }`}
                >
                  {l}
                </div>
              );
            })}
            {running && (
              <span
                className="inline-block h-3.5 w-1.5 translate-y-0.5 bg-text-secondary"
                style={{ animation: 'caret 1s steps(1) infinite' }}
                aria-hidden="true"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
