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
export const EXTENSION_MAP = {
  // Python
  py: { icon: FileCode2, color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/50', label: 'Python' },
  pyw: { icon: FileCode2, color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/50', label: 'Python' },
  ipynb: { icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-950/40 border-amber-800/50', label: 'Jupyter' },

  // JavaScript / TypeScript / React
  jsx: { icon: Code2, color: 'text-cyan-400', bg: 'bg-cyan-950/40 border-cyan-800/50', label: 'React JSX' },
  tsx: { icon: Code2, color: 'text-cyan-300', bg: 'bg-cyan-950/40 border-cyan-800/50', label: 'React TSX' },
  js: { icon: FileCode, color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-800/50', label: 'JavaScript' },
  mjs: { icon: FileCode, color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-800/50', label: 'JavaScript' },
  cjs: { icon: FileCode, color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-800/50', label: 'JavaScript' },
  ts: { icon: FileCode2, color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800/50', label: 'TypeScript' },
  mts: { icon: FileCode2, color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800/50', label: 'TypeScript' },
  cts: { icon: FileCode2, color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800/50', label: 'TypeScript' },

  // Web Markup & Styling
  html: { icon: Globe, color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-800/50', label: 'HTML' },
  htm: { icon: Globe, color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-800/50', label: 'HTML' },
  css: { icon: Layers, color: 'text-sky-400', bg: 'bg-sky-950/40 border-sky-800/50', label: 'CSS' },
  scss: { icon: Layers, color: 'text-pink-400', bg: 'bg-pink-950/40 border-pink-800/50', label: 'SCSS' },
  sass: { icon: Layers, color: 'text-pink-400', bg: 'bg-pink-950/40 border-pink-800/50', label: 'Sass' },
  less: { icon: Layers, color: 'text-indigo-400', bg: 'bg-indigo-950/40 border-indigo-800/50', label: 'Less' },
  vue: { icon: Code2, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/50', label: 'Vue' },
  svelte: { icon: Code2, color: 'text-orange-500', bg: 'bg-orange-950/40 border-orange-800/50', label: 'Svelte' },

  // Data, Config & Serialization
  json: { icon: FileJson, color: 'text-amber-300', bg: 'bg-amber-950/40 border-amber-800/50', label: 'JSON' },
  jsonc: { icon: FileJson, color: 'text-amber-300', bg: 'bg-amber-950/40 border-amber-800/50', label: 'JSON' },
  json5: { icon: FileJson, color: 'text-amber-300', bg: 'bg-amber-950/40 border-amber-800/50', label: 'JSON' },
  yaml: { icon: FileSliders, color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800/50', label: 'YAML' },
  yml: { icon: FileSliders, color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800/50', label: 'YAML' },
  toml: { icon: Settings, color: 'text-zinc-300', bg: 'bg-zinc-900 border-zinc-700/60', label: 'TOML' },
  xml: { icon: Code, color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-800/50', label: 'XML' },
  svg: { icon: Image, color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/50', label: 'SVG' },
  ini: { icon: Settings, color: 'text-zinc-400', bg: 'bg-zinc-900 border-zinc-700/60', label: 'Config' },
  cfg: { icon: Settings, color: 'text-zinc-400', bg: 'bg-zinc-900 border-zinc-700/60', label: 'Config' },
  conf: { icon: Settings, color: 'text-zinc-400', bg: 'bg-zinc-900 border-zinc-700/60', label: 'Config' },
  env: { icon: Key, color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-800/50', label: 'Env' },

  // Documentation
  md: { icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800/50', label: 'Markdown' },
  markdown: { icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800/50', label: 'Markdown' },
  mdx: { icon: BookOpen, color: 'text-cyan-400', bg: 'bg-cyan-950/40 border-cyan-800/50', label: 'MDX' },
  txt: { icon: FileText, color: 'text-zinc-400', bg: 'bg-zinc-900 border-zinc-800', label: 'Text' },
  log: { icon: FileText, color: 'text-zinc-500', bg: 'bg-zinc-900 border-zinc-800', label: 'Log' },
  pdf: { icon: FileText, color: 'text-rose-500', bg: 'bg-rose-950/40 border-rose-800/50', label: 'PDF' },

  // Shell Scripts
  sh: { icon: Terminal, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/50', label: 'Shell' },
  bash: { icon: Terminal, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/50', label: 'Bash' },
  zsh: { icon: Terminal, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/50', label: 'Zsh' },
  ps1: { icon: Terminal, color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800/50', label: 'PowerShell' },
  bat: { icon: Terminal, color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/50', label: 'Batch' },
  cmd: { icon: Terminal, color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/50', label: 'CMD' },

  // Systems & Backend
  rs: { icon: Cpu, color: 'text-orange-500', bg: 'bg-orange-950/40 border-orange-800/50', label: 'Rust' },
  go: { icon: FileCode2, color: 'text-cyan-400', bg: 'bg-cyan-950/40 border-cyan-800/50', label: 'Go' },
  c: { icon: FileCode, color: 'text-blue-500', bg: 'bg-blue-950/40 border-blue-800/50', label: 'C' },
  h: { icon: FileCode, color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800/50', label: 'C Header' },
  cpp: { icon: FileCode2, color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800/50', label: 'C++' },
  hpp: { icon: FileCode2, color: 'text-blue-300', bg: 'bg-blue-950/40 border-blue-800/50', label: 'C++ Header' },
  cs: { icon: Code2, color: 'text-violet-400', bg: 'bg-violet-950/40 border-violet-800/50', label: 'C#' },
  java: { icon: FileCode, color: 'text-red-400', bg: 'bg-red-950/40 border-red-800/50', label: 'Java' },
  kt: { icon: FileCode, color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800/50', label: 'Kotlin' },
  php: { icon: FileCode, color: 'text-indigo-400', bg: 'bg-indigo-950/40 border-indigo-800/50', label: 'PHP' },
  rb: { icon: FileCode, color: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-800/50', label: 'Ruby' },
  swift: { icon: Code2, color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-800/50', label: 'Swift' },

  // Databases & Tables
  sql: { icon: Database, color: 'text-fuchsia-400', bg: 'bg-fuchsia-950/40 border-fuchsia-800/50', label: 'SQL' },
  sqlite: { icon: Database, color: 'text-fuchsia-400', bg: 'bg-fuchsia-950/40 border-fuchsia-800/50', label: 'SQLite' },
  sqlite3: { icon: Database, color: 'text-fuchsia-400', bg: 'bg-fuchsia-950/40 border-fuchsia-800/50', label: 'SQLite' },
  db: { icon: Database, color: 'text-fuchsia-400', bg: 'bg-fuchsia-950/40 border-fuchsia-800/50', label: 'Database' },
  prisma: { icon: Database, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/50', label: 'Prisma' },
  csv: { icon: FileSpreadsheet, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/50', label: 'CSV' },
  tsv: { icon: FileSpreadsheet, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/50', label: 'TSV' },

  // Images
  png: { icon: Image, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/50', label: 'PNG' },
  jpg: { icon: Image, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/50', label: 'JPEG' },
  jpeg: { icon: Image, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/50', label: 'JPEG' },
  gif: { icon: Image, color: 'text-pink-400', bg: 'bg-pink-950/40 border-pink-800/50', label: 'GIF' },
  webp: { icon: Image, color: 'text-emerald-300', bg: 'bg-emerald-950/40 border-emerald-800/50', label: 'WebP' },
  ico: { icon: Image, color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-800/50', label: 'Icon' },

  // Media
  mp4: { icon: Video, color: 'text-pink-400', bg: 'bg-pink-950/40 border-pink-800/50', label: 'Video' },
  webm: { icon: Video, color: 'text-pink-400', bg: 'bg-pink-950/40 border-pink-800/50', label: 'Video' },
  mov: { icon: Video, color: 'text-pink-400', bg: 'bg-pink-950/40 border-pink-800/50', label: 'Video' },
  mp3: { icon: Music, color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800/50', label: 'Audio' },
  wav: { icon: Music, color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800/50', label: 'Audio' },

  // Archives & Binaries
  zip: { icon: Archive, color: 'text-yellow-500', bg: 'bg-yellow-950/40 border-yellow-800/50', label: 'ZIP' },
  tar: { icon: Archive, color: 'text-yellow-500', bg: 'bg-yellow-950/40 border-yellow-800/50', label: 'TAR' },
  gz: { icon: Archive, color: 'text-yellow-500', bg: 'bg-yellow-950/40 border-yellow-800/50', label: 'GZIP' },
  '7z': { icon: Archive, color: 'text-yellow-500', bg: 'bg-yellow-950/40 border-yellow-800/50', label: '7Z' },
  exe: { icon: Binary, color: 'text-zinc-500', bg: 'bg-zinc-900 border-zinc-800', label: 'Binary' },
  dll: { icon: Binary, color: 'text-zinc-500', bg: 'bg-zinc-900 border-zinc-800', label: 'DLL' },
  wasm: { icon: Binary, color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800/50', label: 'WASM' },
};

/**
 * Exact filename overrides (case-insensitive)
 */
export const SPECIAL_FILES = {
  dockerfile: { icon: Boxes, color: 'text-sky-400', bg: 'bg-sky-950/40 border-sky-800/50', label: 'Docker' },
  'docker-compose.yml': { icon: Boxes, color: 'text-sky-400', bg: 'bg-sky-950/40 border-sky-800/50', label: 'Compose' },
  'docker-compose.yaml': { icon: Boxes, color: 'text-sky-400', bg: 'bg-sky-950/40 border-sky-800/50', label: 'Compose' },
  '.dockerignore': { icon: Boxes, color: 'text-sky-500', bg: 'bg-sky-950/40 border-sky-800/50', label: 'Docker' },
  '.gitignore': { icon: GitBranch, color: 'text-orange-500', bg: 'bg-orange-950/40 border-orange-800/50', label: 'Git' },
  '.gitattributes': { icon: GitBranch, color: 'text-orange-500', bg: 'bg-orange-950/40 border-orange-800/50', label: 'Git' },
  '.gitmodules': { icon: GitBranch, color: 'text-orange-500', bg: 'bg-orange-950/40 border-orange-800/50', label: 'Git' },
  'package.json': { icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/50', label: 'Package' },
  'package-lock.json': { icon: Package, color: 'text-zinc-400', bg: 'bg-zinc-900 border-zinc-750', label: 'Lockfile' },
  'pnpm-lock.yaml': { icon: Package, color: 'text-zinc-400', bg: 'bg-zinc-900 border-zinc-750', label: 'Lockfile' },
  'yarn.lock': { icon: Package, color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800/50', label: 'Yarn Lock' },
  'tsconfig.json': { icon: Settings, color: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800/50', label: 'TS Config' },
  'vite.config.js': { icon: Settings, color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800/50', label: 'Vite Config' },
  'vite.config.ts': { icon: Settings, color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800/50', label: 'Vite Config' },
  'pyproject.toml': { icon: Settings, color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/50', label: 'Python Config' },
  'requirements.txt': { icon: FileCode2, color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/50', label: 'Pip Req' },
  makefile: { icon: Terminal, color: 'text-zinc-300', bg: 'bg-zinc-900 border-zinc-700', label: 'Makefile' },
  '.env': { icon: Key, color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-800/50', label: 'Env' },
  '.env.example': { icon: Key, color: 'text-yellow-500', bg: 'bg-yellow-950/40 border-yellow-800/50', label: 'Env Sample' },
};
