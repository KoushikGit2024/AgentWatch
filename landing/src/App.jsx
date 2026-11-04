import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Terminal,
  FolderTree,
  Cpu,
  Globe,
  Workflow,
  Check,
  Copy,
  ArrowUpRight,
  Plus,
  Minus,
  Smartphone,
  Sliders,
  RefreshCw,
} from 'lucide-react';

const REPO = 'https://github.com/KoushikGit2024/AgentWatch';
const PROFILE = 'https://github.com/KoushikGit2024';
const mono = 'font-[JetBrains_Mono,ui-monospace,monospace]';
const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8]';

function GithubIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

/* Interactive particle radar field with electric cyan & emerald highlights */
function SignalField() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const host = cv.parentElement;
    if (!host) return;
    const ctx = cv.getContext('2d');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gap = 24;
    const dims = { w: 0, h: 0 };
    const rafRef = { current: 0 };
    const mouse = { x: -999, y: -999 };

    const size = () => {
      const r = host.getBoundingClientRect(), d = window.devicePixelRatio || 1;
      dims.w = r.width; dims.h = r.height; cv.width = dims.w * d; cv.height = dims.h * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, dims.w, dims.h);
      const sweep = ((t * 0.09) % (dims.w + 300)) - 150;
      for (let y = gap / 2; y < dims.h; y += gap) {
        for (let x = gap / 2; x < dims.w; x += gap) {
          const m = Math.max(0, 1 - Math.hypot(x - mouse.x, y - mouse.y) / 150);
          const s = Math.max(0, 1 - Math.abs(x - sweep) / 70);
          let r = 1.1 + m * 3 + s * 1.6;
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = s > m ? '#34D399' : m > 0.02 ? '#38BDF8' : '#2A303A';
          if (s > 0.02 || m > 0.02) ctx.globalAlpha = 0.45 + Math.max(s, m) * 0.55;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
        }
      }
      if (!still) rafRef.current = requestAnimationFrame(draw);
    };

    const move = (e) => { const r = host.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const leave = () => { mouse.x = mouse.y = -999; };
    size(); draw(0);

    if (still) {
      window.addEventListener('resize', () => { size(); draw(0); });
    } else {
      window.addEventListener('resize', size);
      host.addEventListener('pointermove', move);
      host.addEventListener('pointerleave', leave);
      rafRef.current = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', size);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
    };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none opacity-80" />;
}

