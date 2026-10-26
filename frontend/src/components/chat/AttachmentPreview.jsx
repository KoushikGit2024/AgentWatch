import React from 'react';
import { Icon } from '../../constants/icons';
import { FileIcon } from '../../constants/fileIcons';

export const formatFileSize = bytes => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  return `${size} ${units[i]}`;
};

export default function AttachmentPreview({
  attachments,
  onRemove,
  onPreviewImage,
  className = '',
}) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div
      className={`flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 max-w-full select-none ${className}`}
    >
      {attachments.map((att, idx) => {
        const isImg =
          att.is_image || att.type?.startsWith('image/') || att.content_type?.startsWith('image/');
        const displayUrl = att.url || att.previewUrl;
        const isPending = Boolean(att.isPending);

        if (isImg && displayUrl) {
          return (
            <div
              key={att.id || idx}
              className={`relative group shrink-0 rounded-xl overflow-hidden border bg-zinc-900 shadow-sm transition ${
                isPending
                  ? 'border-blue-500/60 opacity-80'
                  : 'border-zinc-700/80 hover:border-zinc-500'
              }`}
            >
              <img
                src={displayUrl}
                alt={att.original_name || att.filename || 'Attached image'}
                onClick={() => !isPending && onPreviewImage && onPreviewImage(att)}
                title={isPending ? 'Uploading…' : 'Click to maximize image'}
                className={`w-16 h-16 object-cover ${isPending ? 'cursor-wait' : 'cursor-zoom-in group-hover:scale-105'} transition`}
              />
              {/* Uploading Spinner */}
              {isPending && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center pointer-events-none">
                  <svg
                    className="w-4 h-4 animate-spin text-blue-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                </div>
              )}
              {/* Remove button */}
              {!isPending && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onRemove(idx);
                  }}
                  title="Remove image"
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-black/75 hover:bg-rose-600 text-zinc-300 hover:text-white transition shadow opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <div className="w-3.5 h-3.5">{Icon.x}</div>
                </button>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-1 py-0.5 text-[9px] text-zinc-300 truncate font-mono">
                {isPending ? 'Uploading…' : formatFileSize(att.size)}
              </div>
            </div>
          );
        }

        // Regular File
        const filename = att.original_name || att.filename || 'File';
        return (
          <div
            key={att.id || idx}
            className={`relative group shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border bg-zinc-900 shadow-sm text-xs max-w-[200px] ${
              isPending ? 'border-blue-500/60 opacity-80' : 'border-zinc-750/90'
            }`}
          >
            <FileIcon path={filename} className="w-4 h-4 shrink-0" />
            <div className="min-w-0 flex-1 truncate">
              <div className="font-mono text-[11px] text-zinc-200 truncate" title={filename}>
                {filename}
              </div>
              <div className="text-[9px] text-zinc-400 font-sans">
                {isPending ? 'Uploading…' : formatFileSize(att.size)}
              </div>
            </div>
            {isPending ? (
              <svg
                className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <button
                type="button"
                onClick={() => onRemove(idx)}
                title="Remove attachment"
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <div className="w-3.5 h-3.5">{Icon.x}</div>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
