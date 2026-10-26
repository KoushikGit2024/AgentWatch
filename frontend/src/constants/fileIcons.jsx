import React from 'react';
import {
  File,
  FileCode,
  FileCode2,
  FileText,
  FileJson,
  FileSpreadsheet,
  FileSliders,
  Database,
  Terminal,
  Image,
  Video,
  Music,
  Archive,
  Settings,
  Globe,
  Key,
  Cpu,
  Boxes,
  GitBranch,
  Code,
  Code2,
  Layers,
  Package,
  Binary,
  BookOpen,
} from 'lucide-react';

/**
 * File extension configuration mapping to Lucide icon, colors, and friendly names.
 */
const EXTENSION_MAP = {
  // Python
  py: {
    icon: FileCode2,
    color: 'text-amber-400',
    bg: 'bg-amber-950/40 border-amber-800/50',
    label: 'Python',
  },
  pyw: {
    icon: FileCode2,
    color: 'text-amber-400',
    bg: 'bg-amber-950/40 border-amber-800/50',
    label: 'Python',
  },
  ipynb: {
    icon: BookOpen,
    color: 'text-amber-500',
    bg: 'bg-amber-950/40 border-amber-800/50',
    label: 'Jupyter',
  },

  // JavaScript / TypeScript / React
  jsx: {
    icon: Code2,
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/40 border-cyan-800/50',
    label: 'React JSX',
  },
  tsx: {
    icon: Code2,
    color: 'text-cyan-300',
    bg: 'bg-cyan-950/40 border-cyan-800/50',
    label: 'React TSX',
  },
  js: {
    icon: FileCode,
    color: 'text-yellow-400',
    bg: 'bg-yellow-950/40 border-yellow-800/50',
    label: 'JavaScript',
  },
  mjs: {
    icon: FileCode,
    color: 'text-yellow-400',
    bg: 'bg-yellow-950/40 border-yellow-800/50',
    label: 'JavaScript',
  },
  cjs: {
    icon: FileCode,
    color: 'text-yellow-400',
    bg: 'bg-yellow-950/40 border-yellow-800/50',
    label: 'JavaScript',
  },
  ts: {
    icon: FileCode2,
    color: 'text-blue-400',
    bg: 'bg-blue-950/40 border-blue-800/50',
    label: 'TypeScript',
  },
  mts: {
    icon: FileCode2,
    color: 'text-blue-400',
    bg: 'bg-blue-950/40 border-blue-800/50',
    label: 'TypeScript',
  },
  cts: {
    icon: FileCode2,
    color: 'text-blue-400',
    bg: 'bg-blue-950/40 border-blue-800/50',
    label: 'TypeScript',
  },

  // Web Markup & Styling
  html: {
    icon: Globe,
    color: 'text-orange-400',
    bg: 'bg-orange-950/40 border-orange-800/50',
    label: 'HTML',
  },
  htm: {
    icon: Globe,
    color: 'text-orange-400',
    bg: 'bg-orange-950/40 border-orange-800/50',
    label: 'HTML',
  },
  css: { icon: Layers, color: 'text-sky-400', bg: 'bg-sky-950/40 border-sky-800/50', label: 'CSS' },
  scss: {
    icon: Layers,
    color: 'text-pink-400',
    bg: 'bg-pink-950/40 border-pink-800/50',
    label: 'SCSS',
  },
  sass: {
    icon: Layers,
    color: 'text-pink-400',
    bg: 'bg-pink-950/40 border-pink-800/50',
    label: 'Sass',
  },
  less: {
    icon: Layers,
    color: 'text-indigo-400',
    bg: 'bg-indigo-950/40 border-indigo-800/50',
    label: 'Less',
  },
  vue: {
    icon: Code2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40 border-emerald-800/50',
    label: 'Vue',
  },
  svelte: {
    icon: Code2,
    color: 'text-orange-500',
    bg: 'bg-orange-950/40 border-orange-800/50',
    label: 'Svelte',
  },

  // Data, Config & Serialization
  json: {
    icon: FileJson,
    color: 'text-amber-300',
    bg: 'bg-amber-950/40 border-amber-800/50',
    label: 'JSON',
  },
  jsonc: {
    icon: FileJson,
    color: 'text-amber-300',
    bg: 'bg-amber-950/40 border-amber-800/50',
    label: 'JSON',
  },
  json5: {
    icon: FileJson,
    color: 'text-amber-300',
    bg: 'bg-amber-950/40 border-amber-800/50',
    label: 'JSON',
  },
  yaml: {
    icon: FileSliders,
    color: 'text-purple-400',
    bg: 'bg-purple-950/40 border-purple-800/50',
    label: 'YAML',
  },
  yml: {
    icon: FileSliders,
    color: 'text-purple-400',
    bg: 'bg-purple-950/40 border-purple-800/50',
    label: 'YAML',
  },
  toml: {
    icon: Settings,
    color: 'text-zinc-300',
    bg: 'bg-zinc-900 border-zinc-700/60',
    label: 'TOML',
  },
  xml: {
    icon: Code,
    color: 'text-orange-400',
    bg: 'bg-orange-950/40 border-orange-800/50',
    label: 'XML',
  },
  svg: {
    icon: Image,
    color: 'text-amber-400',
    bg: 'bg-amber-950/40 border-amber-800/50',
    label: 'SVG',
  },
  ini: {
    icon: Settings,
    color: 'text-zinc-400',
    bg: 'bg-zinc-900 border-zinc-700/60',
    label: 'Config',
  },
  cfg: {
    icon: Settings,
    color: 'text-zinc-400',
    bg: 'bg-zinc-900 border-zinc-700/60',
    label: 'Config',
  },
  conf: {
    icon: Settings,
    color: 'text-zinc-400',
    bg: 'bg-zinc-900 border-zinc-700/60',
    label: 'Config',
  },
  env: {
    icon: Key,
    color: 'text-yellow-400',
    bg: 'bg-yellow-950/40 border-yellow-800/50',
    label: 'Env',
  },

  // Documentation
  md: {
    icon: BookOpen,
    color: 'text-blue-400',
    bg: 'bg-blue-950/40 border-blue-800/50',
    label: 'Markdown',
  },
  markdown: {
    icon: BookOpen,
    color: 'text-blue-400',
    bg: 'bg-blue-950/40 border-blue-800/50',
    label: 'Markdown',
  },
  mdx: {
    icon: BookOpen,
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/40 border-cyan-800/50',
    label: 'MDX',
  },
  txt: { icon: FileText, color: 'text-zinc-400', bg: 'bg-zinc-900 border-zinc-800', label: 'Text' },
  log: { icon: FileText, color: 'text-zinc-500', bg: 'bg-zinc-900 border-zinc-800', label: 'Log' },
  pdf: {
    icon: FileText,
    color: 'text-rose-500',
    bg: 'bg-rose-950/40 border-rose-800/50',
    label: 'PDF',
  },

  // Shell Scripts
  sh: {
    icon: Terminal,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40 border-emerald-800/50',
    label: 'Shell',
  },
  bash: {
    icon: Terminal,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40 border-emerald-800/50',
    label: 'Bash',
  },
  zsh: {
    icon: Terminal,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40 border-emerald-800/50',
    label: 'Zsh',
  },
  ps1: {
    icon: Terminal,
    color: 'text-blue-400',
    bg: 'bg-blue-950/40 border-blue-800/50',
    label: 'PowerShell',
  },
  bat: {
    icon: Terminal,
    color: 'text-amber-400',
    bg: 'bg-amber-950/40 border-amber-800/50',
    label: 'Batch',
  },
  cmd: {
    icon: Terminal,
    color: 'text-amber-400',
    bg: 'bg-amber-950/40 border-amber-800/50',
    label: 'CMD',
  },

  // Systems & Backend
  rs: {
    icon: Cpu,
    color: 'text-orange-500',
    bg: 'bg-orange-950/40 border-orange-800/50',
    label: 'Rust',
  },
  go: {
    icon: FileCode2,
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/40 border-cyan-800/50',
    label: 'Go',
  },
  c: {
    icon: FileCode,
    color: 'text-blue-500',
    bg: 'bg-blue-950/40 border-blue-800/50',
    label: 'C',
  },
  h: {
    icon: FileCode,
    color: 'text-blue-400',
    bg: 'bg-blue-950/40 border-blue-800/50',
    label: 'C Header',
  },
  cpp: {
    icon: FileCode2,
    color: 'text-blue-400',
    bg: 'bg-blue-950/40 border-blue-800/50',
    label: 'C++',
  },
  hpp: {
    icon: FileCode2,
    color: 'text-blue-300',
    bg: 'bg-blue-950/40 border-blue-800/50',
    label: 'C++ Header',
  },
  cs: {
    icon: Code2,
    color: 'text-violet-400',
    bg: 'bg-violet-950/40 border-violet-800/50',
    label: 'C#',
  },
  java: {
    icon: FileCode,
    color: 'text-red-400',
    bg: 'bg-red-950/40 border-red-800/50',
    label: 'Java',
  },
  kt: {
    icon: FileCode,
    color: 'text-purple-400',
    bg: 'bg-purple-950/40 border-purple-800/50',
    label: 'Kotlin',
  },
  php: {
    icon: FileCode,
    color: 'text-indigo-400',
    bg: 'bg-indigo-950/40 border-indigo-800/50',
    label: 'PHP',
  },
  rb: {
    icon: FileCode,
    color: 'text-rose-400',
    bg: 'bg-rose-950/40 border-rose-800/50',
    label: 'Ruby',
  },
  swift: {
    icon: Code2,
    color: 'text-orange-400',
    bg: 'bg-orange-950/40 border-orange-800/50',
    label: 'Swift',
  },

  // Databases & Tables
  sql: {
    icon: Database,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-950/40 border-fuchsia-800/50',
    label: 'SQL',
  },
  sqlite: {
    icon: Database,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-950/40 border-fuchsia-800/50',
    label: 'SQLite',
  },
  sqlite3: {
    icon: Database,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-950/40 border-fuchsia-800/50',
    label: 'SQLite',
  },
  db: {
    icon: Database,
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-950/40 border-fuchsia-800/50',
    label: 'Database',
  },
  prisma: {
    icon: Database,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40 border-emerald-800/50',
    label: 'Prisma',
  },
  csv: {
    icon: FileSpreadsheet,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40 border-emerald-800/50',
    label: 'CSV',
  },
  tsv: {
    icon: FileSpreadsheet,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40 border-emerald-800/50',
    label: 'TSV',
  },

  // Images
  png: {
    icon: Image,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40 border-emerald-800/50',
    label: 'PNG',
  },
  jpg: {
    icon: Image,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40 border-emerald-800/50',
    label: 'JPEG',
  },
  jpeg: {
    icon: Image,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40 border-emerald-800/50',
    label: 'JPEG',
  },
  gif: {
    icon: Image,
    color: 'text-pink-400',
    bg: 'bg-pink-950/40 border-pink-800/50',
    label: 'GIF',
  },
  webp: {
    icon: Image,
    color: 'text-emerald-300',
    bg: 'bg-emerald-950/40 border-emerald-800/50',
    label: 'WebP',
  },
  ico: {
    icon: Image,
    color: 'text-yellow-400',
    bg: 'bg-yellow-950/40 border-yellow-800/50',
    label: 'Icon',
  },

  // Media
  mp4: {
    icon: Video,
    color: 'text-pink-400',
    bg: 'bg-pink-950/40 border-pink-800/50',
    label: 'Video',
  },
  webm: {
    icon: Video,
    color: 'text-pink-400',
    bg: 'bg-pink-950/40 border-pink-800/50',
    label: 'Video',
  },
  mov: {
    icon: Video,
    color: 'text-pink-400',
    bg: 'bg-pink-950/40 border-pink-800/50',
    label: 'Video',
  },
  mp3: {
    icon: Music,
    color: 'text-purple-400',
    bg: 'bg-purple-950/40 border-purple-800/50',
    label: 'Audio',
  },
  wav: {
    icon: Music,
    color: 'text-purple-400',
    bg: 'bg-purple-950/40 border-purple-800/50',
    label: 'Audio',
  },

  // Archives & Binaries
  zip: {
    icon: Archive,
    color: 'text-yellow-500',
    bg: 'bg-yellow-950/40 border-yellow-800/50',
    label: 'ZIP',
  },
  tar: {
    icon: Archive,
    color: 'text-yellow-500',
    bg: 'bg-yellow-950/40 border-yellow-800/50',
    label: 'TAR',
  },
  gz: {
    icon: Archive,
    color: 'text-yellow-500',
    bg: 'bg-yellow-950/40 border-yellow-800/50',
    label: 'GZIP',
  },
  '7z': {
    icon: Archive,
    color: 'text-yellow-500',
    bg: 'bg-yellow-950/40 border-yellow-800/50',
    label: '7Z',
  },
  exe: { icon: Binary, color: 'text-zinc-500', bg: 'bg-zinc-900 border-zinc-800', label: 'Binary' },
  dll: { icon: Binary, color: 'text-zinc-500', bg: 'bg-zinc-900 border-zinc-800', label: 'DLL' },
  wasm: {
    icon: Binary,
    color: 'text-purple-400',
    bg: 'bg-purple-950/40 border-purple-800/50',
    label: 'WASM',
  },
};

