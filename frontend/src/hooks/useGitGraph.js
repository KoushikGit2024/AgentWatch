/**
 * Custom React Hook for Git DAG Graph Data and State.
 * Handles async fetching, search filtering, branch selection, and commit inspection.
 * Adheres strictly to AGENTS.md (< 500 LOC limit).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { gitGraphApi } from '../services/gitGraphApi';

export function useGitGraph(isOpen) {
  const [data, setData] = useState({
    has_git: true,
    current_branch: '',
    branches: [],
    commits: [],
    lines: [],
    total_commits: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedCommitSha, setSelectedCommitSha] = useState(null);
  const [selectedCommitDiff, setSelectedCommitDiff] = useState(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);

  // Fetch graph data on explicit user demand or modal open
  const loadGraph = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await gitGraphApi.fetchGraph(200);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load git graph');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reload ONLY when modal opens, without auto-selecting any commit
  useEffect(() => {
    if (isOpen) {
      loadGraph();
    } else {
      setSelectedCommitSha(null);
      setSelectedCommitDiff(null);
    }
  }, [isOpen, loadGraph]);

  // Load commit diff only when a commit is explicitly selected by the user
  useEffect(() => {
    if (!selectedCommitSha || !isOpen) {
      setSelectedCommitDiff(null);
      return;
    }
    let isMounted = true;
    setIsLoadingDiff(true);

    gitGraphApi
      .fetchCommitDiff(selectedCommitSha)
      .then(diffData => {
        if (isMounted) setSelectedCommitDiff(diffData);
      })
      .catch(() => {
        if (isMounted) setSelectedCommitDiff(null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDiff(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCommitSha, isOpen]);

  // Filter commits by branch or search query
  const filteredCommits = useMemo(() => {
    if (!data.commits) return [];
    return data.commits.filter(commit => {
      // 1. Branch filter
      if (selectedBranch !== 'ALL') {
        const matchesBranch =
          commit.branches?.includes(selectedBranch) ||
          commit.branches?.some(b => b.endsWith(`/${selectedBranch}`));
        if (!matchesBranch) return false;
      }
      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSha = commit.sha.toLowerCase().includes(q);
        const matchSubject = commit.subject.toLowerCase().includes(q);
        const matchAuthor = commit.author_name.toLowerCase().includes(q);
        return matchSha || matchSubject || matchAuthor;
      }
      return true;
    });
  }, [data.commits, selectedBranch, searchQuery]);

  return {
    hasGit: data.has_git,
    currentBranch: data.current_branch,
    branches: data.branches,
    commits: filteredCommits,
    lines: data.lines || [],
    totalCommits: data.total_commits,
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
    refresh: loadGraph,
  };
}
