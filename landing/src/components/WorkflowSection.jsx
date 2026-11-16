import { useState } from 'react';
import { WORKFLOW_STEPS } from '../data/landingData';

// Color each event source so the log reads like a real terminal
const SRC_COLOR = {
  session: 'text-status-purple',
  watch: 'text-status-warning',
  state: 'text-text-muted',
  push: 'text-status-purple',
  phone: 'text-accent',
  view: 'text-text-muted',
  cdp: 'text-status-warning',
  term: 'text-status-success',
  diff: 'text-accent',
};

const SRC_GLYPH = {
  session: '◆',
  watch: '◎',
  state: '—',
  push: '◆',
  phone: '→',
  view: '—',
  cdp: '◎',
  term: '▸',
  diff: '→',
};

const STEP_THEMES = [
  {
    activeCircle: 'border-status-warning bg-status-warning text-accent-ink',
    passedCircle: 'border-status-warning/40 bg-status-warning/10 text-status-warning',
    label: 'text-status-warning',
    line: 'bg-status-warning',
    pill: 'bg-status-warning',
    promptStep: 'text-status-warning',
  },
  {
    activeCircle: 'border-status-purple bg-status-purple text-accent-ink',
    passedCircle: 'border-status-purple/40 bg-status-purple/10 text-status-purple',
    label: 'text-status-purple',
    line: 'bg-status-purple',
    pill: 'bg-status-purple',
    promptStep: 'text-status-purple',
  },
  {
    activeCircle: 'border-status-success bg-status-success text-accent-ink',
    passedCircle: 'border-status-success/40 bg-status-success/10 text-status-success',
    label: 'text-status-success',
    line: 'bg-status-success',
    pill: 'bg-status-success',
    promptStep: 'text-status-success',
  },
  {
    activeCircle: 'border-accent bg-accent text-accent-ink',
    passedCircle: 'border-accent/40 bg-accent/10 text-accent',
    label: 'text-accent',
    line: 'bg-accent',
    pill: 'bg-accent',
    promptStep: 'text-accent',
  },
];

export default function WorkflowSection() {
  const [active, setActive] = useState(0);
  const current = WORKFLOW_STEPS[active];
  const currentTheme = STEP_THEMES[active] ?? STEP_THEMES[0];
  const last = WORKFLOW_STEPS.length - 1;

  return (
    <section id="workflow" aria-labelledby="workflow-title" className="section section--surface">
      <div className="wrap">
        <div className="max-w-2xl" data-reveal>
          <p className="eyebrow">Workflow</p>
          <h2 id="workflow-title" className="h2">
            From a paused agent to a decision in your pocket
          </h2>
          <p className="lede">
            What happens when Antigravity stops to ask for confirmation. Click a step to explore it.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-12 lg:gap-14">
          {/* ── Left: step list ── */}
          <ol className="lg:col-span-5" data-reveal>
            {WORKFLOW_STEPS.map((w, i) => {
              const theme = STEP_THEMES[i] ?? STEP_THEMES[0];
              const on = i === active;
              const passed = i < active;
              const isLast = i === last;
              return (
                <li key={w.step} className="relative">
                  {/* Vertical track line */}
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="absolute left-[0.8rem] top-4 -bottom-4 w-px bg-border-default"
                    />
                  )}
                  {/* Filled progress line */}
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-[0.8rem] top-4 -bottom-4 w-px origin-top ${theme.line} transition-transform duration-500 ease-out ${
                        passed ? 'scale-y-100' : 'scale-y-0'
                      }`}
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-expanded={on}
                    aria-controls={`wf-detail-${i}`}
                    className="group relative flex w-full gap-4 py-3.5 text-left"
                  >
                    {/* Step circle */}
                    <span
                      className={`relative z-10 mt-0.5 flex h-[1.6rem] w-[1.6rem] shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold transition-all duration-300 ${
                        on
                          ? theme.activeCircle
                          : passed
                            ? theme.passedCircle
                            : 'border-border-default bg-bg-code text-text-muted group-hover:border-border-strong group-hover:text-text-secondary'
                      }`}
                    >
                      {w.step}
                    </span>

                    <span className="flex-1 pb-1">
                      <span
                        className={`font-mono text-[11px] uppercase tracking-wider transition-colors ${
                          on ? theme.label : 'text-text-muted'
                        }`}
                      >
                        {w.label}
                      </span>
                      <span
                        className={`mt-0.5 block text-[1.0625rem] font-medium leading-snug transition-colors ${
                          on
                            ? 'text-text-primary'
                            : 'text-text-secondary group-hover:text-text-primary'
                        }`}
                      >
                        {w.title}
                      </span>
                    </span>
                  </button>

                  {/* Collapsible description */}
                  <div
                    id={`wf-detail-${i}`}
                    className={`grid pl-10 transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      on ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <p
                      className="overflow-hidden pb-4 text-[15px] leading-relaxed text-text-secondary"
                      aria-hidden={!on}
                    >
                      {w.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* ── Right: event log panel ── */}
          <div className="lg:col-span-7" data-reveal style={{ '--d': '100ms' }}>
            <div className="lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-lg border border-border-default bg-bg-code shadow-lg">
                {/* Panel header */}
                <div className="flex items-center justify-between border-b border-border-default bg-bg-elevated px-4 py-2.5">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="uppercase tracking-wider text-text-muted">Event log</span>
                    <span className="text-border-strong">·</span>
                    <span className={currentTheme.label}>{current.label}</span>
                  </div>
                  {/* Step progress pills */}
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    {WORKFLOW_STEPS.map((w, i) => {
                      const t = STEP_THEMES[i] ?? STEP_THEMES[0];
                      return (
                        <span
                          key={w.step}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === active
                              ? `w-5 ${t.pill}`
                              : i < active
                                ? `w-1.5 ${t.pill} opacity-50`
                                : 'w-1.5 bg-border-default'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Shell prompt */}
                <div className="border-b border-border-subtle px-4 py-2 font-mono text-[11px]">
                  <span className="text-status-success select-none">❯</span>
                  <span className="ml-2 text-text-muted">
                    agentwatch{' '}
                    <span className={currentTheme.promptStep}>--step={current.step}</span>
                  </span>
                </div>

                {/* Event rows */}
                <ul
                  key={active}
                  className="min-h-[9.5rem] p-4 font-mono text-[12.5px] leading-[1.9]"
                  aria-live="polite"
                >
                  {current.events.map(([src, msg], i) => (
                    <li
                      key={msg}
                      className="enter flex items-baseline gap-0"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <span
                        className={`w-[4.5rem] shrink-0 text-right text-[11px] ${SRC_COLOR[src] ?? 'text-text-muted'}`}
                      >
                        {src}
                      </span>
                      <span
                        className={`mx-2.5 shrink-0 select-none text-[11px] ${SRC_COLOR[src] ?? 'text-text-muted'}`}
                      >
                        {SRC_GLYPH[src] ?? '—'}
                      </span>
                      <span className="text-text-primary">{msg}</span>
                    </li>
                  ))}
                </ul>

                {/* Footer */}
                <div className="border-t border-border-subtle bg-bg-elevated px-4 py-2 font-mono text-[11px] text-text-muted">
                  step {current.step} / {String(WORKFLOW_STEPS.length).padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
