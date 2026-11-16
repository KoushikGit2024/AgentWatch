# AgentWatch landing page

React 19 + Vite + Tailwind CSS 4. The production build is pre-rendered to static HTML and hydrated on load.

```bash
npm install
npm run dev        # local dev server
npm run build      # build + pre-render into dist/
npm run preview    # serve dist/
npm run lint       # oxlint
```

## SEO configuration

Canonical URL, `og:url`, `og:image`, the JSON-LD `url` and `sitemap.xml` need your real domain.
Copy `.env.example` to `.env` and set it before building:

```
VITE_SITE_URL=https://your-domain.example
```

Without it the build still works and those tags are simply left out (nothing is guessed).
`robots.txt` is always generated.

## Structure

- `src/data/landingData.js` – all page copy and facts (single source of truth)
- `src/data/simulatorData.js` – sample data for the hero simulation (not real session data)
- `src/components/` – one component per section
- `src/components/simulator/` – the phone simulation (approval, question, terminal, diff)
- `src/hooks/` – active-section tracking, scroll reveal, copy, reduced-motion
- `src/index.css` – design tokens (`@theme`), shared component classes, motion rules
- `scripts/prerender.mjs` – injects server-rendered HTML into `dist/index.html`

## Design tokens

Neutrals are warm near-black. Sky (`accent`) is the brand/interactive colour and matches the logo.
Amber means a decision is waiting, green means allowed or finished, red means denied.
All text colours meet WCAG AA on every surface.

## Honesty notes

The phone in the hero and the "Example events" log are labelled simulations with sample data.
Nothing on the page connects to a backend.
