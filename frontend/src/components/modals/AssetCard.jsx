import React from 'react';
import { Icon } from '../../constants/icons';
import { FileIcon } from '../../constants/fileIcons';
import { formatFileSize } from '../chat/AttachmentPreview';

export default function AssetCard({
  attachment,
  isSelected,
  onToggleSelect,
  onPreviewItem,
  onAttachToPrompt,
  onDeleteSingle,
}) {
  const att = attachment;
  const isChatScope = att.scope === 'chat';

  return (
    <div
      onClick={() => onToggleSelect(att.filename)}
      className={`group relative rounded-lg border p-2.5 flex flex-col justify-between transition cursor-pointer ${
        isSelected
          ? 'bg-blue-950/20 border-blue-500/60 ring-1 ring-blue-500/30'
          : 'bg-[#141619] border-[#30343A] hover:border-[#40464F] hover:bg-[#1A1D21]'
      }`}
    >
      {/* Top Scope Badge & Selection Checkbox */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider font-semibold border ${
            isChatScope
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}
          title={isChatScope ? 'Uploaded within active conversation' : 'Global out-of-chat upload'}
        >
          {isChatScope ? 'Chat Upload' : 'Global'}
        </span>

        <div
          className={`w-4 h-4 rounded border flex items-center justify-center transition z-10 ${
            isSelected
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'border-[#40464F] bg-[#101113]/80 group-hover:border-zinc-400'
          }`}
        >
          {isSelected && <div className="w-2.5 h-2.5">{Icon.check}</div>}
        </div>
      </div>

      {/* Preview Thumbnail or Icon */}
      <div className="h-26 rounded-md bg-[#101113] border border-[#262A30] overflow-hidden flex items-center justify-center mb-2 relative">
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
          <span>{att.created_at ? att.created_at.split(' ')[0] : ''}</span>
        </div>
      </div>

      {/* Action Bar: Both chat and out-of-chat uploads can be attached or deleted */}
      <div className="flex items-center justify-between gap-1.5 pt-2 mt-2 border-t border-[#262A30]">
        <button
          type="button"
          onClick={e => onAttachToPrompt(att, e)}
          title="Add to current prompt"
          className="flex-1 py-1 px-2 rounded bg-[#1D2024] hover:bg-blue-600 hover:text-white border border-[#30343A] text-[#E8EAED] text-[11px] font-medium transition text-center"
        >
          Attach
        </button>
        <button
          type="button"
          onClick={e => onDeleteSingle(att.filename, e)}
          title={isChatScope ? 'Delete chat upload permanently' : 'Delete out-of-chat upload permanently'}
          className="p-1 rounded text-[#747C87] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
        >
          <div className="w-3.5 h-3.5">{Icon.trash}</div>
        </button>
      </div>
    </div>
  );
}

