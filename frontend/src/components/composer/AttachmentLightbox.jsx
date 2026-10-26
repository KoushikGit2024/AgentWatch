import React from 'react';
import { Icon } from '../../constants/icons';
import { formatFileSize } from '../chat/AttachmentPreview';

export default function AttachmentLightbox({ item, onClose }) {
    if (!item) return null;

    const imageUrl = item.url || item.previewUrl;
    const title = item.original_name || item.filename || 'Attached Image';

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 select-none"
            onClick={onClose}
        >
            <div
                className="relative max-w-4xl max-h-[90dvh] w-full overflow-hidden rounded-lg border border-[#30343A] bg-[#17191C] p-3 shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-2.5 border-b border-[#262A30] px-1 text-xs">
                    <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[#E8EAED] font-medium truncate">
                            {title}
                        </span>
                        {item.size && (
                            <span className="text-[10px] text-[#A0A6AF] font-mono tabular-nums px-1.5 py-0.5 rounded bg-[#101113] border border-[#30343A]">
                                {formatFileSize(item.size)}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {imageUrl && (
                            <a
                                href={imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open original in new tab"
                                className="p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] transition"
                            >
                                <div className="w-4 h-4">{Icon.maximize}</div>
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close preview"
                            title="Close preview (Esc)"
                            className="p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer"
                        >
                            <div className="w-4 h-4">{Icon.x}</div>
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center overflow-hidden p-2 min-h-0">
                    <img
                        src={imageUrl}
                        alt={title}
                        className="max-h-[76dvh] max-w-full rounded object-contain"
                    />
                </div>
            </div>
        </div>
    );
}
