import {
  Bell,
  Database,
  FileCode,
  GitGraph,
  HelpCircle,
  Image,
  ShieldAlert,
  Terminal,
} from 'lucide-react';
import { CAPABILITIES } from '../data/landingData';

const CAP_THEMES = {
  approvals: {
    Icon: ShieldAlert,
    badge: 'border-status-warning/40 bg-status-warning/10 text-status-warning',
    bar: 'bg-status-warning',
    iconColor: 'text-status-warning',
  },
  files: {
    Icon: FileCode,
    badge: 'border-accent/40 bg-accent/10 text-accent',
    bar: 'bg-accent',
    iconColor: 'text-accent',
  },
  git: {
    Icon: GitGraph,
    badge: 'border-status-purple/40 bg-status-purple/10 text-status-purple',
    bar: 'bg-status-purple',
    iconColor: 'text-status-purple',
  },
  terminal: {
    Icon: Terminal,
    badge: 'border-status-success/40 bg-status-success/10 text-status-success',
    bar: 'bg-status-success',
    iconColor: 'text-status-success',
  },
  questions: {
    Icon: HelpCircle,
    badge: 'border-status-error/40 bg-status-error/10 text-status-error',
    bar: 'bg-status-error',
    iconColor: 'text-status-error',
  },
  assets: {
    Icon: Image,
    badge: 'border-accent/40 bg-accent/10 text-accent',
    bar: 'bg-accent',
    iconColor: 'text-accent',
  },
  push: {
    Icon: Bell,
    badge: 'border-status-warning/40 bg-status-warning/10 text-status-warning',
    bar: 'bg-status-warning',
    iconColor: 'text-status-warning',
  },
  sync: {
    Icon: Database,
    badge: 'border-status-purple/40 bg-status-purple/10 text-status-purple',
    bar: 'bg-status-purple',
    iconColor: 'text-status-purple',
  },
};

export default function CapabilitiesSection() {
  return (
    <section id="capabilities" aria-labelledby="cap-title" className="section">
      <div className="wrap grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4 lg:pt-[1px]">
          <div className="lg:sticky lg:top-24" data-reveal>
            <p className="eyebrow">Features</p>
            <h2 id="cap-title" className="h2">
              What you can do from your phone
            </h2>
            <p className="lede">
              What AgentWatch lets you do from your phone when the agent needs you — and while it's
              running.
            </p>
          </div>
        </div>

        <ul className="border-t border-border-default lg:col-span-8">
          {CAPABILITIES.map((c, i) => {
            const theme = CAP_THEMES[c.id] ?? CAP_THEMES.approvals;
            return (
              <li key={c.id} data-reveal style={{ '--d': `${i * 40}ms` }}>
                <article className="group relative grid gap-x-8 gap-y-3 border-b border-border-default py-6 transition-colors hover:bg-bg-surface sm:grid-cols-[1fr_auto] lg:-mx-4 lg:px-4">
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-0.5 origin-center scale-y-0 ${theme.bar} transition-transform duration-300 ease-out group-hover:scale-y-100 group-focus-within:scale-y-100`}
                  />
                  <div>
                    <div className="flex items-center gap-2.5">
                      <theme.Icon
                        className={`h-4 w-4 shrink-0 ${theme.iconColor}`}
                        aria-hidden="true"
                      />
                      <h3 className="text-lg font-medium leading-snug">{c.title}</h3>
                    </div>
                    <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-text-secondary">
                      {c.description}
                    </p>
                  </div>
                  <div className="flex items-start sm:justify-end">
                    <span
                      className={`inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[11px] font-medium ${theme.badge}`}
                    >
                      {c.tech}
                    </span>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
