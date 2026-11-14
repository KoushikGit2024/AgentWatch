import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
import { FileIcon } from '../../constants/fileIcons';
import { formatFileSize } from './AttachmentPreview';
import AttachmentLightbox from '../composer/AttachmentLightbox';

export function UserChatTurn({ turn, timeStr }) {
  const [copied, setCopied] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [isUserTextExpanded, setIsUserTextExpanded] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(turn.text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const userText = turn.text || '';
  const isLongUserText = userText.length > 280 || (userText.match(/\n/g) || []).length >= 4;

  return (
    <div className="chat-turn-item flex justify-end w-full min-w-0 max-w-full">
      <div className="max-w-[90%] sm:max-w-[82%] min-w-0 rounded-xl bg-[#1D2024]/90 border border-[#30343A] shadow-sm px-4 py-3 text-xs sm:text-sm text-[#E8EAED] break-words [overflow-wrap:anywhere] overflow-hidden space-y-2.5">
        <div className="flex items-center justify-between gap-3 text-[10px] text-[#A0A6AF] font-mono border-b border-[#262A30] pb-1.5">
          <span className="font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            User Prompt
          </span>
          {timeStr && <span className="tabular-nums text-zinc-400">{timeStr}</span>}
        </div>

        {turn.attachments && turn.attachments.some(a => a.is_image) && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {turn.attachments
              .filter(a => a.is_image)
              .map((att, idx) => (
                <button
                  key={att.id || idx}
                  type="button"
                  onClick={() => setPreviewItem(att)}
                  title="Click to inspect image"
                  className="block rounded-lg overflow-hidden border border-[#30343A] hover:border-blue-500/50 max-w-[180px] max-h-44 cursor-zoom-in text-left transition"
                >
                  <img
                    src={att.url}
                    alt={att.original_name || att.filename}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
          </div>
        )}

        {turn.attachments && turn.attachments.some(a => !a.is_image) && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {turn.attachments
              .filter(a => !a.is_image)
              .map((att, idx) => (
                <a
                  key={att.id || idx}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#101113] hover:bg-[#17191C] border border-[#30343A] hover:border-cyan-500/30 text-xs text-[#E8EAED] transition max-w-full truncate"
                >
                  <FileIcon
                    path={att.original_name || att.filename}
                    className="w-3.5 h-3.5 shrink-0"
                  />
                  <span className="truncate font-mono text-[11px]">
                    {att.original_name || att.filename}
                  </span>
                  {att.size && (
                    <span className="text-[9px] text-[#A0A6AF] shrink-0 font-mono tabular-nums">
                      ({formatFileSize(att.size)})
                    </span>
                  )}
                </a>
              ))}
          </div>
        )}

        {userText && (
          <div className="space-y-1.5">
            <div
              className={`whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere] ${
                !isUserTextExpanded && isLongUserText ? 'max-h-28 overflow-hidden relative' : ''
              }`}
            >
              <p>{userText}</p>
            </div>
            {isLongUserText && (
              <div className="flex items-center justify-between pt-1 border-t border-[#262A30] text-xs text-[#A0A6AF]">
                <button
                  type="button"
                  onClick={() => setIsUserTextExpanded(v => !v)}
                  className="font-medium text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition flex items-center gap-1"
                >
                  <span>{isUserTextExpanded ? 'Collapse message' : 'Expand full message'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-1.5 py-0.5 rounded hover:bg-[#23272D] text-[11px] transition flex items-center gap-1 cursor-pointer"
                >
                  <div className="w-3 h-3 text-blue-400">{copied ? Icon.check : Icon.copy}</div>
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
            {!isLongUserText && (
              <div className="flex items-center justify-end pt-1 border-t border-[#262A30] text-xs text-[#A0A6AF]">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-1.5 py-0.5 rounded hover:bg-[#23272D] text-[11px] transition flex items-center gap-1 cursor-pointer"
                >
                  <div className="w-3 h-3 text-blue-400">{copied ? Icon.check : Icon.copy}</div>
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AttachmentLightbox item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  );
}
