import React, { useState, useMemo } from 'react';
import { Icon } from '../../../../constants/icons';
import { FileIcon } from '../../../../constants/fileIcons';
import {
  InlineCreationRow,
  InlineRenameInput,
  TreeNodeActions,
} from './FileViewerTreeActions';

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

export function TreeNode({
  node,
  level = 0,
  activeFilePath,
  onOpenFile,
  expandedPaths,
  toggleExpand,
  searchQuery,
  creatingState,
  setCreatingState,
  renamingPath,
  setRenamingPath,
  onPerformCreate,
  onPerformRename,
  onPerformDelete,
  onPerformMove,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isDir = node.type === 'directory';
  const hasChildren = isDir && node.children && node.children.length > 0;
  const queryLower = searchQuery ? searchQuery.trim().toLowerCase() : '';
  const fullPath = node.full_path || node.path;

  const isVisible = useMemo(() => {
    if (!queryLower) return true;
    return hasMatchingDescendant(node, queryLower);
  }, [node, queryLower]);

  if (!isVisible) return null;

  const isExpanded = queryLower ? true : expandedPaths.has(node.path);
  const isSelected =
    !isDir &&
    activeFilePath &&
    (activeFilePath === fullPath ||
      activeFilePath.endsWith('/' + node.name) ||
      activeFilePath.endsWith('\\' + node.name));

  const isRenaming = renamingPath === fullPath;
  const isCreatingInside = creatingState && creatingState.targetFolder === fullPath;

  const handleDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', fullPath);
  };

  const handleDragOver = (e) => {
    if (isDir) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    if (!isDir) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const sourcePath = e.dataTransfer.getData('text/plain');
    if (sourcePath && sourcePath !== fullPath) {
      await onPerformMove(sourcePath, fullPath);
    }
  };

  return (
    <div className="select-none text-xs">
      <div
        draggable={!isRenaming}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (isDir) toggleExpand(node.path);
          else if (onOpenFile) onOpenFile(fullPath);
        }}
        style={{ paddingLeft: `${Math.max(level * 12 + 8, 8)}px` }}
        className={`group flex items-center justify-between gap-1 py-1 pr-2 rounded transition cursor-pointer ${
          isDragOver
            ? 'bg-blue-600/30 border border-blue-400'
            : isSelected
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
                  <div className={`w-3 h-3 transition-transform duration-100 ${isExpanded ? 'rotate-90' : ''}`}>
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

          {isRenaming ? (
            <InlineRenameInput
              initialName={node.name}
              onConfirm={(newName) => onPerformRename(fullPath, newName)}
              onCancel={() => setRenamingPath(null)}
            />
          ) : (
            <span className={`font-mono text-[11px] truncate ${isDir ? 'font-medium text-[#E8EAED]' : ''}`}>
              {node.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <TreeNodeActions
            isDir={isDir}
            onNewFile={() => {
              toggleExpand(node.path, true);
              setCreatingState({ targetFolder: fullPath, isDir: false, level: level + 1 });
            }}
            onNewFolder={() => {
              toggleExpand(node.path, true);
              setCreatingState({ targetFolder: fullPath, isDir: true, level: level + 1 });
            }}
            onRename={() => setRenamingPath(fullPath)}
            onDelete={() => onPerformDelete(fullPath, node.name)}
          />
          {!isDir && node.size > 0 && !isRenaming && (
            <span className="text-[9px] font-mono text-[#747C87] group-hover:text-[#A0A6AF] tabular-nums group-hover:hidden">
              {formatBytes(node.size)}
            </span>
          )}
        </div>
      </div>

      {isDir && isCreatingInside && (
        <InlineCreationRow
          level={creatingState.level}
          isDir={creatingState.isDir}
          onConfirm={(name) => onPerformCreate(fullPath, name, creatingState.isDir)}
          onCancel={() => setCreatingState(null)}
        />
      )}

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
              creatingState={creatingState}
              setCreatingState={setCreatingState}
              renamingPath={renamingPath}
              setRenamingPath={setRenamingPath}
              onPerformCreate={onPerformCreate}
              onPerformRename={onPerformRename}
              onPerformDelete={onPerformDelete}
              onPerformMove={onPerformMove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

