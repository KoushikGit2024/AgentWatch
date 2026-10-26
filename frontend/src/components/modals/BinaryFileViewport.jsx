import React from 'react';
import { Icon } from '../../constants/icons';

export function BinaryFileViewport({ fileData, activePath }) {
  const rawUrl = fileData?.raw_url || `/api/v1/files/raw?path=${encodeURIComponent(activePath)}`;
  const filename = fileData?.filename || activePath.split('/').pop() || 'File';
  const ext = (fileData?.extension || activePath.split('.').pop() || 'bin').toUpperCase();
  const sizeStr = fileData?.size_bytes
    ? fileData.size_bytes < 1024
      ? `${fileData.size_bytes} B`
      : fileData.size_bytes < 1048576
        ? `${(fileData.size_bytes / 1024).toFixed(1)} KB`
        : `${(fileData.size_bytes / 1048576).toFixed(1)} MB`
    : null;

  return (
    <div className="p-6 text-center flex-1 flex flex-col items-center justify-center max-w-md mx-auto select-text">
      <div className="w-12 h-12 rounded-2xl bg-[#1D2024] border border-[#30343A] flex items-center justify-center text-[#7C9FC5] mb-3 shadow-sm">
        <div className="w-6 h-6">{Icon.file}</div>
      </div>
      <h3 className="text-sm font-semibold text-[#E8EAED] tracking-tight mb-1">
        Binary or Non-Text File
      </h3>
      <p className="text-xs text-[#A0A6AF] leading-relaxed mb-2">
        This file ({ext}) contains binary data or an unsupported encoding and cannot be rendered as
        text in the editor.
      </p>
      {sizeStr && <div className="text-[11px] font-mono text-[#747C87] mb-4">Size: {sizeStr}</div>}
      <a
        href={rawUrl}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="px-4 py-2 rounded-md bg-[#7C9FC5]/20 hover:bg-[#7C9FC5]/30 border border-[#7C9FC5]/40 text-xs font-medium text-[#7C9FC5] transition cursor-pointer flex items-center gap-2"
      >
        <div className="w-4 h-4">{Icon.externalLink}</div>
        <span>Download {filename}</span>
      </a>
    </div>
  );
}
