import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../../../constants/icons';
import { api } from '../../../../services/api';
import { fileActionsApi } from '../../../../services/fileActionsApi';
import { toast } from '../../../../services/toastService';
import { InlineCreationRow } from './FileViewerTreeActions';
import { TreeNode } from './FileViewerTreeNode';

export function FileViewerTreePanel({ isOpen, onClose, activeFilePath, onOpenFile, conversationId }) {
  const [treeData, setTreeData] = useState(null);
  const [rootName, setRootName] = useState('Project Explorer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPaths, setExpandedPaths] = useState(new Set(['', 'frontend', 'src']));
  const [creatingState, setCreatingState] = useState(null);
  const [renamingPath, setRenamingPath] = useState(null);

  const loadTree = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getFileTree('', conversationId);
      if (res?.tree) {
        setTreeData(res.tree);
        if (res.root_name) setRootName(res.root_name);
        setExpandedPaths(prev => {
          const next = new Set(prev);
          next.add('');
          return next;
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load project files');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (isOpen) loadTree();
  }, [isOpen, conversationId, loadTree]);

  const toggleExpand = useCallback((path, forceOpen = false) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (forceOpen) next.add(path);
      else if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handlePerformCreate = async (folderPath, itemName, isDir) => {
    setCreatingState(null);
    try {
      const cleanFolder = folderPath.replace(/\\/g, '/').replace(/\/+$/, '');
      const fullTarget = `${cleanFolder}/${itemName}`;
      await fileActionsApi.createItem(fullTarget, isDir);
      toast.success(`Created ${itemName}`, isDir ? 'Folder Created' : 'File Created');
      await loadTree();
      if (!isDir && onOpenFile) onOpenFile(fullTarget);
    } catch (err) {
      toast.error(err.message || 'Creation failed', 'File Error');
    }
  };

  const handlePerformRename = async (path, newName) => {
    setRenamingPath(null);
    try {
      await fileActionsApi.renameItem(path, newName);
      toast.success(`Renamed to ${newName}`, 'Item Renamed');
      await loadTree();
    } catch (err) {
      toast.error(err.message || 'Rename failed', 'File Error');
    }
  };

  const handlePerformDelete = async (path, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await fileActionsApi.deleteItem(path);
      toast.success(`Deleted ${name}`, 'Item Deleted');
      await loadTree();
    } catch (err) {
      toast.error(err.message || 'Delete failed', 'File Error');
    }
  };

  const handlePerformMove = async (src, dstFolder) => {
    try {
      await fileActionsApi.moveItem(src, dstFolder);
      toast.success('Moved successfully', 'Item Moved');
      await loadTree();
    } catch (err) {
      toast.error(err.message || 'Move failed', 'File Error');
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Workspace File Tree"
      className="w-64 sm:w-72 shrink-0 h-full border-r border-[#22262B] bg-[#131518] flex flex-col overflow-hidden select-text z-10"
    >
      {/* Header */}
      <div className="p-2.5 border-b border-[#22262B] bg-[#101215] space-y-2 select-none shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[#A0A6AF] flex items-center gap-1.5 truncate max-w-[160px]" title={rootName}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span className="truncate">{rootName}</span>
          </span>
          <div className="flex items-center gap-0.5">
            {treeData && (
              <>
                <button
                  type="button"
                  onClick={() => setCreatingState({ targetFolder: treeData.full_path, isDir: false, level: 0 })}
                  title="New File in Root"
                  className="p-1 rounded text-[#747C87] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer"
                >
                  <div className="w-3.5 h-3.5">{Icon.filePlus}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setCreatingState({ targetFolder: treeData.full_path, isDir: true, level: 0 })}
                  title="New Folder in Root"
                  className="p-1 rounded text-[#747C87] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer"
                >
                  <div className="w-3.5 h-3.5">{Icon.folderPlus}</div>
                </button>
              </>
            )}
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

        {/* Filter input */}
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
      </div>

      {/* Root creation input */}
      {creatingState && creatingState.targetFolder === treeData?.full_path && (
        <div className="p-1 border-b border-[#22262B] bg-[#16181C]">
          <InlineCreationRow
            level={0}
            isDir={creatingState.isDir}
            onConfirm={(name) => handlePerformCreate(treeData.full_path, name, creatingState.isDir)}
            onCancel={() => setCreatingState(null)}
          />
        </div>
      )}

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
            creatingState={creatingState}
            setCreatingState={setCreatingState}
            renamingPath={renamingPath}
            setRenamingPath={setRenamingPath}
            onPerformCreate={handlePerformCreate}
            onPerformRename={handlePerformRename}
            onPerformDelete={handlePerformDelete}
            onPerformMove={handlePerformMove}
          />
        ) : null}
      </div>
    </aside>
  );
}
