export const SITE = {
  name: 'AgentWatch',
  version: 'v2.0',
  repoUrl: 'https://github.com/KoushikGit2024/AgentWatch',
  profileUrl: 'https://github.com/KoushikGit2024',
};
export const REPO_URL = SITE.repoUrl;
export const PROFILE_URL = SITE.profileUrl;

export const NAV_LINKS = [
  { id: 'workflow', label: 'Workflow' },
  { id: 'capabilities', label: 'Features' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'security', label: 'Security' },
  { id: 'setup', label: 'Setup' },
];

export const HERO_CONTENT = {
  headline: 'Control Google Antigravity from your phone.',
  subheadline:
    'AgentWatch connects your running Antigravity session to your phone over your private Tailscale network. Review commands, edit workspace files, inspect generated assets, follow live terminal output, and explore Git commit trees — without returning to your workstation.',
  primaryCta: 'Set up AgentWatch',
  secondaryCta: 'View on GitHub',
  facts: [
    { term: 'Backend', detail: 'Runs locally on your workstation. Python 3.12 + FastAPI.' },
    { term: 'IDE Bridge', detail: 'Native for Google Antigravity; compatible with any Chromium-based IDE via CDP.' },
    { term: 'Network', detail: 'Reached over your private authenticated Tailscale tailnet.' },
    { term: 'Approvals', detail: 'Decided by you, explicitly, from your phone.' },
  ],
  meta: 'v2.0 · MIT License',
};

export const WORKFLOW_STEPS = [
  {
    step: '01',
    label: 'Detect',
    title: 'Permission request detected',
    description:
      'AgentWatch monitors the active Antigravity session for permission requests that require your intervention — shell commands, privileged tools, or any action flagged for confirmation.',
    events: [
      ['session', 'Antigravity connected via CDP (port 9000)'],
      ['watch', 'Permission request detected'],
      ['state', 'Waiting for your decision'],
    ],
  },
  {
    step: '02',
    label: 'Notify',
    title: 'Your phone gets an alert',
    description:
      'Web Push notifies registered devices when the agent needs attention. Open AgentWatch to see the command string, flags, working directory, and risk classification.',
    events: [
      ['push', 'Notification delivered to registered device'],
      ['phone', 'Details opened in the mobile client'],
      ['view', 'Inspect command, arguments, and working directory'],
    ],
  },
  {
    step: '03',
    label: 'Decide',
    title: 'You tap Allow or Deny',
    description:
      'Approve the command, reject it, or type a note telling the agent what alternative to take instead. The decision dispatches back through CDP.',
    events: [
      ['phone', 'Decision submitted'],
      ['cdp', 'Decision dispatched to Antigravity via CDP'],
      ['state', 'Session resumes or aborts as instructed'],
    ],
  },
  {
    step: '04',
    label: 'Inspect',
    title: 'Follow output and inspect changes',
    description:
      'Watch terminal output stream in real time, then review resulting file modifications through color-coded unified diffs, right on your phone.',
    events: [
      ['term', 'Terminal output streaming'],
      ['diff', 'Unified diff ready for inspection'],
    ],
  },
];

export const CAPABILITIES = [
  {
    id: 'approvals',
    title: 'Review commands before they run',
    description:
      'See the full command line, arguments, sandbox flags, and working directory before you decide. Deny with a custom note when you want the agent to try a different approach.',
    tech: 'CDP dispatch',
  },
  {
    id: 'files',
    title: 'Remote file viewer & in-place editor',
    description:
      'Browse workspace project directories, inspect source code with line numbers, and make quick edits or fixes directly from your mobile browser.',
    tech: 'File API · In-place edit',
  },
  {
    id: 'git',
    title: 'Interactive Git DAG & unified diffs',
    description:
      'Explore repository commit history, branch structure, and merges in an interactive Git DAG canvas graph alongside color-coded unified line diffs.',
    tech: 'Canvas DAG · Unified diff',
  },
  {
    id: 'terminal',
    title: 'Live session and terminal monitoring',
    description:
      'Follow agent events, tool invocations, shell stdout/stderr, active process IDs, and execution duration counters as they happen.',
    tech: 'WebSockets · Live stdout',
  },
  {
    id: 'questions',
    title: 'Answer interactive questions',
    description:
      'Pick from the options the agent presents, or type a free-form response. Steer agent decision points without returning to your desk.',
    tech: 'Choice disambiguation',
  },
  {
    id: 'assets',
    title: 'Workspace asset & artifact gallery',
    description:
      'Manage generated images, diagrams, design assets, and task artifacts. Inspect assets in a full-screen mobile lightbox gallery and download files.',
    tech: 'Artifact gallery · Lightbox',
  },
  {
    id: 'push',
    title: 'Lock-screen notifications',
    description:
      'Uses the Web Push API and VAPID subscriptions to deliver notifications when the agent needs attention. Availability depends on browser and operating-system push support.',
    tech: 'Web Push · VAPID',
  },
  {
    id: 'sync',
    title: 'Transcripts, task history & session recovery',
    description:
      'Reads locally stored Antigravity conversation transcripts (.jsonl) and SQLite task records for session context, plus an emergency recovery center.',
    tech: 'SQLite · .jsonl · Recovery',
  },
];

