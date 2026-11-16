import { useMemo, useState } from 'react';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { ARCHITECTURE_LAYERS, ARCHITECTURE_PATHS } from '../data/landingData';

const PATH_THEMES = {
  review: {
    activeBtn: 'bg-accent/15 text-accent border-accent/40 shadow-sm',
    badge: 'bg-accent text-accent-ink',
    activeNode: 'border-accent/60 bg-bg-elevated shadow-[0_0_16px_-4px_rgba(78,168,222,0.2)]',
    calloutBorder: 'border-accent',
    pathText: 'text-accent',
  },
  notify: {
    activeBtn: 'bg-status-purple/15 text-status-purple border-status-purple/40 shadow-sm',
    badge: 'bg-status-purple text-accent-ink',
    activeNode:
      'border-status-purple/60 bg-bg-elevated shadow-[0_0_16px_-4px_rgba(157,140,215,0.2)]',
    calloutBorder: 'border-status-purple',
    pathText: 'text-status-purple',
  },
  decide: {
    activeBtn: 'bg-status-success/15 text-status-success border-status-success/40 shadow-sm',
    badge: 'bg-status-success text-accent-ink',
    activeNode:
      'border-status-success/60 bg-bg-elevated shadow-[0_0_16px_-4px_rgba(72,187,120,0.2)]',
    calloutBorder: 'border-status-success',
    pathText: 'text-status-success',
  },
};

const LAYER_ACCENTS = {
  '01': 'text-accent',
  '02': 'text-status-purple',
  '03': 'text-status-success',
};

export default function ArchitectureSection() {
  const [pathId, setPathId] = useState('review');
  const path = ARCHITECTURE_PATHS.find(p => p.id === pathId);
  const pathTheme = PATH_THEMES[pathId] ?? PATH_THEMES.review;

  // node id -> 1-based position along the selected path
  const order = useMemo(() => {
    const m = {};
    path.steps.forEach((group, i) => group.forEach(id => (m[id] = i + 1)));
    return m;
  }, [path]);

  const names = useMemo(() => {
    const m = {};
    ARCHITECTURE_LAYERS.forEach(l => l.components.forEach(c => (m[c.id] = c.name)));
    return m;
  }, []);

  return (
    <section id="architecture" aria-labelledby="arch-title" className="section section--deep">
      <div className="wrap">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end" data-reveal>
          <div className="max-w-xl">
            <p className="eyebrow">Architecture</p>
            <h2 id="arch-title" className="h2">
              A local backend with a remote interface
            </h2>
            <p className="lede">
              The application backend runs on your own machine. Your phone reaches it over your
              private Tailscale network. Browser push infrastructure may also take part in
              delivering notifications.
            </p>
          </div>

          <div
            role="group"
            aria-label="Highlight a data path"
            className="flex w-full shrink-0 gap-1.5 rounded-lg border border-border-default bg-bg-surface p-1 sm:w-auto"
          >
            {ARCHITECTURE_PATHS.map(p => {
              const active = pathId === p.id;
              const theme = PATH_THEMES[p.id] ?? PATH_THEMES.review;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPathId(p.id)}
                  className={`min-h-10 flex-1 rounded-md border px-4 text-sm font-medium transition-all sm:flex-none ${
                    active
                      ? theme.activeBtn
                      : 'border-transparent text-text-muted hover:border-border-default hover:text-text-secondary'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={`mt-6 min-h-[3.25rem] border-l-2 pl-4 transition-colors duration-300 ${pathTheme.calloutBorder}`}
          aria-live="polite"
        >
          <p className="text-[15px] text-text-secondary">{path.summary}</p>
        </div>

        <div
          className="mt-10 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr]"
          data-reveal
        >
          {ARCHITECTURE_LAYERS.map((layer, li) => (
            <Layer
              key={layer.layerNumber}
              layer={layer}
              order={order}
              pathTheme={pathTheme}
              layerAccent={LAYER_ACCENTS[layer.layerNumber] ?? 'text-accent'}
              showConnector={li < ARCHITECTURE_LAYERS.length - 1}
            />
          ))}
        </div>

        <p className="mt-6 font-mono text-xs leading-relaxed text-text-muted">
          <span className="text-text-secondary">Path:</span>{' '}
          <span className={pathTheme.pathText}>
            {path.steps.map(g => g.map(id => names[id]).join(' + ')).join('  →  ')}
          </span>
        </p>
      </div>
    </section>
  );
}

function Layer({ layer, order, pathTheme, layerAccent, showConnector }) {
  return (
    <>
      <div className="flex flex-col rounded-lg border border-border-default bg-bg-surface">
        <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3 font-mono text-xs">
          <span className={layerAccent}>{layer.layerNumber}</span>
          <span className="uppercase tracking-wider text-text-secondary">{layer.layerName}</span>
        </div>
        <ul className="flex-1 space-y-2 p-3">
          {layer.components.map(c => {
            const n = order[c.id];
            const lit = Boolean(n);
            return (
              <li
                key={c.id}
                className={`relative rounded-md border p-3.5 transition-[opacity,border-color,background-color,box-shadow] duration-300 ${
                  lit
                    ? pathTheme.activeNode + ' opacity-100'
                    : 'border-border-subtle bg-bg-code opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-mono text-[13px] font-medium leading-snug">{c.name}</h3>
                  <span
                    aria-label={lit ? `Step ${n} on this path` : undefined}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold transition-[opacity,transform] duration-300 ${
                      lit ? `${pathTheme.badge} scale-100 opacity-100` : 'scale-50 opacity-0'
                    }`}
                  >
                    {n}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">{c.role}</p>
              </li>
            );
          })}
        </ul>
      </div>
      {showConnector && (
        <div aria-hidden="true" className="flex items-center justify-center text-border-strong">
          <ArrowRight className="hidden h-5 w-5 lg:block" />
          <ArrowDown className="h-5 w-5 lg:hidden" />
        </div>
      )}
    </>
  );
}
