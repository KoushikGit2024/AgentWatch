/**
 * Interactive Collapsible File Tree for Commit Changes.
 * Faithfully matches Git Keizu's commit details file tree:
 * - Collapsible directories with Folder / FolderOpen icons
 * - Sorted: directories first, then files alphabetically
 * - Clear Git Status badges: Added (A), Modified (M), Deleted (D), Renamed (R)
 * - Per-file additions / deletions (+N / -N)
 * - Pure React + Lucide icons only. Adheres strictly to AGENTS.md (< 500 LOC).
 */
import React, { useState, useMemo } from 'react';
import { Folder, FolderOpen, FileCode, ChevronRight, ChevronDown } from 'lucide-react';

/**
 * Renders Git status badge matching Git Keizu styling.
 */
function StatusBadge({ status }) {
  if (!status) return null;

  const config = {
    A: { label: 'A', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', title: 'Added' },
    M: { label: 'M', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', title: 'Modified' },
    D: { label: 'D', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30', title: 'Deleted' },
    R: { label: 'R', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', title: 'Renamed' },
  }[status] || { label: status, bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', title: status };

  return (
    <span
      title={config.title}
      className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[9px] font-bold ${config.bg} ${config.text} border ${config.border} flex-none`}
    >
      {config.label}
    </span>
  );
}

/**
 * Builds nested tree node structure from flat file changes array.
 */
function buildTreeFromFiles(files = []) {
  const root = { name: '', path: '', type: 'folder', children: {} };

  files.forEach(f => {
    const rawPath = f.path.replace(/\\/g, '/');
    const segments = rawPath.split('/');
    let current = root;

    segments.forEach((seg, idx) => {
      const isFile = idx === segments.length - 1;
      if (isFile) {
        current.children[seg] = {
          name: seg,
          path: f.path,
          type: 'file',
          status: f.status || 'M',
          old_path: f.old_path,
          additions: f.additions ?? 0,
          deletions: f.deletions ?? 0,
        };
      } else {
        if (!current.children[seg]) {
          const folderPath = segments.slice(0, idx + 1).join('/');
          current.children[seg] = {
            name: seg,
            path: folderPath,
            type: 'folder',
            children: {},
          };
        }
        current = current.children[seg];
      }
    });
  });

  return root;
}

/**
 * Single tree item: recurses for folders or renders file row.
 */
function FileTreeNode({ node, depth = 0 }) {
  const [isOpen, setIsOpen] = useState(true);

  if (node.type === 'folder') {
    // Sort folder contents: directories first, then files
    const entries = Object.values(node.children).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return (
      <div className="select-none">
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
          className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-[#1E2228] cursor-pointer text-[#C9D1D9] hover:text-white transition group"
        >
          {isOpen ? (
            <ChevronDown className="w-3 h-3 text-[#8B949E] flex-none" />
          ) : (
            <ChevronRight className="w-3 h-3 text-[#8B949E] flex-none" />
          )}
          {isOpen ? (
            <FolderOpen className="w-3.5 h-3.5 text-blue-400 flex-none" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-blue-400/80 flex-none" />
          )}
          <span className="font-mono text-[11px] font-medium truncate group-hover:text-white">
            {node.name}
          </span>
        </div>

        {isOpen && (
          <div>
            {entries.map(child => (
              <FileTreeNode
                key={child.path || child.name}
                node={child}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File row with Status Badge
  const fileNameColor = {
    A: 'text-emerald-300',
    D: 'text-rose-400 line-through opacity-80',
    M: 'text-[#A5D6FF]',
    R: 'text-cyan-300',
  }[node.status] || 'text-[#A5D6FF]';

  return (
    <div
      style={{ paddingLeft: `${depth * 12 + 16}px` }}
      className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[#161B22] text-[#C9D1D9] transition group select-none"
    >
      <div className="flex items-center gap-1.5 min-w-0 pr-2">
        <StatusBadge status={node.status} />
        <FileCode className="w-3 h-3 text-[#7C9FC5] flex-none" />
        <span className={`font-mono text-[11px] truncate group-hover:text-white ${fileNameColor}`}>
          {node.name}
        </span>
      </div>
      <div className="flex items-center gap-1.5 font-mono text-[10px] flex-none">
        {node.additions > 0 && (
          <span className="text-emerald-400">+{node.additions}</span>
        )}
        {node.deletions > 0 && (
          <span className="text-rose-400">-{node.deletions}</span>
        )}
      </div>
    </div>
  );
}

export function CommitFileTree({ files = [] }) {
  const tree = useMemo(() => buildTreeFromFiles(files), [files]);

  if (!files || files.length === 0) {
    return <div className="text-[#6E7681] text-center py-8">No changed files recorded</div>;
  }

  const rootEntries = Object.values(tree.children).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-0.5">
      {rootEntries.map(entry => (
        <FileTreeNode key={entry.path || entry.name} node={entry} depth={0} />
      ))}
    </div>
  );
}
