import { useMemo, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { SAMPLE_DIFF_FILES } from '../../data/simulatorData';

const ROW = {
  add: 'bg-status-success/15 text-status-success font-medium',
  del: 'bg-status-error/15 text-status-error font-medium',
  ctx: 'text-text-secondary',
};
const SIGN = { add: '+', del: '−', ctx: ' ' };

export default function DiffView() {
  const [fileIdx, setFileIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const file = SAMPLE_DIFF_FILES[fileIdx];

  const counts = useMemo(
    () =>
      SAMPLE_DIFF_FILES.map(f => ({
        add: f.rows.filter(r => r.t === 'add').length,
        del: f.rows.filter(r => r.t === 'del').length,
      })),
    []
  );

  return (
    <div className="space-y-3 text-xs">
      <div className="space-y-1.5" role="group" aria-label="Changed files">
        {SAMPLE_DIFF_FILES.map((f, i) => (
          <button
            key={f.path}
            type="button"
            aria-pressed={fileIdx === i}
            onClick={() => {
              setFileIdx(i);
              setExpanded(false);
            }}
            className={`flex w-full items-center justify-between gap-3 rounded-md border px-2.5 py-2 text-left font-mono transition-colors ${
              fileIdx === i
                ? 'border-border-strong bg-bg-elevated'
                : 'border-border-subtle hover:border-border-default'
            }`}
          >
            <span className="min-w-0 truncate text-[11px] text-text-primary">{f.path}</span>
            <span className="shrink-0 font-mono text-[11px] flex items-center gap-1.5">
              <span className="rounded bg-status-success/10 px-1 py-0.5 text-status-success font-semibold">
                +{counts[i].add}
              </span>
              {counts[i].del > 0 && (
                <span className="rounded bg-status-error/10 px-1 py-0.5 text-status-error font-semibold">
                  −{counts[i].del}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      <div
        key={file.path}
        className="enter code overflow-x-auto rounded-md py-1.5 text-[11px] leading-[1.65]"
      >
        <div className="min-w-max">
          {file.rows.map((r, i) => {
            if (r.t === 'hunk') {
              return (
                <div
                  key={i}
                  className="px-3 py-1 font-mono text-[10.5px] text-status-purple/90 bg-status-purple/10 border-y border-border-subtle"
                >
                  {r.text}
                </div>
              );
            }
            if (r.t === 'gap') {
              return expanded ? (
                r.hidden.map(([n, text]) => (
                  <div key={n} className={`flex ${ROW.ctx}`}>
                    <span className="w-9 shrink-0 select-none pr-2 text-right text-text-muted">
                      {n}
                    </span>
                    <span className="w-4 shrink-0 select-none"> </span>
                    <span className="pr-3">{text || ' '}</span>
                  </div>
                ))
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="my-0.5 flex w-full items-center gap-2 bg-bg-elevated px-3 py-1 text-left text-text-muted transition-colors hover:text-text-primary"
                >
                  <ChevronsUpDown className="h-3 w-3" aria-hidden="true" />
                  Show {r.hidden.length} unchanged lines
                </button>
              );
            }
            return (
              <div key={i} className={`flex ${ROW[r.t]}`}>
                <span className="w-9 shrink-0 select-none pr-2 text-right opacity-60">
                  {r.b ?? r.a}
                </span>
                <span className="w-4 shrink-0 select-none">{SIGN[r.t]}</span>
                <span className="whitespace-pre pr-3">{r.text || ' '}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
