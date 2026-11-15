/**
 * Custom React Hook for Git DAG Graph Data and State.
 * Handles async fetching, continuous lazy loading on bottom scroll,
 * search filtering, branch selection, and commit inspection.
 * Adheres strictly to AGENTS.md (< 500 LOC limit).
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { gitGraphApi } from '../services/gitGraphApi';

const INITIAL_BATCH_SIZE = 75;
const BATCH_INCREMENT = 75;

export function useGitGraph(isOpen) {
  const [data, setData] = useState({
    has_git: true,
    current_branch: '',
    branches: [],
    commits: [],
    lines: [],
    total_commits: 0,
    has_more: false,
  });
  const [limit, setLimit] = useState(INITIAL_BATCH_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedCommitSha, setSelectedCommitSha] = useState(null);
  const [selectedCommitDiff, setSelectedCommitDiff] = useState(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);

  const isMountedRef = useRef(true);

  // Fetch graph data for a specific limit
  const fetchGraphData = useCallback(async (targetLimit, isMore = false) => {
    if (isMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result = await gitGraphApi.fetchGraph(targetLimit);
      if (isMountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load git graph');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, []);

  // Reload initial batch when modal opens
  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen) {
      setLimit(INITIAL_BATCH_SIZE);
      fetchGraphData(INITIAL_BATCH_SIZE, false);
    } else {
      setSelectedCommitSha(null);
      setSelectedCommitDiff(null);
      setLimit(INITIAL_BATCH_SIZE);
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [isOpen, fetchGraphData]);

  // Lazy load more commits as user scrolls near bottom
  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !data.has_more) return;
    const nextLimit = limit + BATCH_INCREMENT;
    setLimit(nextLimit);
    fetchGraphData(nextLimit, true);
  }, [isLoading, isLoadingMore, data.has_more, limit, fetchGraphData]);

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
    hasMore: Boolean(data.has_more),
    isLoading,
    isLoadingMore,
    error,
    searchQuery,
    setSearchQuery,
    selectedBranch,
    setSelectedBranch,
    selectedCommitSha,
    setSelectedCommitSha,
    selectedCommitDiff,
    isLoadingDiff,
    loadMore,
    refresh: () => fetchGraphData(limit, false),
  };
}
