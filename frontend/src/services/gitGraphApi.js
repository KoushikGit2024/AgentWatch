/**
 * Dedicated API client for Git DAG Graph and Commit Inspection.
 * Adheres strictly to AGENTS.md (< 500 LOC limit).
 */
import { request } from './api';

export const gitGraphApi = {
  /**
   * Fetch topological commit DAG graph.
   * @param {number} [limit=150]
   * @returns {Promise<{ has_git: boolean, current_branch: string, branches: Array, commits: Array, total_commits: number }>}
   */
  async fetchGraph(limit = 150, branch = '') {
    const branchParam = branch && branch !== 'ALL' ? `&branch=${encodeURIComponent(branch)}` : '';
    const res = await request(`/api/v1/git/graph?limit=${encodeURIComponent(limit)}${branchParam}`);
    return res.json();
  },

  /**
   * Fetch detailed diff and stats for a specific commit SHA.
   * @param {string} sha
   * @returns {Promise<{ sha: string, details: string, diff: string, truncated: boolean }>}
   */
  async fetchCommitDiff(sha) {
    const res = await request(`/api/v1/git/commit/${encodeURIComponent(sha)}`);
    return res.json();
  },
};
