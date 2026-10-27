import React, { useState, useEffect } from 'react';
import { toast } from '../services/toastService';
import { FileIcon } from '../constants/fileIcons';
import { Icon } from '../constants/icons';
import { api } from '../services/api';

export function ReviewChangesModal({ isOpen, onClose }) {
  const [reviewData, setReviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchReview = async () => {
    setIsLoading(true);
    try {
      const data = await api.getGitReview();
      setReviewData(data);
      setSelectedFile(null);
    } catch (err) {
      toast.error(err.message || 'Failed to connect to git review endpoint', 'Network Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReview();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const files = reviewData?.files || [];
  const activeFileObj = selectedFile ? files.find(f => f.file === selectedFile) : null;
  const displayedDiff = activeFileObj
    ? activeFileObj.diff || 'No diff available for this file.'
    : reviewData?.diff || 'No changes detected.';

  const handleCopy = () => {
    if (!displayedDiff) return;
    navigator.clipboard.writeText(displayedDiff);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const diffLines = displayedDiff.split('\n');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-100">Review Changes</h3>
                {reviewData?.summary && reviewData.summary.total_files > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/60 text-zinc-300">
                    {reviewData.summary.total_files} file
                    {reviewData.summary.total_files !== 1 ? 's' : ''}
                    {reviewData.summary.total_additions > 0 && (
                      <span className="text-emerald-400 ml-1.5">
                        +{reviewData.summary.total_additions}
                      </span>
                    )}
                    {reviewData.summary.total_deletions > 0 && (
                      <span className="text-rose-400 ml-1">
                        -{reviewData.summary.total_deletions}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                Inspecting workspace working tree and recent patches
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchReview}
              title="Refresh Changes"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Changed Files Navigation */}
          {files.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Files ({files.length})
                </h4>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 transition"
                  >
                    Show all files
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className={`flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-lg font-mono border transition ${
                    selectedFile === null
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <span>All Files</span>
                </button>
                {files.map((f, idx) => {
                  const isSelected = selectedFile === f.file;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedFile(f.file)}
                      className={`flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-lg font-mono border transition max-w-full truncate ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800/50'
                      }`}
                    >
                      <span
                        className={`px-1 py-0.2 rounded font-bold text-[9px] shrink-0 ${
                          f.status === 'M'
                            ? 'bg-amber-500/20 text-amber-300'
                            : f.status === 'A' || f.status === '??'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {f.status}
                      </span>
                      <FileIcon path={f.file} className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[150px]">{f.file.split('/').pop()}</span>
                      {(f.additions > 0 || f.deletions > 0) && (
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {f.additions > 0 && (
                            <span className="text-emerald-400">+{f.additions} </span>
                          )}
                          {f.deletions > 0 && <span className="text-rose-400">-{f.deletions}</span>}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Diff Preview Header & Actions */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {selectedFile ? `Patch: ${selectedFile}` : 'Patch Diff'}
              </h4>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition p-1 rounded hover:bg-zinc-800"
              >
                <span className="w-3.5 h-3.5">{copied ? Icon.check : Icon.copy}</span>
                <span>{copied ? 'Copied' : 'Copy Diff'}</span>
              </button>
            </div>

            <div className="p-3.5 bg-zinc-950 border border-zinc-800/90 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-80 whitespace-pre text-zinc-300 select-text">
              {diffLines.map((line, idx) => {
                const isAdd = line.startsWith('+') && !line.startsWith('+++');
                const isDel = line.startsWith('-') && !line.startsWith('---');
                const isHunk = line.startsWith('@@');
                const isHeader =
                  line.startsWith('diff') ||
                  line.startsWith('index') ||
                  line.startsWith('---') ||
                  line.startsWith('+++');
                return (
                  <div
                    key={idx}
                    className={`py-0.2 rounded-sm ${
                      isAdd
                        ? 'text-emerald-400 bg-emerald-950/20'
                        : isDel
                          ? 'text-rose-400 bg-rose-950/20'
                          : isHunk
                            ? 'text-cyan-400 font-bold bg-cyan-950/20 px-1 my-0.5 rounded'
                            : isHeader
                              ? 'text-blue-400 font-bold opacity-80'
                              : 'text-zinc-400'
                    }`}
                  >
                    {line || ' '}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between text-xs">
          <span className="text-zinc-500 text-[11px]">Synced with local Git workspace</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition active:scale-95 border border-zinc-700/80"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
