import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../constants/icons';
import { api } from '../../services/api';
import { toast } from '../../services/toastService';
import { formatFileSize } from '../chat/AttachmentPreview';
import AssetCard from './AssetCard';

export default function AssetManagerModal({
  isOpen,
  onClose,
  onSelectAttachment,
  onPreviewItem,
  activeConversationId,
}) {
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [scope, setScope] = useState('all'); // 'all' | 'chat' | 'global'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [totalBytes, setTotalBytes] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchAttachments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getAttachments({
        search,
        category,
        scope,
        conversation_id: activeConversationId,
      });
      if (res && res.success) {
        setAttachments(res.attachments || []);
        setTotalBytes(res.total_bytes || 0);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load assets', 'Asset Manager');
    } finally {
      setIsLoading(false);
    }
  }, [search, category, scope, activeConversationId]);

  useEffect(() => {
    if (isOpen) {
      fetchAttachments();
      setSelectedIds(new Set());
      setConfirmDelete(null);
    }
  }, [isOpen, fetchAttachments]);

  if (!isOpen) return null;

  const handleToggleSelect = filename => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(filename)) next.delete(filename);
      else next.add(filename);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === attachments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(attachments.map(a => a.filename)));
    }
  };

  const executeDeleteSingle = async filename => {
    try {
      await api.deleteAttachment(filename);
      toast.success(`Deleted ${filename}`, 'Asset Removed');
      setAttachments(prev => prev.filter(a => a.filename !== filename));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(filename);
        return next;
      });
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete file', 'Delete Error');
    }
  };

  const executeDeleteBatch = async () => {
    const count = selectedIds.size;
    if (count === 0) return;

    setIsDeleting(true);
    try {
      const res = await api.deleteBatchAttachments(Array.from(selectedIds));
      if (res && res.success) {
        toast.success(
          `Deleted ${res.deleted_count} file(s) (${res.freed_mb} MB freed)`,
          'Batch Delete'
        );
        setAttachments(prev => prev.filter(a => !selectedIds.has(a.filename)));
        setSelectedIds(new Set());
        setConfirmDelete(null);
      }
    } catch (err) {
      toast.error(err.message || 'Batch delete failed', 'Delete Error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAttachToPrompt = (att, e) => {
    e?.stopPropagation();
    if (onSelectAttachment) {
      onSelectAttachment({
        id: att.id,
        filename: att.filename,
        original_name: att.original_name,
        url: att.url,
        size: att.size,
        is_image: att.is_image,
      });
      toast.info(`Attached ${att.original_name} to prompt`, 'Asset Selected');
    }
  };

  const categories = [
    { id: 'all', label: 'All Types' },
    { id: 'image', label: 'Images' },
    { id: 'document', label: 'Documents' },
    { id: 'code', label: 'Code' },
  ];

  const scopes = [
    { id: 'all', label: 'All Files' },
    { id: 'chat', label: 'This Chat' },
    { id: 'global', label: 'Out of Chat' },
  ];

  const isAllSelected = attachments.length > 0 && selectedIds.size === attachments.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#141619] border border-[#30343A] rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#30343A] bg-[#17191C] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <div className="w-4 h-4">{Icon.folderOpen}</div>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-[#E8EAED] tracking-tight truncate">
                  Asset & Upload Manager
                </h2>
                <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-[#1D2024] text-[#A0A6AF] border border-[#30343A] shrink-0">
                  {attachments.length} items · {formatFileSize(totalBytes)}
                </span>
              </div>
              <p className="text-[11px] text-[#A0A6AF] truncate">
                Browse chat uploads & out-of-chat workspace media
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close asset manager"
            className="p-2 text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] rounded-lg border border-[#30343A] sm:border-transparent transition cursor-pointer shrink-0"
          >
            <div className="w-4 h-4">{Icon.x}</div>
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-2.5 sm:px-4 sm:py-2.5 border-b border-[#262A30] bg-[#101113] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 shrink-0">
          {/* Scope & Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {/* Scope Filter */}
            <div className="flex items-center bg-[#17191C] p-0.5 rounded-lg border border-[#30343A]">
              {scopes.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScope(s.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                    scope === s.id
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-[#A0A6AF] hover:text-[#E8EAED]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Type Categories */}
            <div className="flex items-center gap-1">
              {categories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer shrink-0 ${
                    category === c.id
                      ? 'bg-[#2A2E35] text-[#E8EAED] font-semibold border border-[#40464F]'
                      : 'bg-[#1D2024] text-[#8E95A0] hover:text-[#E8EAED] border border-[#30343A]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-44 lg:w-52 min-w-0">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search files..."
                className="w-full bg-[#17191C] border border-[#30343A] rounded-md pl-7 pr-6 py-1 text-xs text-[#E8EAED] placeholder-[#747C87] outline-none focus:border-blue-500/60 transition"
              />
              <div className="w-3.5 h-3.5 text-[#747C87] absolute left-2 top-2 pointer-events-none">
                {Icon.search}
              </div>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-1.5 top-1.5 p-0.5 text-[#A0A6AF] hover:text-[#E8EAED] transition cursor-pointer"
                >
                  <div className="w-3 h-3">{Icon.x}</div>
                </button>
              )}
            </div>

            {attachments.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1 text-xs rounded-md bg-[#1D2024] hover:bg-[#23272D] text-[#A0A6AF] hover:text-[#E8EAED] border border-[#30343A] transition cursor-pointer shrink-0"
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
            )}

            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => setConfirmDelete({ type: 'batch', count: selectedIds.size })}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 font-semibold transition cursor-pointer shrink-0 disabled:opacity-50"
              >
                <div className="w-3.5 h-3.5">{Icon.trash}</div>
                <span>Delete ({selectedIds.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#0d0e11]">
          {isLoading && attachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 gap-2 text-[#747C87] text-xs">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading upload assets...</span>
            </div>
          ) : attachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 gap-1 text-[#747C87] text-xs">
              <div className="w-8 h-8 text-[#747C87]/40 mb-1">{Icon.folder}</div>
              <span>No upload assets found in workspace.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {attachments.map(att => (
                <AssetCard
                  key={att.filename}
                  attachment={att}
                  isSelected={selectedIds.has(att.filename)}
                  onToggleSelect={handleToggleSelect}
                  onPreviewItem={onPreviewItem}
                  onAttachToPrompt={handleAttachToPrompt}
                  onDeleteSingle={(filename, e) => {
                    e?.stopPropagation();
                    setConfirmDelete({ type: 'single', target: filename });
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Custom Confirmation Modal for Deletion */}
        {confirmDelete && (
          <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#181A1F] border border-[#2D3139] rounded-xl p-5 max-w-sm w-full shadow-2xl text-center space-y-4">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center border border-rose-500/20">
                <div className="w-5 h-5">{Icon.trash}</div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">
                  {confirmDelete.type === 'batch'
                    ? `Delete ${confirmDelete.count} selected files?`
                    : 'Delete this asset?'}
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  {confirmDelete.type === 'batch'
                    ? 'This will permanently remove the selected attachments from disk.'
                    : `Permanently delete "${confirmDelete.target}"? This cannot be undone.`}
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 border border-zinc-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    confirmDelete.type === 'batch'
                      ? executeDeleteBatch()
                      : executeDeleteSingle(confirmDelete.target)
                  }
                  disabled={isDeleting}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-rose-900/30"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
