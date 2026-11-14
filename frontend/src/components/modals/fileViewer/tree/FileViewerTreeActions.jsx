import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../../../constants/icons';
import { FileIcon } from '../../../../constants/fileIcons';

export function InlineCreationRow({
  level = 0,
  isDir = false,
  onConfirm,
  onCancel,
}) {
  const [val, setVal] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const clean = val.trim();
      if (clean) onConfirm(clean);
      else onCancel();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      style={{ paddingLeft: `${Math.max(level * 12 + 8, 8)}px` }}
      className="flex items-center gap-1.5 py-1 pr-2 bg-[#1B1E23] border border-blue-500/50 rounded text-xs select-none"
    >
      <div className="shrink-0 flex items-center">
        {isDir ? (
          <div className="w-3.5 h-3.5 text-amber-400">{Icon.folder}</div>
        ) : (
          <FileIcon path={val || 'file.txt'} className="w-3.5 h-3.5" />
        )}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        placeholder={isDir ? 'folder_name' : 'filename.ext'}
        className="w-full bg-transparent text-[#E8EAED] text-[11px] font-mono outline-none placeholder-[#5D6570]"
      />
    </div>
  );
}

export function InlineRenameInput({
  initialName,
  onConfirm,
  onCancel,
}) {
  const [val, setVal] = useState(initialName);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      const dotIndex = initialName.lastIndexOf('.');
      if (dotIndex > 0) {
        inputRef.current.setSelectionRange(0, dotIndex);
      } else {
        inputRef.current.select();
      }
    }
  }, [initialName]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const clean = val.trim();
      if (clean && clean !== initialName) {
        onConfirm(clean);
      } else {
        onCancel();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onCancel}
      onClick={(e) => e.stopPropagation()}
      className="bg-[#101215] border border-blue-500/70 rounded px-1 py-0 text-[11px] font-mono text-[#E8EAED] outline-none max-w-[140px]"
    />
  );
}

export function TreeNodeActions({
  isDir,
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="hidden group-hover:flex items-center gap-0.5 shrink-0 px-1 py-0.5 rounded bg-[#101215]/90 border border-[#262A30] shadow-sm"
    >
      {isDir && onNewFile && (
        <button
          type="button"
          onClick={onNewFile}
          title="New File"
          className="p-1 hover:text-[#E8EAED] text-[#747C87] hover:bg-[#202328] rounded cursor-pointer transition"
        >
          <div className="w-3 h-3">{Icon.filePlus}</div>
        </button>
      )}
      {isDir && onNewFolder && (
        <button
          type="button"
          onClick={onNewFolder}
          title="New Folder"
          className="p-1 hover:text-[#E8EAED] text-[#747C87] hover:bg-[#202328] rounded cursor-pointer transition"
        >
          <div className="w-3 h-3">{Icon.folderPlus}</div>
        </button>
      )}
      {onRename && (
        <button
          type="button"
          onClick={onRename}
          title="Rename"
          className="p-1 hover:text-[#E8EAED] text-[#747C87] hover:bg-[#202328] rounded cursor-pointer transition"
        >
          <div className="w-3 h-3">{Icon.edit}</div>
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          className="p-1 hover:text-red-400 text-[#747C87] hover:bg-red-500/10 rounded cursor-pointer transition"
        >
          <div className="w-3 h-3">{Icon.trash}</div>
        </button>
      )}
    </div>
  );
}