const MOMENTS = [
  {
    time: '2:14 a.m.',
    name: 'The connection drops',
    story: 'Your IDE runtime resets or hiccups right in the middle of an intensive multi-file task.',
    result: 'AgentWatch Sentinel intercepts the drop, automatically reconnects without stealing UI focus, and restores your telemetry stream instantly.',
    chip: 'Background Self-Healing Active',
    badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  {
    time: '4:40 p.m.',
    name: 'You step away',
    story: 'You hand the agent a complex multi-file refactor and step away from your workstation.',
    result: 'A live stream parses thinking loops, tool calls, and command outputs, keeping complete session history preserved in browser storage.',
    chip: 'Zero Telemetry Loss',
    badgeColor: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
  },
  {
    time: '6:05 p.m.',
    name: 'It changes a file',
    story: 'The agent edits core logic, and you need to review the line deltas before letting it proceed.',
    result: 'Unified file diffs are extracted with colorized line change indicators (+N emerald, -N rose) and one-click code snippet copying.',
    chip: '+18 added · 3 removed',
    badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  {
    time: '9:30 p.m.',
    name: 'You are on the couch',
    story: 'Your agent is running a long test suite on your main workstation while you are relaxing across the room or away from home.',
    result: 'Access the full AgentWatch dashboard on your phone via secure Tailscale reverse proxy tunnel, overcoming the physical barrier of carrying the device.',
    chip: 'Tailscale Live on Mobile',
    badgeColor: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
  },
];

const FEATURES = [
  {
    icon: Activity,
    title: 'Autonomous Sentinel Engine',
    text: 'Self-healing CDP session manager that preserves agent context.',
    more: 'Non-invasive Chrome DevTools Protocol listener catches errors and socket dropouts, auto-recovering background targets without interfering with your IDE window.',
    accent: 'emerald',
  },
  {
    icon: Terminal,
    title: 'Multi-Tab Persistent Terminal',
    text: 'Every shell tab remembers its directory and draft commands.',
    more: 'Tracks real directory shifts across changed directories, caches unexecuted inputs, and provides inline command history auto-completion.',
    accent: 'sky',
  },
  {
    icon: FolderTree,
    title: 'Monaco File Workspace & Tree',
    text: 'Collapsible explorer panel with syntax highlighting.',
    more: 'Inspect workspace files with an integrated file tree, tabbed Monaco code editor, copy buttons, and line jump navigation.',
    accent: 'cyan',
  },
  {
    icon: Workflow,
    title: 'Unified Diffs & Mermaid Diagrams',
    text: 'Read changes as colorized deltas and dark-mode charts.',
    more: 'Visualizes live markdown, code fences, unified diffs (+N / -M), and interactive dark-mode markdown diagrams directly in the telemetry stream.',
    accent: 'amber',
  },
  {
    icon: Cpu,
    title: 'On-Demand Model Telemetry',
    text: 'Inspect models and effort levels.',
    more: 'Scans active models and effort tiers via CDP without interfering with your workflow.',
    accent: 'purple',
  },
  {
    icon: Globe,
    title: 'Tailscale & Port Tunneling',
    text: 'Monitor long-running tasks seamlessly from any device.',
    more: 'Automatically detects reverse proxies, open server ports, and Tailscale listeners, giving you full remote access on your mobile device without carrying your heavy machine.',
    accent: 'emerald',
  },
];

const EXTENSIBILITY_CARDS = [
  {
    icon: Smartphone,
    title: 'Untether from the Workstation',
    subtitle: 'Overcoming the physical hardware barrier',
    desc: 'Autonomous agent tasks take time. Real-time Tailscale port-forwarding lets you supervise multi-hour coding runs, approve terminal commands, and review file diffs directly from your phone or tablet on the go.',
    tag: 'Remote Mobility',
    color: 'emerald',
  },
  {
    icon: Sliders,
    title: 'Universal Chromium / CDP Foundation',
    subtitle: 'Adapts to any Chrome-based editor or IDE',
    desc: 'AgentWatch communicates via standard Chrome DevTools Protocol over WebSockets. Minor port configurations and target selector tweaks allow it to hook into Cursor, Windsurf, VS Code (Electron), or any Chromium-backed AI editor.',
    tag: 'Universal Protocol',
    color: 'sky',
  },
  {
    icon: RefreshCw,
    title: 'Non-Invasive Live Updates',
    subtitle: 'Zero runtime interference or restart cycles',
    desc: 'Because AgentWatch runs out-of-process as a standalone Python & React daemon, updates to AgentWatch UI, terminal listeners, and telemetry parsers happen in real time without interrupting your active IDE agent workspace.',
    tag: 'Live Upgradable',
    color: 'purple',
  },
];

const STEPS = [
  {
    title: '1. Host PC: Install & Authenticate Tailscale',
    description: 'Tailscale establishes an encrypted WireGuard mesh network across your devices without router port forwarding. Installing the client on your host machine assigns it a persistent MagicDNS hostname, serving as the secure private entry point for remote telemetry.',
    code: 'winget install Tailscale.Tailscale\ntailscale up',
  },
  {
    title: '2. Mobile Device: Install Tailscale & Connect to Mesh',
    description: 'Download the official Tailscale client from the App Store or Google Play and sign in using the identical identity provider as your PC. Turning on the VPN connects your mobile device directly to your private Tailnet, allowing your phone to resolve your computer securely.',
    code: '# On your iOS or Android phone:\n# 1. Install Tailscale from App Store or Google Play\n# 2. Sign in with the exact same account as your PC\n# 3. Toggle the VPN switch to Connected',
  },
  {
    title: '3. Enable HTTPS Reverse Proxy (tailscale serve)',
    description: 'Modern mobile browsers enforce strict HTTPS origins for Service Workers, push notifications, and streaming WebSockets. Running Tailscale Serve provisions with trusted TLS certificates for your machine and directs encrypted traffic to AgentWatch\'s backend port 8000.',
    code: 'tailscale serve --bg https / http://127.0.0.1:8000\ntailscale serve status',
  },
  {
    title: '4. Clone & Set Up the AgentWatch Repository',
    description: 'Fetch the complete AgentWatch repository onto your workstation. This contains the CDP sentinel engine, multi-tab persistent terminal runner, file tree explorer, and the modern browser interface.',
    code: 'git clone https://github.com/KoushikGit2024/AgentWatch.git && cd AgentWatch',
  },
  {
    title: '5. Initialize Python (3.10+) Virtual Environment',
    description: 'Create an isolated virtual environment and install the required dependencies (FastAPI, WebSockets, uvicorn, watchdog, httpx). This ensures all runtime libraries remain self-contained without altering your global Python packages.',
    code: 'python -m venv .venv && .\\.venv\\Scripts\\activate && pip install -r requirements.txt',
  },
  {
    title: '6. Launch Mission Control & Connect Remotely',
    description: 'With your IDE open, launch the runner script. AgentWatch attaches non-invasively to the IDE over port 9000 and starts the telemetry daemon. Open your machine\'s Tailscale HTTPS address in your mobile browser to supervise your agent untethered from anywhere.',
    code: '.\\run.bat\n# Open on your mobile phone browser:\n# https://<your-machine>.ts.net',
  },
];

const REQUIREMENTS = [
  ['Operating System', 'Windows 10/11 (PowerShell 5.1+ or PowerShell 7)'],
  ['Python Runtime', 'Python 3.10, 3.11, 3.12, or 3.13'],
  ['Target IDE', 'Google Antigravity IDE (or any Chromium IDE with --remote-debugging-port)'],
  ['Remote Networking', 'Tailscale account & client (free tier supported on PC & Mobile)'],
  ['Local Database', 'MongoDB 6.0+ (optional: auto-fallback exists if absent)'],
  ['License', 'MIT Open Source'],
];

const NAV = [
  ['Remote Access', '#remote'],
  ['Moments', '#moments'],
  ['Features', '#features'],
  ['Setup', '#setup'],
  ['About', '#about'],
];

function Section({ id, title, intro, children }) {
  return (
    <section id={id} className="scroll-mt-16 border-t border-[#262A30] py-16 sm:py-24 grid lg:grid-cols-[280px_1fr] gap-8 lg:gap-16">
      <div className="lg:sticky lg:top-24 self-start space-y-2">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#F1F3F5]">{title}</h2>
        {intro && <p className="text-[15px] text-[#A6ADB8] leading-relaxed max-w-xs">{intro}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}

export default function App() {
  const [copied, setCopied] = useState(null);
  const [moment, setMoment] = useState(0);
  const [open, setOpen] = useState(0);
  const [done, setDone] = useState([false, false, false, false, false, false]);
  const [scroll, setScroll] = useState(0);
  const count = done.filter(Boolean).length;

  useEffect(() => {
    const on = () => {
      const d = document.documentElement;
      setScroll(d.scrollTop / Math.max(1, d.scrollHeight - d.clientHeight));
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const copy = async (text, i) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setDone(prev => {
        const next = [...prev];
        next[i] = true;
        return next;
      });
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard write error */
    }
  };

  const momentKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      setMoment((moment + 1) % MOMENTS.length);
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setMoment((moment + MOMENTS.length - 1) % MOMENTS.length);
    }
  };

  const m = MOMENTS[moment];

  return (
    <div className="min-h-screen bg-[#101113] text-[#E8EAED] font-[Inter,system-ui,sans-serif] antialiased selection:bg-[#38BDF8]/20 selection:text-sky-200">
      {/* Top Scroll Indicator */}
      <div className="fixed top-0 left-0 right-0 h-0.5 z-50 bg-transparent" aria-hidden="true">
        <div className="h-full bg-[#38BDF8] transition-all duration-150" style={{ width: `${scroll * 100}%` }} />
      </div>

      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:px-3 focus:py-2 focus:bg-[#1D2024] focus:rounded">
        Skip to content
      </a>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#262A30] bg-[#141619]/95 backdrop-blur">
        <div className="max-w-6xl mx-auto h-14 px-5 sm:px-8 flex items-center justify-between gap-4">
          <a href="#main" className={`flex items-center gap-2.5 rounded ${ring}`} aria-label="AgentWatch home">
            <div className="w-7 h-7 rounded-md bg-[#181D24] border border-[#2D3542] flex items-center justify-center p-0.5 overflow-hidden">
              <img src="/logo.svg" alt="" className="w-full h-full object-contain" />
            </div>
            <span className="font-semibold tracking-tight text-[#F1F3F5]">AgentWatch</span>
            <span className={`text-[11px] font-medium text-[#38BDF8] border border-[#38BDF8]/35 bg-[#38BDF8]/10 rounded px-1.5 py-px ${mono}`}>
              v2.0
            </span>
          </a>

          <div className="flex items-center gap-1 sm:gap-2">
            <nav aria-label="Primary" className="hidden md:flex">
              {NAV.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded text-sm text-[#A6ADB8] hover:text-[#F1F3F5] transition-colors ${ring}`}
                >
                  {label}
                </a>
              ))}
            </nav>
            <a
              href={REPO}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md border border-[#343B45] bg-[#17191C] hover:bg-[#20242B] text-sm text-[#E8EAED] transition-colors ${ring}`}
            >
              <GithubIcon />
              <span>GitHub</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#747C87]" aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-[#262A30]">
          <SignalField />
          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-24 sm:pt-36 pb-24 sm:pb-36 pointer-events-none">
            <h1 className="text-[2.9rem] sm:text-7xl lg:text-[5.5rem] font-semibold tracking-[-0.04em] leading-[1.08] sm:leading-[1.05] max-w-4xl text-[#F8FAFC]">
              <span className="block">Leave the agent running.</span>
              <span className="block text-[#38BDF8]">Stay in the loop.</span>
            </h1>

            <p className="mt-8 text-lg sm:text-xl text-[#A6ADB8] leading-relaxed max-w-2xl">
              AgentWatch sits beside your editor and tracks your AI agent's activity while it writes, edits and runs code. It connects from the outside through your mobile or any network accessible device with a secure private network.
            </p>

            <div className="mt-10 flex flex-wrap gap-3 pointer-events-auto">
              <a
                href="#setup"
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-md bg-[#0284C7] hover:bg-[#0369A1] text-white font-medium shadow-md transition-colors ${ring}`}
              >
                <Terminal className="w-4 h-4" aria-hidden="true" />
                <span>Quickstart guide</span>
              </a>
              <a
                href="#remote"
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-md border border-[#38BDF8]/40 bg-[#141619] hover:bg-[#182029] text-[#38BDF8] font-medium transition-colors ${ring}`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Remote Mobility</span>
              </a>
              <a
                href={REPO}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-md border border-[#343B45] bg-[#141619] hover:bg-[#1E2228] text-[#E8EAED] font-medium transition-colors ${ring}`}
              >
                <GithubIcon />
                <span>Star on GitHub</span>
              </a>
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          {/* Remote Access & Universal IDE Philosophy Section */}
          <Section
            id="remote"
            title="Untethered Agent Control"
            intro="Why carry heavy hardware when autonomous agents can run on your workstation while you supervise remotely?"
          >
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                {EXTENSIBILITY_CARDS.map((card, idx) => {
                  const IconComponent = card.icon;
                  const tagColor = card.color === 'emerald' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : card.color === 'sky' ? 'text-sky-400 border-sky-500/30 bg-sky-500/10' : 'text-purple-400 border-purple-500/30 bg-purple-500/10';
                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-[#2D3542] bg-[#17191C] hover:border-[#384252] p-5 flex flex-col justify-between space-y-4 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="w-9 h-9 rounded-md bg-[#121417] border border-[#2D3542] flex items-center justify-center text-[#38BDF8]">
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${tagColor}`}>
                            {card.tag}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-[#F1F3F5] tracking-tight">{card.title}</h3>
                        <p className="text-xs font-mono text-[#747C87]">{card.subtitle}</p>
                        <p className="text-xs text-[#A6ADB8] leading-relaxed">{card.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Architecture Blueprint Card: Adapting to Any Chromium IDE */}
              <div className="rounded-lg border border-[#30343A] bg-[#141619] p-5 sm:p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#38BDF8]" />
                  <h4 className="text-sm font-semibold text-[#F1F3F5] tracking-tight">How It Adapts to Other Chrome/Electron-based IDEs</h4>
                </div>
                <p className="text-xs text-[#A6ADB8] leading-relaxed">
                  Antigravity, Cursor, Windsurf, and VS Code all share a Chromium architecture. Because AgentWatch connects over standard <span className="text-[#38BDF8] font-mono">--remote-debugging-port</span>, tweaking the port target in <code className={`text-[11px] text-emerald-400 ${mono}`}>integrations/antigravity/cdp_actions.py</code> allows the same telemetry engine, persistent terminal, and self-healing sentinels to observe and control any AI agent editor.
                </p>
              </div>
            </div>
          </Section>

          {/* Moments Section */}
          <Section id="moments" title="One day with an autonomous agent" intro="Pick a moment to see how AgentWatch protects your workflow.">
            <div className="grid md:grid-cols-[250px_1fr] gap-6">
              <div role="tablist" aria-label="Moments" aria-orientation="vertical" onKeyDown={momentKey} className="flex md:flex-col gap-2 overflow-x-auto">
                {MOMENTS.map((x, i) => (
                  <button
                    key={x.name}
                    role="tab"
                    type="button"
                    aria-selected={i === moment}
                    tabIndex={i === moment ? 0 : -1}
                    onClick={() => setMoment(i)}
                    className={`text-left shrink-0 px-4 py-3 rounded-md border transition-colors ${ring} ${
                      i === moment
                        ? 'border-[#38BDF8] bg-[#181D24] text-[#F1F3F5]'
                        : 'border-[#262A30] bg-[#141619] text-[#A6ADB8] hover:border-[#384252] hover:text-[#E8EAED]'
                    }`}
                  >
                    <span className={`block text-xs text-[#38BDF8] ${mono}`}>{x.time}</span>
                    <span className="block text-[15px] font-medium mt-0.5">{x.name}</span>
                  </button>
                ))}
              </div>

              <div role="tabpanel" key={moment} className="rounded-lg border border-[#30343A] bg-[#17191C] p-6 sm:p-8 flex flex-col justify-between min-h-[280px]">
                <div>
                  <p className="text-lg text-[#A6ADB8] leading-relaxed">{m.story}</p>
                  <p className="mt-6 text-xl sm:text-2xl font-medium tracking-tight leading-snug text-[#F8FAFC]">
                    {m.result}
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium ${m.badgeColor}`}>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    {m.chip}
                  </span>
                </div>
              </div>
            </div>
          </Section>

          {/* Features Accordion */}
          <Section id="features" title="Engineered for reliability" intro="Click any capability to expand architecture details.">
            <div className="border-b border-[#262A30]">
              {FEATURES.map(({ icon: I, title, text, more, accent }, i) => {
                const on = open === i;
                const accentColor = accent === 'emerald' ? 'text-emerald-400' : accent === 'sky' ? 'text-sky-400' : accent === 'cyan' ? 'text-cyan-400' : accent === 'purple' ? 'text-purple-400' : 'text-amber-400';
                return (
                  <div key={title} className="border-t border-[#262A30]">
                    <h3>
                      <button
                        type="button"
                        aria-expanded={on}
                        aria-controls={`f${i}`}
                        onClick={() => setOpen(on ? -1 : i)}
                        className={`group w-full flex items-center gap-4 py-5 text-left transition-colors ${ring}`}
                      >
                        <span
                          className={`w-10 h-10 shrink-0 rounded-md border flex items-center justify-center transition-colors ${
                            on
                              ? 'border-[#38BDF8] bg-[#181D24] text-[#38BDF8]'
                              : 'border-[#2D3542] bg-[#141619] text-[#747C87] group-hover:border-[#38BDF8]/50 group-hover:text-[#A6ADB8]'
                          }`}
                        >
                          <I className={`w-5 h-5 ${on ? accentColor : ''}`} aria-hidden="true" />
                        </span>
                        <span className="flex-1">
                          <span className={`block text-lg font-semibold tracking-tight ${on ? 'text-[#F1F3F5]' : 'text-[#E8EAED]'}`}>
                            {title}
                          </span>
                          <span className="block text-sm text-[#747C87] mt-0.5">{text}</span>
                        </span>
                        {on ? (
                          <Minus className="w-4 h-4 text-[#38BDF8]" aria-hidden="true" />
                        ) : (
                          <Plus className="w-4 h-4 text-[#747C87] group-hover:text-[#A6ADB8]" aria-hidden="true" />
                        )}
                      </button>
                    </h3>
                    {on && (
                      <p id={`f${i}`} className="pl-14 pb-6 pr-8 text-[15px] text-[#A6ADB8] leading-relaxed max-w-xl">
                        {more}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Quickstart Checklist Setup */}
          <Section
            id="setup"
            title="Complete Setup & Remote Mobile Access"
            intro="A step-by-step verified workflow to set up AgentWatch, establish secure Tailscale mesh routing, configure HTTPS serve, and supervise your AI agent untethered from your mobile phone."
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-2 rounded bg-[#1E232B] overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={6} aria-valuenow={count} aria-label="Setup progress">
                <div
                  className="h-full rounded bg-emerald-400 transition-all duration-300"
                  style={{ width: `${(count / 6) * 100}%` }}
                />
              </div>
              <span className={`text-xs text-emerald-400 font-semibold ${mono}`}>{count} of 6 complete</span>
            </div>

            <ol className="space-y-4">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className={`rounded-lg border p-5 transition-colors ${
                    done[i]
                      ? 'border-emerald-500/40 bg-[#141B17]'
                      : 'border-[#262A30] bg-[#17191C] hover:border-[#303845]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={done[i]}
                      aria-label={`Mark step ${i + 1} complete`}
                      onClick={() => setDone(done.map((d, j) => (j === i ? !d : d)))}
                      className={`w-7 h-7 shrink-0 rounded-full border flex items-center justify-center transition-colors ${ring} ${
                        done[i]
                          ? 'bg-emerald-400 border-emerald-400 text-[#101113]'
                          : 'border-[#384252] text-[#747C87] hover:border-[#38BDF8] hover:text-[#38BDF8]'
                      }`}
                    >
                      {done[i] ? <Check className="w-4 h-4 font-bold" /> : <span className={`text-xs ${mono}`}>{i + 1}</span>}
                    </button>
                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className={`text-lg font-semibold tracking-tight ${done[i] ? 'text-emerald-300' : 'text-[#F1F3F5]'}`}>
                        {s.title}
                      </h3>

                      <p className="text-sm text-[#A6ADB8] leading-relaxed">
                        {s.description}
                      </p>

                      <div className="mt-3 flex items-start gap-3 rounded-md bg-[#101113] border border-[#262A30] pl-4 pr-2 py-2.5">
                        <code className={`flex-1 pt-1 text-[13px] break-all text-[#38BDF8] ${mono}`}>{s.code}</code>
                        <button
                          type="button"
                          onClick={() => copy(s.code, i)}
                          aria-label={`Copy command for step ${i + 1}`}
                          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#343B45] text-xs hover:bg-[#1D2024] transition-colors ${ring} ${
                            copied === i ? 'text-emerald-400 border-emerald-500/40' : 'text-[#A6ADB8]'
                          }`}
                        >
                          {copied === i ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <p className={`mt-6 text-[15px] font-medium transition-colors ${count === 6 ? 'text-emerald-400' : 'text-[#747C87]'}`} role="status">
              {count === 6 ? '✓ All set. AgentWatch is running and fully accessible from your mobile phone.' : 'Follow each step, run the commands, and tick each step when finished.'}
            </p>
          </Section>

          {/* Project & Creator Profile */}
          <Section id="about" title="Creator & Requirements">
            <p className="text-xl sm:text-2xl leading-snug tracking-tight font-medium text-[#F1F3F5] max-w-2xl">
              AgentWatch is built and maintained by <span className="text-[#38BDF8]">Koushik Kar</span>, specializing in AI agent telemetry, non-invasive runtime observability, and full-stack systems.
            </p>
            <p className="mt-4 text-[15px] text-[#A6ADB8] leading-relaxed max-w-2xl">
              Fully open source and MIT licensed. You can inspect every line, self-host with zero external telemetry, or contribute on GitHub.
            </p>
            <a
              href={PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-6 inline-flex items-center gap-2 text-sm text-[#38BDF8] hover:text-sky-300 transition-colors rounded ${ring}`}
            >
              <GithubIcon />
              <span>Koushik on GitHub</span>
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>

            <div className="mt-10 max-w-2xl">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#38BDF8] font-mono mb-3">
                System & Runtime Requirements
              </h3>
              <dl>
                {REQUIREMENTS.map(([k, v]) => (
                  <div key={k} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-8 py-3.5 border-t border-[#262A30] hover:border-[#384252] transition-colors">
                    <dt className="sm:w-48 text-sm text-[#747C87]">{k}</dt>
                    <dd className={`text-sm text-[#E8EAED] ${mono}`}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#262A30] bg-[#141619]">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-[#747C87]">
          <span>© 2026 Koushik Kar. Released under the MIT license.</span>
          <span className="flex gap-5">
            <a href={REPO} target="_blank" rel="noopener noreferrer" className={`hover:text-[#F1F3F5] transition-colors rounded ${ring}`}>
              Repository
            </a>
            <a href={PROFILE} target="_blank" rel="noopener noreferrer" className={`hover:text-[#F1F3F5] transition-colors rounded ${ring}`}>
              Author
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
