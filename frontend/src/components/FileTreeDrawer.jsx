import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '../constants/icons';
import { FileIcon } from '../constants/fileIcons';
import { api } from '../services/api';

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Recursively check if node or any of its descendants matches the search query
function hasMatchingDescendant(node, queryLower) {
    if (!queryLower) return true;
    if (node.name.toLowerCase().includes(queryLower)) return true;
    if (node.type === 'directory' && Array.isArray(node.children)) {
        return node.children.some(child => hasMatchingDescendant(child, queryLower));
    }
    return false;
}

function TreeNode({ node, level = 0, onOpenFile, expandedPaths, toggleExpand, searchQuery }) {
    const isDir = node.type === 'directory';
    const hasChildren = isDir && node.children && node.children.length > 0;
    const queryLower = searchQuery ? searchQuery.trim().toLowerCase() : '';

    // Check if this node or any child matches search
    const isVisible = useMemo(() => {
        if (!queryLower) return true;
        return hasMatchingDescendant(node, queryLower);
    }, [node, queryLower]);

    if (!isVisible) {
        return null;
    }

    // When searching, auto-expand folders that contain matches; otherwise check expandedPaths
    const isExpanded = queryLower ? true : expandedPaths.has(node.path);

    return (
        <div className="select-none text-xs">
            <div
                onClick={() => {
                    if (isDir) {
                        toggleExpand(node.path);
                    } else if (onOpenFile) {
                        onOpenFile(node.full_path || node.path);
                    }
                }}
                style={{ paddingLeft: `${Math.max(level * 14 + 10, 10)}px` }}
                className={`group flex items-center justify-between gap-1.5 py-1 pr-3 rounded cursor-pointer transition ${
                    isDir
                        ? 'hover:bg-[#1D2024] text-[#E8EAED]'
                        : 'hover:bg-[#23272D] text-[#A0A6AF] hover:text-[#E8EAED]'
                }`}
            >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                    {isDir ? (
                        <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[#747C87] w-3 h-3 flex items-center justify-center">
                                {hasChildren ? (
                                    <div className={`w-3 h-3 transition-transform duration-100 ${isExpanded ? 'rotate-90' : ''}`}>
                                        {Icon.chevronRight}
                                    </div>
                                ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 inline-block" />
                                )}
                            </span>
                            <div className="w-3.5 h-3.5 text-amber-400/90 shrink-0">
                                {isExpanded ? Icon.folderOpen : Icon.folder}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 shrink-0 pl-3">
                            <FileIcon path={node.name} className="w-3.5 h-3.5 shrink-0" />
                        </div>
                    )}
                    <span className={`font-mono text-xs truncate ${isDir ? 'font-medium text-[#E8EAED]' : ''}`}>
                        {node.name}
                    </span>
                </div>

                {!isDir && node.size > 0 && (
                    <span className="text-[10px] font-mono text-[#747C87] group-hover:text-[#A0A6AF] shrink-0 tabular-nums">
                        {formatBytes(node.size)}
                    </span>
                )}
            </div>

            {isDir && isExpanded && hasChildren && (
                <div>
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.path || child.name}
                            node={child}
                            level={level + 1}
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

export default function FileTreeDrawer({ isOpen, onClose, onOpenFile }) {
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
                            if (c.type === 'directory' && ['src', 'frontend', 'api', 'services'].includes(c.name)) {
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
        if (isOpen) {
            loadTree();
        }
    }, [isOpen, loadTree]);

    const toggleExpand = useCallback((path) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    }, []);

    const expandAll = () => {
        if (!treeData) return;
        const allPaths = new Set();
        const traverse = (node) => {
            if (node.type === 'directory') {
                allPaths.add(node.path);
                if (node.children) node.children.forEach(traverse);
            }
        };
        traverse(treeData);
        setExpandedPaths(allPaths);
    };

    const collapseAll = () => {
        setExpandedPaths(new Set(['']));
    };

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Project Explorer"
            className="fixed inset-0 z-[10000] flex justify-end bg-black/60 select-none animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-md h-full bg-[#17191C] border-l border-[#30343A] shadow-2xl flex flex-col overflow-hidden select-text"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-3.5 py-3 border-b border-[#30343A] bg-[#1D2024] flex items-center justify-between gap-2 shrink-0 select-none">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                            {Icon.folder}
                        </div>
                        <h2 className="text-sm font-semibold text-[#E8EAED] tracking-tight truncate">
                            Project Files
                        </h2>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={loadTree}
                            title="Refresh Tree"
                            disabled={isLoading}
                            className="p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer"
                        >
                            <span className={`w-3.5 h-3.5 inline-block ${isLoading ? 'animate-spin' : ''}`}>
                                {Icon.refresh}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            title="Close (Esc)"
                            className="p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer"
                        >
                            <div className="w-4 h-4">{Icon.x}</div>
                        </button>
                    </div>
                </div>

                {/* Search & Actions Bar */}
                <div className="p-2.5 border-b border-[#262A30] bg-[#121316] space-y-2 select-none">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Filter files in project..."
                            className="w-full bg-[#17191C] border border-[#30343A] rounded-md py-1.5 pl-8 pr-7 text-xs text-[#E8EAED] placeholder-[#747C87] focus:outline-none focus:border-amber-500/50 font-mono"
                        />
                        <div className="absolute left-2.5 top-2 text-[#747C87] w-3.5 h-3.5 pointer-events-none">
                            {Icon.search}
                        </div>
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-2 text-[#747C87] hover:text-[#E8EAED] cursor-pointer"
                            >
                                <div className="w-3.5 h-3.5">{Icon.x}</div>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#A0A6AF]">
                        <span>Root: <strong className="font-mono text-[#E8EAED]">{treeData?.name || 'Workspace'}</strong></span>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={expandAll} className="hover:text-[#E8EAED] cursor-pointer underline text-[10px]">
                                Expand All
                            </button>
                            <span>·</span>
                            <button type="button" onClick={collapseAll} className="hover:text-[#E8EAED] cursor-pointer underline text-[10px]">
                                Collapse All
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tree View Body */}
                <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                    {isLoading && !treeData ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[#A0A6AF] space-y-2">
                            <span className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                            <span className="text-xs font-mono">Indexing project workspace...</span>
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center text-[#D77E83] space-y-2">
                            <p className="text-xs font-semibold">{error}</p>
                            <button
                                type="button"
                                onClick={loadTree}
                                className="px-3 py-1 rounded bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 hover:bg-rose-900/60 transition cursor-pointer"
                            >
                                Retry
                            </button>
                        </div>
                    ) : treeData ? (
                        <TreeNode
                            node={treeData}
                            level={0}
                            onOpenFile={onOpenFile}
                            expandedPaths={expandedPaths}
                            toggleExpand={toggleExpand}
                            searchQuery={searchQuery}
                        />
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-3.5 py-2 border-t border-[#30343A] bg-[#1D2024] text-[11px] font-mono text-[#747C87] flex items-center justify-between select-none">
                    <span>Click any file to open tab</span>
                    <span>Excluded build & venv dirs</span>
                </div>
            </div>
        </div>
    );
}
