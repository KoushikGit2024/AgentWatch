import { Check, Copy, ExternalLink, Monitor, Smartphone, Zap } from 'lucide-react';
import { SETUP_STEPS } from '../data/landingData';
import useCopy from '../hooks/useCopy';

const TAILSCALE_LINKS = [
  {
    platform: 'Windows',
    href: 'https://tailscale.com/download/windows',
    sub: 'tailscale.com',
    icon: Monitor,
  },
  {
    platform: 'iOS',
    href: 'https://apps.apple.com/app/tailscale/id1470499037',
    sub: 'App Store',
    icon: Smartphone,
  },
  {
    platform: 'Android',
    href: 'https://play.google.com/store/apps/details?id=com.tailscale.ipn.android',
    sub: 'Google Play',
    icon: Smartphone,
  },
];

const STEP_COLORS = {
  '01': 'text-status-success',
  '02': 'text-accent',
  '03': 'text-status-purple',
};

function CodeBlock({ lang, code }) {
  const [status, copy] = useCopy();
  return (
    <div className="overflow-hidden rounded-lg border border-border-default">
      <div className="flex items-center justify-between border-b border-border-subtle bg-bg-elevated pl-4 pr-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
          {lang}
        </span>
        <button
          type="button"
          onClick={() => copy(code)}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 font-mono text-xs transition-colors ${
            status === 'copied'
              ? 'text-status-success bg-status-success/10 font-semibold'
              : status === 'failed'
                ? 'text-status-error bg-status-error/10'
                : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {status === 'copied' ? (
            <Check className="h-3.5 w-3.5 text-status-success" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : 'Copy'}
          <span className="sr-only" role="status">
            {status === 'copied' ? 'Command copied to clipboard' : ''}
          </span>
        </button>
      </div>
      <pre className="code border-0 p-4 text-text-primary" tabIndex={0}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function SetupSection() {
  return (
    <section id="setup" aria-labelledby="setup-title" className="section section--surface">
      <div className="wrap grid gap-12 lg:grid-cols-12 lg:gap-16">
        {/* ── Left sidebar ── */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-24" data-reveal>
            <p className="eyebrow">Setup</p>
            <h2 id="setup-title" className="h2">
              Up and running in minutes
            </h2>
            <p className="lede">
              One prerequisite, single-click launch. Double-click{' '}
              <code className="rounded bg-bg-code px-1.5 py-0.5 font-mono text-xs text-status-success font-semibold">
                run.bat
              </code>{' '}
              to configure Python, build the client, auto-detect Antigravity CDP, and serve over
              Tailscale.
            </p>
          </div>
        </div>

        {/* ── Right: prereq + steps in one list ── */}
        <ol className="space-y-12 lg:col-span-8">
          {/* ── Step 00: Tailscale ── */}
          <li className="grid gap-4 sm:grid-cols-[3.5rem_1fr]" data-reveal>
            <span className="font-mono text-2xl text-status-purple" aria-hidden="true">
              00
            </span>
            <div className="min-w-0">
              <h3 className="text-xl font-medium leading-snug">
                <span className="sr-only">Prerequisite: </span>Install Tailscale on both devices
              </h3>
              <p className="mb-4 mt-2 max-w-xl text-[15px] leading-relaxed text-text-secondary">
                AgentWatch reaches your phone over your private Tailscale network. The launcher
                automatically runs{' '}
                <code className="rounded bg-bg-code px-1.5 py-0.5 font-mono text-xs text-status-purple">
                  tailscale serve --bg https / http://127.0.0.1:8000
                </code>{' '}
                to proxy local port 8000 through root{' '}
                <code className="rounded bg-bg-code px-1.5 py-0.5 font-mono text-xs text-text-primary">
                  /
                </code>{' '}
                over secure HTTPS. HTTPS is strictly required by mobile browsers for Web Push
                notifications and PWA service workers.
              </p>
              <div className="flex flex-wrap gap-2">
                {TAILSCALE_LINKS.map(({ platform, href, sub, icon: Icon }) => (
                  <a
                    key={platform}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-elevated px-3 py-2 text-sm transition-colors hover:border-status-purple/40 hover:bg-status-purple/5"
                  >
                    <Icon
                      className="h-3.5 w-3.5 shrink-0 text-status-purple/70 group-hover:text-status-purple"
                      aria-hidden="true"
                    />
                    <span className="font-medium">{platform}</span>
                    <span className="font-mono text-[11px] text-text-muted">{sub}</span>
                    <ExternalLink
                      className="h-3 w-3 shrink-0 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </a>
                ))}
              </div>
              <p className="mt-3 text-xs text-text-muted">
                Desktop CLI quick-install:{' '}
                <code className="rounded bg-bg-code px-1.5 py-0.5 font-mono text-status-purple">
                  winget install Tailscale.Tailscale
                </code>{' '}
                (Windows) or{' '}
                <code className="rounded bg-bg-code px-1.5 py-0.5 font-mono text-status-purple">
                  brew install --cask tailscale
                </code>{' '}
                (macOS).
              </p>
            </div>
          </li>

          {/* ── Steps 01–03 ── */}
          {SETUP_STEPS.map((s, i) => {
            const stepColor = STEP_COLORS[s.step] ?? 'text-accent';
            return (
              <li
                key={s.step}
                className="grid gap-4 sm:grid-cols-[3.5rem_1fr]"
                data-reveal
                style={{ '--d': `${(i + 1) * 50}ms` }}
              >
                <span className={`font-mono text-2xl ${stepColor}`} aria-hidden="true">
                  {s.step}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-xl font-medium leading-snug">
                      <span className="sr-only">Step {i + 1}: </span>
                      {s.title}
                    </h3>
                    {s.step === '01' && (
                      <span className="inline-flex items-center gap-1 rounded border border-status-success/35 bg-status-success/10 px-2 py-0.5 font-mono text-[11px] font-medium text-status-success">
                        <Zap className="h-3 w-3" aria-hidden="true" />
                        1-Click Automated
                      </span>
                    )}
                  </div>
                  <p className="mb-4 mt-2 max-w-xl text-[15px] leading-relaxed text-text-secondary">
                    {s.description}
                  </p>

                  {s.features && (
                    <ul className="mb-4 grid gap-2 rounded-lg border border-border-subtle bg-bg-elevated/40 p-3.5 sm:grid-cols-2">
                      {s.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-xs text-text-secondary">
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-success"
                            aria-hidden="true"
                          />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <CodeBlock lang={s.lang} code={s.code} />
                  {s.note && (
                    <p className="mt-3 text-[13px] leading-relaxed text-text-muted">{s.note}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
