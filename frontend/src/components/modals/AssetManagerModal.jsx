import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../constants/icons';
import { FileIcon } from '../../constants/fileIcons';
import { api } from '../../services/api';
import { toast } from '../../services/toastService';
import { formatFileSize } from '../chat/AttachmentPreview';

export default function AssetManagerModal({ isOpen, onClose, onSelectAttachment, onPreviewItem }) {
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [totalBytes, setTotalBytes] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAttachments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getAttachments({ search, category });
      if (res && res.success) {
        setAttachments(res.attachments || []);
        setTotalBytes(res.total_bytes || 0);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load assets', 'Asset Manager');
    } finally {
      setIsLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    if (isOpen) {
      fetchAttachments();
      setSelectedIds(new Set());
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

  const handleDeleteSingle = async (filename, e) => {
    e?.stopPropagation();
    if (!confirm(`Delete ${filename}?`)) return;
    try {
      await api.deleteAttachment(filename);
      toast.success(`Deleted ${filename}`, 'Asset Removed');
      setAttachments(prev => prev.filter(a => a.filename !== filename));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(filename);
        return next;
      });
    } catch (err) {
      toast.error(err.message || 'Failed to delete file', 'Delete Error');
    }
  };

  const handleDeleteBatch = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Permanently delete ${count} selected file${count > 1 ? 's' : ''}?`)) return;

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
    { id: 'all', label: 'All Files' },
    { id: 'image', label: 'Images' },
    { id: 'document', label: 'Documents' },
    { id: 'code', label: 'Code' },
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
                Browse, reuse, inspect, and clean uploaded workspace media
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
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {categories.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer shrink-0 ${
                  category === c.id
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'bg-[#1D2024] text-[#A0A6AF] hover:text-[#E8EAED] border border-[#30343A]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Search & Batch Actions */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-48 lg:w-56 min-w-0">
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
                onClick={handleDeleteBatch}
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
              <span>Loading uploads directory...</span>
            </div>
          ) : attachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 gap-1 text-[#747C87] text-xs">
              <div className="w-8 h-8 text-[#747C87]/40 mb-1">{Icon.folder}</div>
              <span>No upload assets found in workspace.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {attachments.map(att => {
                const isSelected = selectedIds.has(att.filename);
                return (
                  <div
                    key={att.filename}
                    onClick={() => handleToggleSelect(att.filename)}
                    className={`group relative rounded-lg border p-2.5 flex flex-col justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-950/20 border-blue-500/60 ring-1 ring-blue-500/30'
                        : 'bg-[#141619] border-[#30343A] hover:border-[#40464F] hover:bg-[#1A1D21]'
                    }`}
                  >
                    {/* Selection Checkbox */}
                    <div
                      className={`absolute top-2 right-2 w-4 h-4 rounded border flex items-center justify-center transition z-10 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'border-[#40464F] bg-[#101113]/80 group-hover:border-zinc-400'
                      }`}
                    >
                      {isSelected && <div className="w-2.5 h-2.5">{Icon.check}</div>}
                    </div>

                    {/* Preview Thumbnail or Icon */}
                    <div className="h-28 rounded-md bg-[#101113] border border-[#262A30] overflow-hidden flex items-center justify-center mb-2 relative">
                      {att.is_image ? (
                        <img
                          src={att.url}
                          alt={att.original_name}
                          loading="lazy"
                          className="w-full h-full object-cover transition group-hover:scale-105 duration-200"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-[#A0A6AF]">
                          <FileIcon path={att.original_name} className="w-8 h-8" />
                          <span className="text-[10px] font-mono uppercase tracking-wider">
                            {att.category}
                          </span>
                        </div>
                      )}

                      {/* Preview Overlay Button */}
                      {onPreviewItem && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onPreviewItem(att);
                          }}
                          title="Inspect Asset"
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white"
                        >
                          <span className="p-1.5 rounded-full bg-black/60 border border-white/20 text-xs">
                            <div className="w-3.5 h-3.5">{Icon.maximize}</div>
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 space-y-1">
                      <p
                        className="text-xs font-medium text-[#E8EAED] truncate"
                        title={att.original_name}
                      >
                        {att.original_name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-[#747C87] font-mono">
                        <span>{formatFileSize(att.size)}</span>
                        <span>{att.created_at.split(' ')[0]}</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between gap-1.5 pt-2 mt-2 border-t border-[#262A30]">
                      <button
                        type="button"
                        onClick={e => handleAttachToPrompt(att, e)}
                        title="Add to current prompt"
                        className="flex-1 py-1 px-2 rounded bg-[#1D2024] hover:bg-blue-600 hover:text-white border border-[#30343A] text-[#E8EAED] text-[11px] font-medium transition text-center"
                      >
                        Attach
                      </button>
                      <button
                        type="button"
                        onClick={e => handleDeleteSingle(att.filename, e)}
                        title="Delete file permanently"
                        className="p-1 rounded text-[#747C87] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <div className="w-3.5 h-3.5">{Icon.trash}</div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
