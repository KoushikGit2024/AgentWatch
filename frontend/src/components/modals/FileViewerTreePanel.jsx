import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '../../constants/icons';
import { FileIcon } from '../../constants/fileIcons';
import { api } from '../../services/api';

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function hasMatchingDescendant(node, queryLower) {
  if (!queryLower) return true;
  if (node.name.toLowerCase().includes(queryLower)) return true;
  if (node.type === 'directory' && Array.isArray(node.children)) {
    return node.children.some(child => hasMatchingDescendant(child, queryLower));
  }
  return false;
}

function TreeNode({
  node,
  level = 0,
  activeFilePath,
  onOpenFile,
  expandedPaths,
  toggleExpand,
  searchQuery,
}) {
  const isDir = node.type === 'directory';
  const hasChildren = isDir && node.children && node.children.length > 0;
  const queryLower = searchQuery ? searchQuery.trim().toLowerCase() : '';

  const isVisible = useMemo(() => {
    if (!queryLower) return true;
    return hasMatchingDescendant(node, queryLower);
  }, [node, queryLower]);

  if (!isVisible) return null;

  const isExpanded = queryLower ? true : expandedPaths.has(node.path);
  const fullPath = node.full_path || node.path;
  const isSelected =
    !isDir &&
    activeFilePath &&
    (activeFilePath === fullPath ||
      activeFilePath.endsWith('/' + node.name) ||
      activeFilePath.endsWith('\\' + node.name));

  return (
    <div className="select-none text-xs">
      <div
        onClick={() => {
          if (isDir) {
            toggleExpand(node.path);
          } else if (onOpenFile) {
            onOpenFile(fullPath);
          }
        }}
        style={{ paddingLeft: `${Math.max(level * 12 + 8, 8)}px` }}
        className={`group flex items-center justify-between gap-1 py-1 pr-2 rounded transition cursor-pointer ${
          isSelected
            ? 'bg-blue-600/20 text-blue-200 font-medium'
            : isDir
              ? 'hover:bg-[#1D2024] text-[#E8EAED]'
              : 'hover:bg-[#202328] text-[#A0A6AF] hover:text-[#E8EAED]'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {isDir ? (
            <div className="flex items-center gap-0.5 shrink-0">
              <span className="text-[#747C87] w-3 h-3 flex items-center justify-center">
                {hasChildren ? (
                  <div
                    className={`w-3 h-3 transition-transform duration-100 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  >
                    {Icon.chevronRight}
                  </div>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 inline-block" />
                )}
              </span>
              <div className="w-3.5 h-3.5 text-amber-400 shrink-0">
                {isExpanded ? Icon.folderOpen : Icon.folder}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1 shrink-0 pl-2.5">
              <FileIcon path={node.name} className="w-3.5 h-3.5 shrink-0" />
            </div>
          )}
          <span
            className={`font-mono text-[11px] truncate ${isDir ? 'font-medium text-[#E8EAED]' : ''}`}
          >
            {node.name}
          </span>
        </div>

        {!isDir && node.size > 0 && (
          <span className="text-[9px] font-mono text-[#747C87] group-hover:text-[#A0A6AF] shrink-0 tabular-nums">
            {formatBytes(node.size)}
          </span>
        )}
      </div>

      {isDir && isExpanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.path || child.name}
              node={child}
              level={level + 1}
              activeFilePath={activeFilePath}
              onOpenFile={onOpenFile}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileViewerTreePanel({ isOpen, onClose, activeFilePath, onOpenFile }) {
  const [treeData, setTreeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPaths, setExpandedPaths] = useState(new Set(['', 'frontend', 'src']));

  const loadTree = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getFileTree();
      if (res?.tree) {
        setTreeData(res.tree);
        setExpandedPaths(prev => {
          const next = new Set(prev);
          next.add('');
          if (res.tree.children) {
            res.tree.children.forEach(c => {
              if (
                c.type === 'directory' &&
                ['src', 'frontend', 'api', 'services'].includes(c.name)
              ) {
                next.add(c.path);
              }
            });
          }
          return next;
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load project files');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !treeData && !isLoading) {
      loadTree();
    }
  }, [isOpen, treeData, isLoading, loadTree]);

  const toggleExpand = useCallback(path => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const expandAll = () => {
    if (!treeData) return;
    const all = new Set();
    const traverse = n => {
      if (n.type === 'directory') {
        all.add(n.path);
        if (n.children) n.children.forEach(traverse);
      }
    };
    traverse(treeData);
    setExpandedPaths(all);
  };

  const collapseAll = () => {
    setExpandedPaths(new Set(['']));
  };

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Workspace File Tree"
      className="w-64 sm:w-72 shrink-0 h-full border-r border-[#22262B] bg-[#131518] flex flex-col overflow-hidden select-text z-10"
    >
      {/* Search Header */}
      <div className="p-2.5 border-b border-[#22262B] bg-[#101215] space-y-2 select-none shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[#A0A6AF] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Project Explorer
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={loadTree}
              title="Refresh Tree"
              disabled={isLoading}
              className="p-1 rounded text-[#747C87] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer"
            >
              <div className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}>{Icon.refresh}</div>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Collapse file panel"
                className="p-1 rounded text-[#747C87] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer"
              >
                <div className="w-3.5 h-3.5">{Icon.x}</div>
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter files..."
            className="w-full bg-[#16181C] border border-[#262A30] focus:border-blue-500/50 rounded-md py-1 pl-7 pr-6 text-xs text-[#E8EAED] placeholder-[#5D6570] focus:outline-none font-mono"
          />
          <div className="absolute left-2 top-1.5 text-[#747C87] w-3.5 h-3.5 pointer-events-none">
            {Icon.search}
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1.5 text-[#747C87] hover:text-[#E8EAED] cursor-pointer"
            >
              <div className="w-3 h-3">{Icon.x}</div>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-[#747C87]">
          <span className="truncate max-w-[120px]" title={treeData?.name}>
            {treeData?.name || 'Workspace'}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={expandAll}
              className="hover:text-[#E8EAED] cursor-pointer underline text-[9px]"
            >
              Expand
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={collapseAll}
              className="hover:text-[#E8EAED] cursor-pointer underline text-[9px]"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* Tree Body */}
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {isLoading && !treeData ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#A0A6AF] space-y-2">
            <span className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
            <span className="text-[11px] font-mono">Indexing files...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-rose-300 space-y-2">
            <p className="text-[11px]">{error}</p>
            <button
              type="button"
              onClick={loadTree}
              className="px-2.5 py-1 rounded bg-rose-950/40 border border-rose-800/60 text-[10px] text-rose-300 hover:bg-rose-900/60 transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : treeData ? (
          <TreeNode
            node={treeData}
            level={0}
            activeFilePath={activeFilePath}
            onOpenFile={onOpenFile}
            expandedPaths={expandedPaths}
            toggleExpand={toggleExpand}
            searchQuery={searchQuery}
          />
        ) : null}
      </div>
    </aside>
  );
}
