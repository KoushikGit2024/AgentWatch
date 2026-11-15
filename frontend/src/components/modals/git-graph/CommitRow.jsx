/**
 * High-performance commit row representing a single commit node.
 * Fully responsive across mobile screens and large monitors.
 * Uses Lucide icons only. Adheres strictly to AGENTS.md (< 500 LOC).
 */
import React from 'react';
import { Tag, GitBranch, Archive } from 'lucide-react';

export function CommitRow({ commit, isSelected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(commit.sha)}
      style={{ height: '36px' }}
      className={`group flex items-center px-2 sm:px-3 border-b border-[#212429] cursor-pointer transition-colors text-xs select-none ${
        isSelected
          ? 'bg-blue-600/15 border-blue-500/30 text-white'
          : 'hover:bg-[#1D2025] text-[#C9D1D9]'
      }`}
    >
      {/* Short Hash */}
      <span className="font-mono text-[11px] text-[#7C9FC5] w-14 sm:w-16 flex-none font-semibold">
        {commit.short_sha}
      </span>

      {/* Badges for Branches, Stashes & Tags (responsive clamp) */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-none mr-1.5 sm:mr-2 max-w-[160px] sm:max-w-none overflow-hidden">
        {commit.is_head && (
          <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            HEAD
          </span>
        )}

        {/* Git Stash badge (Pink/Fuchsia badge matching Git Keizu) */}
        {commit.is_stash && commit.tags?.length > 0 && (
          <span className="inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-pink-500/20 text-pink-300 border border-pink-500/40">
            <Archive className="w-2.5 h-2.5 flex-none" />
            <span className="truncate max-w-[80px] sm:max-w-[110px]">{commit.tags[0]}</span>
          </span>
        )}

        {/* Branch badges */}
        {commit.branches?.slice(0, 2).map(b => (
          <span
            key={`branch-${b}`}
            className="inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/25"
          >
            <GitBranch className="w-2.5 h-2.5 flex-none" />
            <span className="truncate max-w-[60px] sm:max-w-[110px]">{b}</span>
          </span>
        ))}

        {/* Tag badges (non-stash) */}
        {!commit.is_stash &&
          commit.tags?.slice(0, 1).map(t => (
            <span
              key={`tag-${t}`}
              className="inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/25"
            >
              <Tag className="w-2.5 h-2.5 flex-none" />
              <span className="truncate max-w-[50px] sm:max-w-[90px]">{t}</span>
            </span>
          ))}
      </div>

      {/* Commit Subject / Message */}
      <span className="flex-1 truncate font-normal pr-2 sm:pr-4 group-hover:text-white transition-colors">
        {commit.subject}
      </span>

      {/* Author Name - hidden on very small viewports */}
      <span className="hidden md:inline-block w-24 sm:w-28 flex-none truncate text-[#8B949E] text-right font-medium">
        {commit.author_name}
      </span>

      {/* Date - hidden on mobile viewports */}
      <span className="hidden sm:inline-block w-28 sm:w-32 flex-none text-[#6E7681] text-right text-[11px] pl-1.5">
        {commit.date ? commit.date.slice(0, 10) : ''}
      </span>
    </div>
  );
}
