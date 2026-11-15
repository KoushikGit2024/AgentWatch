/**
 * Drawer / Bottom Sheet showing detailed commit metadata, changed files, and unified diff.
 * Matches Git Keizu inspector with tabs for File Tree View, Flat List, and Unified Diff.
 * Fully responsive: desktop slide-in side drawer, mobile bottom sheet overlay.
 * Uses Lucide icons only. Adheres strictly to AGENTS.md (< 500 LOC limit).
 */
import React, { useState } from 'react';
import {
  Copy,
  Check,
  FileText,
  X,
  AlertCircle,
  FolderTree,
  List,
  SplitSquareVertical,
} from 'lucide-react';
import { CommitFileTree } from './CommitFileTree';

export function CommitDetailsDrawer({ commit, diffData, isLoading, onClose }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('tree'); // 'tree' | 'flat' | 'diff'

  if (!commit) return null;

  const handleCopySha = () => {
    if (commit?.sha) {
      navigator.clipboard.writeText(commit.sha);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const files = diffData?.files || [];

  return (
    <div className="absolute inset-x-0 bottom-0 top-1/3 sm:relative sm:inset-auto sm:top-0 sm:w-96 flex-none flex flex-col border-t sm:border-t-0 sm:border-l border-[#262A30] bg-[#17191C] text-xs z-20 shadow-2xl transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#262A30] bg-[#1D2024]">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-[#E8EAED]">Commit Inspection</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[#8B949E] hover:text-white p-1 rounded hover:bg-[#2A2E35] transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Meta Info */}
      <div className="p-3 border-b border-[#212429] space-y-2 bg-[#141619] flex-none">
        <div className="flex items-center justify-between">
          <span className="text-[#8B949E]">SHA:</span>
          <button
            type="button"
            onClick={handleCopySha}
            className="flex items-center gap-1 font-mono text-blue-400 hover:text-blue-300 transition"
            title="Click to copy full SHA"
          >
            <span>{commit.sha.slice(0, 10)}...</span>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#8B949E]">Author:</span>
          <span className="text-[#E8EAED] font-medium truncate max-w-[200px]">
            {commit.author_name} ({commit.author_email})
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#8B949E]">Date:</span>
          <span className="text-[#A0A6AD] text-[11px]">{commit.date}</span>
        </div>

        <div className="pt-1">
          <p className="text-[#E8EAED] font-medium leading-relaxed bg-[#1A1D21] p-2 rounded border border-[#2B3038] line-clamp-3 sm:line-clamp-none">
            {commit.subject}
          </p>
        </div>

        {/* Tab Switcher: Tree View vs Flat List vs Unified Diff */}
        <div className="flex items-center gap-1 pt-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('tree')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition flex-none ${
              activeTab === 'tree'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                : 'text-[#8B949E] hover:text-[#E8EAED] hover:bg-[#1F2227]'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Tree ({files.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('flat')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition flex-none ${
              activeTab === 'flat'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                : 'text-[#8B949E] hover:text-[#E8EAED] hover:bg-[#1F2227]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diff')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition flex-none ${
              activeTab === 'diff'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                : 'text-[#8B949E] hover:text-[#E8EAED] hover:bg-[#1F2227]'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Diff View</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-3 bg-[#0D1117] font-mono text-[11px] leading-5 text-[#C9D1D9]">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-[#8B949E]">
            Loading commit details...
          </div>
        ) : activeTab === 'tree' ? (
          /* File Tree matching Git Keizu */
          <div className="font-sans">
            <CommitFileTree files={files} />
          </div>
        ) : activeTab === 'flat' ? (
          /* Flat file list with status badges and additions / deletions */
          <div className="space-y-1 font-sans">
            {files.length === 0 ? (
              <div className="text-[#6E7681] text-center py-8">No changed files recorded</div>
            ) : (
              files.map((f, i) => {
                const badgeStyle = {
                  A: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                  M: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                  D: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
                  R: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
                }[f.status || 'M'] || 'bg-blue-500/20 text-blue-400 border-blue-500/30';

                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-[#161B22] text-[#C9D1D9] transition"
                  >
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[9px] font-bold border ${badgeStyle} flex-none`}>
                        {f.status || 'M'}
                      </span>
                      <span className="truncate font-mono text-[11px] text-[#A5D6FF]">{f.path}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[10px] flex-none">
                      {f.additions > 0 && <span className="text-emerald-400">+{f.additions}</span>}
                      {f.deletions > 0 && <span className="text-rose-400">-{f.deletions}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : diffData?.diff ? (
          /* Unified Diff View */
          <pre className="whitespace-pre-wrap break-all">
            {diffData.diff.split('\n').map((line, i) => {
              let lineStyle = 'text-[#C9D1D9]';
              if (line.startsWith('+') && !line.startsWith('+++')) {
                lineStyle = 'bg-emerald-950/40 text-emerald-300';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                lineStyle = 'bg-rose-950/40 text-rose-300';
              } else if (line.startsWith('@@')) {
                lineStyle = 'text-cyan-400 font-semibold';
              }
              return (
                <div key={i} className={`px-1 rounded-sm ${lineStyle}`}>
                  {line}
                </div>
              );
            })}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-48 text-[#6E7681] gap-1.5">
            <AlertCircle className="w-4 h-4" />
            <span>No diff available</span>
          </div>
        )}
      </div>
    </div>
  );
}
