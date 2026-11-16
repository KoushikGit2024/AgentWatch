import { HardDrive, ShieldCheck, UserCheck } from 'lucide-react';
import { REPO_URL, SECURITY_POINTS } from '../data/landingData';

const TONE = {
  success: {
    Icon: ShieldCheck,
    pill: 'border-status-success/40 bg-status-success/10 text-status-success',
    bar: 'bg-status-success',
  },
  warning: {
    Icon: UserCheck,
    pill: 'border-status-warning/40 bg-status-warning/10 text-status-warning',
    bar: 'bg-status-warning',
  },
  accent: {
    Icon: HardDrive,
    pill: 'border-accent/40 bg-accent/10 text-accent',
    bar: 'bg-accent',
  },
};

export default function SecuritySection() {
  return (
    <section id="security" aria-labelledby="sec-title" className="section">
      <div className="wrap">
        <div className="max-w-3xl" data-reveal>
          <p className="eyebrow">Security</p>
          <h2 id="sec-title" className="h2">
            Built to stay on your network
          </h2>
        </div>

        <div className="mt-14 divide-y divide-border-default border-y border-border-default">
          {SECURITY_POINTS.map((s, i) => {
            const tone = TONE[s.tone] ?? TONE.accent;
            return (
              <article
                key={s.title}
                data-reveal
                style={{ '--d': `${i * 60}ms` }}
                className="group relative grid gap-4 py-8 transition-colors hover:bg-bg-surface md:grid-cols-12 md:gap-8 lg:-mx-4 lg:px-4"
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 w-0.5 origin-center scale-y-0 ${tone.bar} transition-transform duration-300 ease-out group-hover:scale-y-100`}
                />
                <div className="self-start md:col-span-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider font-medium ${tone.pill}`}
                  >
                    <tone.Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{s.tag}</span>
                  </span>
                </div>
                <h3 className="text-xl font-medium leading-snug md:col-span-4">{s.title}</h3>
                <p className="text-[15px] leading-relaxed text-text-secondary md:col-span-5">
                  {s.description}
                </p>
              </article>
            );
          })}
        </div>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-text-muted" data-reveal>
          AgentWatch is MIT licensed. These points describe the design, and you can{' '}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4 hover:text-accent-hover"
          >
            read the source
          </a>{' '}
          to check them.
        </p>
      </div>
    </section>
  );
}
