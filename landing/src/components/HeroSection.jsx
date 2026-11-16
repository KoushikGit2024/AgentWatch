import { ArrowRight } from 'lucide-react';
import PhoneSimulator from './simulator/PhoneSimulator';
import { HERO_CONTENT, REPO_URL } from '../data/landingData';

const FACT_STYLES = {
  Backend: { dot: 'bg-status-success', label: 'text-status-success' },
  'IDE Bridge': { dot: 'bg-accent', label: 'text-accent' },
  Network: { dot: 'bg-status-purple', label: 'text-status-purple' },
  Approvals: { dot: 'bg-status-warning', label: 'text-status-warning' },
};

export default function HeroSection() {
  return (
    <section id="top" aria-labelledby="hero-title" className="pb-16 pt-12 sm:pt-20 lg:pb-28">
      <div className="wrap grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7 lg:pt-6">
          <div
            data-reveal
            className="inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-surface px-3 py-1 font-mono text-xs text-text-secondary"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-status-success" aria-hidden="true" />
            <span>{HERO_CONTENT.meta}</span>
          </div>

          <h1
            id="hero-title"
            data-reveal
            style={{ '--d': '60ms' }}
            className="mt-5 max-w-[16ch] text-[clamp(2.375rem,1.6rem+3.6vw,4.125rem)] font-semibold leading-[1.04] tracking-[-0.03em]"
          >
            Control Google Antigravity <span className="text-accent">from your phone.</span>
          </h1>

          <p
            data-reveal
            style={{ '--d': '120ms' }}
            className="mt-6 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg"
          >
            {HERO_CONTENT.subheadline}
          </p>

          <div
            data-reveal
            style={{ '--d': '180ms' }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <a href="#setup" className="btn btn--primary">
              {HERO_CONTENT.primaryCta}
              <ArrowRight className="btn-arrow h-4 w-4" aria-hidden="true" />
            </a>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
              {HERO_CONTENT.secondaryCta}
            </a>
          </div>

          <dl
            data-reveal
            style={{ '--d': '240ms' }}
            className="mt-14 max-w-xl divide-y divide-border-subtle border-y border-border-subtle"
          >
            {HERO_CONTENT.facts.map(f => {
              const style = FACT_STYLES[f.term] ?? {
                dot: 'bg-text-muted',
                label: 'text-text-muted',
              };
              return (
                <div
                  key={f.term}
                  className="grid grid-cols-[7.5rem_1fr] items-baseline gap-4 py-3.5 text-sm sm:grid-cols-[9rem_1fr]"
                >
                  <dt className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-muted">
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
                    <span>{f.term}</span>
                  </dt>
                  <dd className="text-text-secondary">{f.detail}</dd>
                </div>
              );
            })}
          </dl>
        </div>

        <div
          data-reveal
          style={{ '--d': '150ms' }}
          className="relative flex justify-center lg:col-span-5 lg:justify-end"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-6 -z-10 rounded-full bg-accent/10 blur-3xl"
          />
          <PhoneSimulator />
        </div>
      </div>
    </section>
  );
}
