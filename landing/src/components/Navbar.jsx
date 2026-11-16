import { useEffect, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { NAV_LINKS, REPO_URL, SITE } from '../data/landingData';
import useActiveSection from '../hooks/useActiveSection';

const IDS = NAV_LINKS.map(l => l.id);

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveSection(IDS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => e.key === 'Escape' && setOpen(false);
    const onResize = () => window.innerWidth >= 768 && setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const linkClass = id =>
    `relative flex h-full items-center text-sm transition-colors hover:text-text-primary ${
      active === id ? 'text-text-primary' : 'text-text-secondary'
    }`;

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-bg-app/95 backdrop-blur transition-colors duration-200 ${
        scrolled || open ? 'border-border-default' : 'border-border-subtle'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="wrap flex h-14 items-center justify-between">
        <a
          href="#top"
          className="flex min-h-11 items-center gap-2.5"
          aria-label={`${SITE.name}, back to top`}
        >
          <img src="/logo.svg" alt="" width="24" height="24" className="h-6 w-6" />
          <span className="font-mono text-sm font-medium tracking-tight">{SITE.name}</span>
        </a>

        <nav aria-label="Primary" className="hidden h-full items-stretch gap-7 md:flex">
          {NAV_LINKS.map(l => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className={linkClass(l.id)}
              aria-current={active === l.id ? 'location' : undefined}
            >
              {l.label}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 -bottom-px h-0.5 origin-left bg-accent transition-transform duration-300 ease-out ${
                  active === l.id ? 'scale-x-100' : 'scale-x-0'
                }`}
              />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border-default px-3 text-sm text-text-secondary transition-colors hover:border-border-strong hover:bg-bg-elevated hover:text-text-primary"
          >
            GitHub
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen(o => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu: grid-rows animates height without measuring */}
      <div
        id="mobile-nav"
        inert={!open}
        className={`grid transition-[grid-template-rows] duration-300 ease-out md:hidden ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <nav aria-label="Mobile" className="overflow-hidden">
          <ul className="wrap pb-3">
            {NAV_LINKS.map(l => (
              <li key={l.id} className="border-t border-border-subtle first:border-t-0">
                <a
                  href={`#${l.id}`}
                  onClick={() => setOpen(false)}
                  aria-current={active === l.id ? 'location' : undefined}
                  className={`flex min-h-12 items-center justify-between text-base ${
                    active === l.id ? 'text-accent' : 'text-text-primary'
                  }`}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
