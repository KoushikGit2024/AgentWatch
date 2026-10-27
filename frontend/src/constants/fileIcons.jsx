import React from 'react';
import { File, Key } from 'lucide-react';
import { EXTENSION_MAP, SPECIAL_FILES } from './fileIconMaps';


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
