import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { SAMPLE_COMMAND, SAMPLE_DIRECTORY } from '../../data/simulatorData';

export default function ApprovalView({ phase, note, onAllow, onDeny, onReset }) {
  const [draft, setDraft] = useState('');
  const decided = phase !== 'pending';

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
          Agent wants to run
        </p>
        <div className="code mt-2 rounded-md p-3 text-[13px]">
          <span className="text-text-muted">$ </span>
          <span className="text-text-primary">{SAMPLE_COMMAND}</span>
        </div>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-xs">
          <dt className="text-text-muted">Directory</dt>
          <dd className="break-all text-text-secondary">{SAMPLE_DIRECTORY}</dd>
          <dt className="text-text-muted">Safe to auto-run</dt>
          <dd className="text-status-warning">false</dd>
        </dl>
      </div>

      {!decided ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onAllow}
              className="btn !min-h-11 !px-3 !text-sm border-status-success/50 bg-status-success/15 text-status-success hover:bg-status-success/25"
            >
              <Check className="h-4 w-4" aria-hidden="true" /> Allow
            </button>
            <button
              type="button"
              onClick={() => onDeny(draft.trim())}
              className="btn !min-h-11 !px-3 !text-sm border-status-error/50 bg-status-error/10 text-status-error hover:bg-status-error/20"
            >
              <X className="h-4 w-4" aria-hidden="true" />{' '}
              {draft.trim() ? 'Deny with note' : 'Deny'}
            </button>
          </div>
          <label className="block">
            <span className="sr-only">Alternative instructions for the agent</span>
            <input
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Optional note for the agent"
              className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2.5 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
            <span className="mt-1.5 block text-[11px] text-text-muted">
              Sent with a denial when the agent supports it.
            </span>
          </label>
        </div>
      ) : (
        <div className="enter space-y-3">
          <div
            className={`flex items-start gap-2.5 rounded-md border p-3 ${
              phase === 'allowed'
                ? 'border-status-success/40 bg-status-success/10 text-status-success'
                : 'border-status-error/40 bg-status-error/10 text-status-error'
            }`}
          >
            {phase === 'allowed' ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="text-sm">
              <p className="font-medium">
                {phase === 'allowed' ? 'You allowed this command' : 'You denied this command'}
              </p>
              {phase === 'denied' && note && (
                <p className="mt-1 font-mono text-xs text-text-secondary">“{note}”</p>
              )}
              {phase === 'allowed' && (
                <p className="mt-1 text-xs text-text-secondary">
                  Output is streaming in the Terminal tab.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="font-mono text-xs text-accent underline-offset-4 hover:underline"
          >
            Reset sample
          </button>
        </div>
      )}
    </div>
  );
}