/**
 * Exact filename overrides (case-insensitive)
 */
const SPECIAL_FILES = {
  dockerfile: {
    icon: Boxes,
    color: 'text-sky-400',
    bg: 'bg-sky-950/40 border-sky-800/50',
    label: 'Docker',
  },
  'docker-compose.yml': {
    icon: Boxes,
    color: 'text-sky-400',
    bg: 'bg-sky-950/40 border-sky-800/50',
    label: 'Compose',
  },
  'docker-compose.yaml': {
    icon: Boxes,
    color: 'text-sky-400',
    bg: 'bg-sky-950/40 border-sky-800/50',
    label: 'Compose',
  },
  '.dockerignore': {
    icon: Boxes,
    color: 'text-sky-500',
    bg: 'bg-sky-950/40 border-sky-800/50',
    label: 'Docker',
  },
  '.gitignore': {
    icon: GitBranch,
    color: 'text-orange-500',
    bg: 'bg-orange-950/40 border-orange-800/50',
    label: 'Git',
  },
  '.gitattributes': {
    icon: GitBranch,
    color: 'text-orange-500',
    bg: 'bg-orange-950/40 border-orange-800/50',
    label: 'Git',
  },
  '.gitmodules': {
    icon: GitBranch,
    color: 'text-orange-500',
    bg: 'bg-orange-950/40 border-orange-800/50',
    label: 'Git',
  },
  'package.json': {
    icon: Package,
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/40 border-emerald-800/50',
    label: 'Package',
  },
  'package-lock.json': {
    icon: Package,
    color: 'text-zinc-400',
    bg: 'bg-zinc-900 border-zinc-750',
    label: 'Lockfile',
  },
  'pnpm-lock.yaml': {
    icon: Package,
    color: 'text-zinc-400',
    bg: 'bg-zinc-900 border-zinc-750',
    label: 'Lockfile',
  },
  'yarn.lock': {
    icon: Package,
    color: 'text-blue-400',
    bg: 'bg-blue-950/40 border-blue-800/50',
    label: 'Yarn Lock',
  },
  'tsconfig.json': {
    icon: Settings,
    color: 'text-blue-400',
    bg: 'bg-blue-950/40 border-blue-800/50',
    label: 'TS Config',
  },
  'vite.config.js': {
    icon: Settings,
    color: 'text-purple-400',
    bg: 'bg-purple-950/40 border-purple-800/50',
    label: 'Vite Config',
  },
  'vite.config.ts': {
    icon: Settings,
    color: 'text-purple-400',
    bg: 'bg-purple-950/40 border-purple-800/50',
    label: 'Vite Config',
  },
  'pyproject.toml': {
    icon: Settings,
    color: 'text-amber-400',
    bg: 'bg-amber-950/40 border-amber-800/50',
    label: 'Python Config',
  },
  'requirements.txt': {
    icon: FileCode2,
    color: 'text-amber-400',
    bg: 'bg-amber-950/40 border-amber-800/50',
    label: 'Pip Req',
  },
  makefile: {
    icon: Terminal,
    color: 'text-zinc-300',
    bg: 'bg-zinc-900 border-zinc-700',
    label: 'Makefile',
  },
  '.env': {
    icon: Key,
    color: 'text-yellow-400',
    bg: 'bg-yellow-950/40 border-yellow-800/50',
    label: 'Env',
  },
  '.env.example': {
    icon: Key,
    color: 'text-yellow-500',
    bg: 'bg-yellow-950/40 border-yellow-800/50',
    label: 'Env Sample',
  },
};

