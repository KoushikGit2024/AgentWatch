/**
 * Git DAG Graph Modal Component.
 * Pure React implementation with zero third-party graph dependencies.
 * Uses Lucide icons only. Adheres strictly to AGENTS.md (< 500 LOC).
 */
import React from 'react';
import {
  GitFork,
  GitBranch,
  Search,
  RefreshCw,
  X,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { useGitGraph } from '../../hooks/useGitGraph';
import { GitGraphSvg } from './git-graph/GitGraphSvg';
import { CommitRow } from './git-graph/CommitRow';
import { CommitDetailsDrawer } from './git-graph/CommitDetailsDrawer';

export function GitGraphModal({ isOpen, onClose }) {
  const {
    hasGit,
    currentBranch,
    branches,
    commits,
    lines,
    totalCommits,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    selectedBranch,
    setSelectedBranch,
    selectedCommitSha,
    setSelectedCommitSha,
    selectedCommitDiff,
    isLoadingDiff,
    refresh,
  } = useGitGraph(isOpen);

  if (!isOpen) return null;

  const selectedCommit = commits.find(c => c.sha === selectedCommitSha);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-1.5 sm:p-4">
      <div className="relative flex flex-col w-full max-w-6xl h-[94vh] sm:h-[88vh] rounded-lg sm:rounded-xl border border-[#30343A] bg-[#141619] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-[#262A30] bg-[#191C20] flex-none gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1 sm:p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex-none">
              <GitFork className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-xs sm:text-sm font-semibold text-[#E8EAED] truncate">Git Graph</h2>
                {currentBranch && (
                  <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium bg-[#21262D] text-[#58A6FF] border border-[#30363D] truncate max-w-[120px] sm:max-w-[200px]">
                    <GitBranch className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-none" />
                    <span className="truncate">{currentBranch}</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#8B949E] hidden xs:block truncate">
                Topological commit history ({totalCommits} commits)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-none">
            {/* Branch Filter Dropdown */}
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="bg-[#212429] border border-[#30343A] text-[11px] sm:text-xs text-[#E8EAED] rounded px-2 py-1 sm:px-2.5 sm:py-1.5 focus:outline-none focus:border-blue-500 transition max-w-[100px] sm:max-w-[180px]"
            >
              <option value="ALL">All Branches</option>
              {branches.map(b => (
                <option key={b.name} value={b.name}>
                  {b.name} {b.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={refresh}
              disabled={isLoading}
              title="Refresh Graph"
              className="p-1 sm:p-1.5 rounded text-[#8B949E] hover:text-white hover:bg-[#252930] transition border border-transparent hover:border-[#30343A]"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close Graph"
              className="p-1 sm:p-1.5 rounded text-[#8B949E] hover:text-white hover:bg-[#252930] transition border border-transparent hover:border-[#30343A]"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Filter / Search */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 border-b border-[#212429] bg-[#16181B] flex-none gap-2">
          <div className="relative flex-1 sm:flex-none sm:w-80">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#6E7681]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search hash, message, or author..."
              className="w-full bg-[#1F2227] border border-[#2D3137] rounded pl-8 pr-3 py-1 text-xs text-[#E8EAED] placeholder-[#6E7681] focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8B949E] flex-none">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>{commits.length} commits</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="relative flex-1 flex overflow-hidden">
          {!hasGit ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#8B949E] p-6 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <p className="text-sm font-medium">No Git repository detected in the active workspace.</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-rose-400 p-6 text-center space-y-2">
              <AlertTriangle className="w-8 h-8" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : (
            <>
              {/* Scrollable DAG Area */}
              <div className="flex-1 flex overflow-auto">
                {/* SVG Visualizer Column */}
                <GitGraphSvg
                  commits={commits}
                  lines={lines}
                  selectedSha={selectedCommitSha}
                />

                {/* Commit Rows List */}
                <div className="flex-1 min-w-[280px] sm:min-w-[450px]">
                  {commits.map(commit => (
                    <CommitRow
                      key={commit.sha}
                      commit={commit}
                      isSelected={commit.sha === selectedCommitSha}
                      onSelect={setSelectedCommitSha}
                    />
                  ))}
                </div>
              </div>

              {/* Drawer for Selected Commit Diff (Side on desktop, bottom sheet on mobile) */}
              {selectedCommit && (
                <CommitDetailsDrawer
                  commit={selectedCommit}
                  diffData={selectedCommitDiff}
                  isLoading={isLoadingDiff}
                  onClose={() => setSelectedCommitSha(null)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default GitGraphModal;