export const ARCHITECTURE_LAYERS = [
  {
    layerNumber: '01',
    layerName: 'Your workstation',
    components: [
      {
        id: 'ag',
        name: 'Google Antigravity & Chromium IDEs',
        role: 'Active IDE session running with CDP remote debugging enabled (port 9000). Built on standard Chrome DevTools Protocol—compatible with Antigravity and any Chromium/Electron-based IDE.',
      },
      { id: 'fs', name: 'Local transcripts & SQLite', role: 'Real-time conversation logs (.jsonl) and task execution records on disk.' },
      { id: 'be', name: 'AgentWatch backend', role: 'FastAPI server (:8000). Handles session tracking, state machine, and WebSockets.' },
    ],
  },
  {
    layerNumber: '02',
    layerName: 'Network & notifications',
    components: [
      {
        id: 'ts',
        name: 'Private Tailscale network',
        role: 'Encrypted HTTPS proxy via Tailscale Serve (port 443 -> 8000) with DERP relay fallback.',
      },
      {
        id: 'push',
        name: 'Browser push service (VAPID)',
        role: 'Delivers notifications to wake mobile browsers when human intervention is required.',
      },
    ],
  },
  {
    layerNumber: '03',
    layerName: 'Your phone',
    components: [
      { id: 'pwa', name: 'Mobile Web & PWA interface', role: 'Responsive client communicating with the local backend over your tailnet.' },
      { id: 'disp', name: 'Remote decision dispatch', role: 'Dispatches Allow, Deny, and user responses back into Antigravity via CDP.' },
    ],
  },
];

export const ARCHITECTURE_PATHS = [
  {
    id: 'review',
    label: 'Review',
    summary: 'Antigravity and local files feed the backend, which streams live session updates to your phone over Tailscale.',
    steps: [['ag', 'fs'], ['be'], ['ts'], ['pwa']],
  },
  {
    id: 'notify',
    label: 'Notify',
    summary: 'The local backend triggers a Web Push notification that alerts your phone through the browser push service.',
    steps: [['be'], ['push'], ['pwa']],
  },
  {
    id: 'decide',
    label: 'Decide',
    summary: 'Your decision travels securely from your phone over Tailscale to the backend, then dispatches to Antigravity via CDP.',
    steps: [['pwa', 'disp'], ['ts'], ['be'], ['ag']],
  },
];

export const SECURITY_POINTS = [
  {
    tag: 'Network',
    tone: 'success',
    title: 'Private tailnet access only',
    description:
      'Remote access is scoped to your authenticated Tailscale network. No port-forwarding or public application endpoint required.',
  },
  {
    tag: 'Authorization',
    tone: 'warning',
    title: 'You decide every request',
    description:
      'AgentWatch gives you a clear interface for reviewing permission requests. It never auto-approves a command on your behalf.',
  },
  {
    tag: 'Data handling',
    tone: 'accent',
    title: 'Session data stays on your machine',
    description:
      'Transcripts and task records are read directly from Antigravity’s local storage. AgentWatch does not operate an external cloud database.',
  },
];

export const SETUP_STEPS = [
  {
    step: '01',
    title: '1-Click Launch with run.bat',
    description:
      'Double-click run.bat in your cloned project folder, or run it from the command line. It runs fully automated: provisions the Python .venv, installs dependencies, builds the client, auto-launches Google Antigravity with CDP on port 9000 if not running, and starts the Tailscale HTTPS proxy.',
    lang: 'Batch / CMD',
    code: 'git clone https://github.com/KoushikGit2024/AgentWatch.git\ncd AgentWatch\n.\\run.bat',
    note: 'Double-click run.bat directly in Windows Explorer. It executes with execution-policy bypass and keeps the console window open with clear error diagnostics if a dependency is missing.',
    features: [
      'Auto-detects Python and provisions .venv with requirements.txt',
      'Auto-detects Node.js and builds the frontend with npm',
      'Auto-launches Antigravity IDE with --remote-debugging-port=9000',
      'Configures background Tailscale Serve HTTPS (port 443 → 8000)',
    ],
  },
  {
    step: '02',
    title: 'Open your secure Tailscale URL on your phone',
    description:
      'Open your workstation’s Tailscale HTTPS URL in any mobile browser. Tailscale Serve proxies root / directly to the backend with valid TLS—no port numbers, firewall rules, or router configuration required.',
    lang: 'Mobile browser',
    code: 'https://<your-machine-name>.ts.net',
    note: 'The launcher prints your exact HTTPS URL in the console. You can also run "tailscale serve status" at any time.',
  },
  {
    step: '03',
    title: 'PowerShell or custom flag workflows',
    description:
      'Prefer running in PowerShell directly or starting Antigravity on a custom port? You can run run.ps1 or start Antigravity manually with explicit debugging flags.',
    lang: 'PowerShell',
    code: '# Run the automated PowerShell script\n.\\run.ps1\n\n# Or launch Antigravity manually with custom CDP\n& "C:\\Path\\To\\Antigravity.exe" --remote-debugging-port=9000',
    note: 'AgentWatch communicates over standard Chrome DevTools Protocol (CDP) on ports 9000–9003. While optimized for Google Antigravity, standard CDP support means it can interface with any Chromium- or Electron-based IDE launched with remote debugging enabled.',
  },
];