const DEFAULT_FILE_INFO = {
  icon: File,
  color: 'text-zinc-400',
  bg: 'bg-zinc-900/60 border-zinc-800',
  label: 'File',
};

/**
 * Resolves icon, color tokens, and metadata for any file path or extension.
 */
export function getFileInfo(filePathOrName) {
  if (!filePathOrName) return DEFAULT_FILE_INFO;

  const cleanStr = String(filePathOrName).trim();
  const parts = cleanStr.split(/[\/\\]/);
  const basename = parts[parts.length - 1].split('#')[0].split('?')[0].toLowerCase();

  // Check special filename match
  if (SPECIAL_FILES[basename]) {
    return SPECIAL_FILES[basename];
  }
  if (basename.startsWith('.env.')) {
    return {
      icon: Key,
      color: 'text-yellow-400',
      bg: 'bg-yellow-950/40 border-yellow-800/50',
      label: 'Env',
    };
  }

  // Extract file extension
  const dotIndex = basename.lastIndexOf('.');
  if (dotIndex !== -1 && dotIndex < basename.length - 1) {
    const ext = basename.slice(dotIndex + 1);
    if (EXTENSION_MAP[ext]) {
      return EXTENSION_MAP[ext];
    }
  }

  return DEFAULT_FILE_INFO;
}

