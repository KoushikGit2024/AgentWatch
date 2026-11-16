import { ArrowUp, ArrowUpRight } from 'lucide-react';
import { PROFILE_URL, REPO_URL, SITE } from '../data/landingData';

const PRODUCT_LINKS = [
  { href: '#workflow', label: 'Interactive Workflow' },
  { href: '#capabilities', label: 'Command Approvals' },
  { href: '#capabilities', label: 'Remote File Editor' },
  { href: '#capabilities', label: 'Live Session & Terminal' },
  { href: '#capabilities', label: 'Git DAG & Commit Diffs' },
  { href: '#capabilities', label: 'Artifact & Asset Lightbox' },
];

const ARCH_LINKS = [
  { href: '#architecture', label: '3-Tier Architecture' },
  { href: '#security', label: 'Security & Access Model' },
  { href: '#architecture', label: 'CDP Dispatch Protocol' },
  { href: '#setup', label: 'Tailscale Serve HTTPS' },
  { href: '#setup', label: '1-Click Windows Launcher' },
];

const RESOURCE_LINKS = [
  { href: REPO_URL, label: 'GitHub Repository', external: true },
  {
    href: `${REPO_URL}/blob/main/docs/01_ARCHITECTURE.md`,
    label: 'Architecture Guide',
    external: true,
  },
  {
    href: `${REPO_URL}/blob/main/migration/Migration.md`,
    label: 'IDE Migration Docs',
    external: true,
  },
  { href: 'https://tailscale.com/kb/1312/serve', label: 'Tailscale Serve Docs', external: true },
  { href: PROFILE_URL, label: 'Author (@KoushikGit2024)', external: true },
];

export default function Footer() {
  return (
    <footer className="border-t border-border-default bg-bg-code pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-14 text-text-secondary">
      <div className="wrap">
        {/* Top 4-Column Grid */}
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Brand & Summary (Cols 1-5) */}
          <div className="lg:col-span-5">
            <a
              href="#top"
              className="inline-flex items-center gap-2.5 text-text-primary"
              aria-label={`${SITE.name}, back to top`}
            >
              <img
                src="/logo.svg"
                alt=""
                width="26"
                height="26"
                className="h-6.5 w-6.5"
                loading="lazy"
              />
              <span className="font-mono text-base font-semibold tracking-tight">{SITE.name}</span>
              <span className="rounded border border-border-subtle bg-bg-elevated px-2 py-0.5 font-mono text-[10px] text-text-muted">
                {SITE.version}
              </span>
            </a>

            <p className="mt-3.5 max-w-md text-sm leading-relaxed text-text-secondary">
              A local-first, peer-to-peer companion for Google Antigravity and Chromium-based IDEs.
              Review shell commands, edit workspace files, explore Git DAGs, and monitor live
              execution from your phone over your private Tailscale network.
            </p>

            {/* Local-First Trust Indicator */}
            <div className="mt-5 flex items-center gap-2 font-mono text-xs text-text-muted">
              <span className="h-2 w-2 rounded-full bg-status-success" aria-hidden="true" />
              <span>100% Local-first · No external cloud database · MIT License</span>
            </div>
          </div>

          {/* Navigation Links (Cols 6-7) */}
          <nav aria-label="Product Capabilities" className="sm:col-span-4 lg:col-span-2">
            <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              Product
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {PRODUCT_LINKS.map(item => (
                <li key={item.label}>
                  <a href={item.href} className="transition-colors hover:text-text-primary">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Architecture & Security Links (Cols 8-9) */}
          <nav aria-label="Architecture and Security" className="sm:col-span-4 lg:col-span-2">
            <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-status-purple" aria-hidden="true" />
              System
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {ARCH_LINKS.map(item => (
                <li key={item.label}>
                  <a href={item.href} className="transition-colors hover:text-text-primary">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Resources & Docs (Cols 10-12) */}
          <nav aria-label="Documentation and Resources" className="sm:col-span-4 lg:col-span-3">
            <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-status-warning" aria-hidden="true" />
              Resources
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {RESOURCE_LINKS.map(item => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 transition-colors hover:text-text-primary"
                  >
                    <span>{item.label}</span>
                    <ArrowUpRight
                      className="h-3.5 w-3.5 text-text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-text-primary"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom Bar Separator */}
        <div className="mt-12 flex flex-col gap-4 border-t border-border-subtle pt-6 font-mono text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© 2026 AgentWatch</span>
            <span className="text-border-strong">·</span>
            <span>MIT License</span>
            <span className="text-border-strong">·</span>
            <span>Built for Google Antigravity &amp; Chromium IDEs</span>
          </div>

          <a
            href="#top"
            className="inline-flex items-center gap-1.5 text-text-secondary transition-colors hover:text-text-primary"
            aria-label="Scroll back to top of page"
          >
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to top</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