/**
 * Reusable React component that renders the appropriate Lucide SVG icon with matching color.
 */
export function FileIcon({ path, className = 'w-3.5 h-3.5 shrink-0' }) {
  const info = getFileInfo(path);
  const IconComponent = info.icon || File;
  return <IconComponent className={`${className} ${info.color}`} />;
}

/**
 * Compact styled pill badge for displaying a file with its native icon and color accents.
 */
export function FileBadge({ path, className = '', showLabel = false }) {
  const info = getFileInfo(path);
  const IconComponent = info.icon || File;
  const cleanStr = String(path).trim();
  const parts = cleanStr.split(/[\/\\]/);
  const displayName = parts[parts.length - 1] || cleanStr;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-mono font-medium max-w-full break-all shadow-xs ${info.bg} ${info.color} ${className}`}
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{displayName}</span>
      {showLabel && (
        <span className="text-[9px] uppercase tracking-wider opacity-60 font-sans ml-1">
          {info.label}
        </span>
      )}
    </span>
  );
}

/**
 * Raw SVG inner path mappings for rendering icons directly in generated HTML strings.
 */
const SVG_PATHS = {
  react:
    '<ellipse cx="12" cy="12" rx="10" ry="4.2"></ellipse><ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)"></ellipse><ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)"></ellipse><circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>',
  terminal:
    '<polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line>',
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path>',
  settings:
    '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path><path d="M6 6h10"></path><path d="M6 10h10"></path>',
  key: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"></path><path d="m21 2-9.6 9.6"></path><circle cx="7.5" cy="15.5" r="5.5"></circle>',
  fileText:
    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line>',
  image:
    '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>',
  video:
    '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11"></path><rect width="14" height="12" x="2" y="6" rx="2"></rect>',
  package:
    '<path d="M16.5 9.4 7.55 4.24"></path><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line>',
  git: '<line x1="6" x2="6" y1="3" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path>',
  code: '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>',
};

/**
 * Generates an inline Lucide SVG string styled with matching file extension color.
 */
export function getFileSvgHtml(
  path,
  className = 'w-3.5 h-3.5 inline-block shrink-0 align-text-bottom mr-1'
) {
  const info = getFileInfo(path);
  const cleanStr = String(path).toLowerCase();

  let pathD = SVG_PATHS.file;
  if (cleanStr.includes('.jsx') || cleanStr.includes('.tsx')) pathD = SVG_PATHS.react;
  else if (
    cleanStr.endsWith('.py') ||
    cleanStr.endsWith('.js') ||
    cleanStr.endsWith('.ts') ||
    cleanStr.endsWith('.rs') ||
    cleanStr.endsWith('.go') ||
    cleanStr.endsWith('.cpp') ||
    cleanStr.endsWith('.c') ||
    cleanStr.endsWith('.java')
  )
    pathD = SVG_PATHS.code;
  else if (
    cleanStr.endsWith('.sh') ||
    cleanStr.endsWith('.bash') ||
    cleanStr.endsWith('.ps1') ||
    cleanStr.endsWith('.bat')
  )
    pathD = SVG_PATHS.terminal;
  else if (cleanStr.endsWith('.sql') || cleanStr.endsWith('.db') || cleanStr.endsWith('.sqlite'))
    pathD = SVG_PATHS.database;
  else if (cleanStr.includes('.env')) pathD = SVG_PATHS.key;
  else if (cleanStr.includes('docker') || cleanStr.includes('package.json'))
    pathD = SVG_PATHS.package;
  else if (cleanStr.includes('.git')) pathD = SVG_PATHS.git;
  else if (cleanStr.endsWith('.md') || cleanStr.endsWith('.markdown')) pathD = SVG_PATHS.book;
  else if (cleanStr.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) pathD = SVG_PATHS.image;
  else if (cleanStr.match(/\.(mp4|webm|mov|avi)$/)) pathD = SVG_PATHS.video;
  else if (cleanStr.match(/\.(json|toml|yaml|yml|xml|ini|conf)$/)) pathD = SVG_PATHS.settings;

  return `<svg class="${className} ${info.color}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${pathD}</svg>`;
}
