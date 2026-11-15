"""Git DAG Graph Service for AgentWatch.

Faithfully implements the Git Keizu DAG layout algorithm:
- Complete commit discovery across all branches (--branches, --tags, --remotes).
- First-class Git Stash branch nodes (refs/stash) with hollow circular nodes.
- Topological traversal with vertex connection routing.
- Continuous branch lines across intermediate rows.
- numstat and diff-tree breakdown for commit file changes.
Strictly adheres to AGENTS.md (< 500 LOC limit).
"""

import asyncio
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def _parse_ref_names(ref_str: str) -> Tuple[List[str], List[str], bool]:
    """Parse git %D output into branches, tags, and is_head flag."""
    branches: List[str] = []
    tags: List[str] = []
    is_head = False

    if not ref_str:
        return branches, tags, is_head

    for item in ref_str.split(","):
        cleaned = item.strip()
        if not cleaned:
            continue
        if cleaned.startswith("HEAD -> "):
            is_head = True
            branches.append(cleaned[8:].strip())
        elif cleaned == "HEAD":
            is_head = True
        elif cleaned.startswith("tag: "):
            tags.append(cleaned[5:].strip())
        else:
            branches.append(cleaned)

    return branches, tags, is_head


class _Vertex:
    def __init__(self, idx: int, sha: str, parents: List[int], is_stash: bool = False):
        self.id = idx
        self.y = idx
        self.x = 0
        self.nextX = 0
        self.sha = sha
        self.parents = parents
        self.is_stash = is_stash
        self.nextParent = 0
        self.onBranch: Optional["_Branch"] = None
        self.connections: List[Optional[Dict[str, Any]]] = []

    def get_next_parent(self) -> Optional[int]:
        if self.nextParent < len(self.parents):
            return self.parents[self.nextParent]
        return None

    def register_parent_processed(self) -> None:
        self.nextParent += 1

    def is_not_on_branch(self) -> bool:
        return self.onBranch is None

    def get_point(self) -> Dict[str, int]:
        return {"x": self.x, "y": self.y}

    def get_next_point(self) -> Dict[str, int]:
        return {"x": self.nextX, "y": self.y}

    def add_to_branch(self, branch: "_Branch", x: int) -> None:
        if self.onBranch is None:
            self.onBranch = branch
            self.x = x

    def register_unavailable_point(self, x: int, connects_to: Any, on_branch: "_Branch") -> None:
        if x == self.nextX:
            self.nextX = x + 1
            while len(self.connections) <= x:
                self.connections.append(None)
            self.connections[x] = {"connectsTo": connects_to, "onBranch": on_branch}

    def get_point_connecting_to(self, target_vertex: Any, branch: "_Branch") -> Optional[Dict[str, int]]:
        for i, conn in enumerate(self.connections):
            if conn and conn["connectsTo"] == target_vertex and conn["onBranch"] == branch:
                return {"x": i, "y": self.y}
        return None


class _Branch:
    def __init__(self, color: int):
        self.color = color
        self.lines: List[Dict[str, Any]] = []

    def add_line(self, p1: Dict[str, int], p2: Dict[str, int], locked_first: bool = False) -> None:
        self.lines.append({"p1": p1, "p2": p2, "lockedFirst": locked_first})


def _build_keizu_graph(commits: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Execute Git Keizu's exact graph routing and line creation algorithm."""
    sha_to_idx = {c["sha"]: i for i, c in enumerate(commits)}

    vertices = [
        _Vertex(i, c["sha"], [sha_to_idx[p] for p in c["parents"] if p in sha_to_idx], c.get("is_stash", False))
        for i, c in enumerate(commits)
    ]

    branches: List[_Branch] = []
    available_colors: List[int] = []

    def get_available_color(start_idx: int) -> int:
        for idx, t in enumerate(available_colors):
            if start_idx > t:
                return idx
        available_colors.append(0)
        return len(available_colors) - 1

    def find_start() -> int:
        for v in vertices:
            if v.get_next_parent() is not None or v.is_not_on_branch():
                return v.id
        return -1

    while True:
        s = find_start()
        if s == -1:
            break

        t = s
        cur_v = vertices[t]
        next_p_idx = cur_v.get_next_parent()
        target_v = vertices[next_p_idx] if next_p_idx is not None else None
        pt = cur_v.get_next_point() if cur_v.is_not_on_branch() else cur_v.get_point()

        if target_v is not None and len(cur_v.parents) > 1 and not cur_v.is_not_on_branch() and not target_v.is_not_on_branch():
            # Merge route
            connected = False
            u_branch = target_v.onBranch
            for t in range(s + 1, len(vertices)):
                v_t = vertices[t]
                r = v_t.get_point_connecting_to(target_v, u_branch)
                if r is not None:
                    connected = True
                else:
                    r = v_t.get_next_point()

                u_branch.add_line(pt, r, not connected and v_t != target_v and pt["x"] < r["x"])
                v_t.register_unavailable_point(r["x"], target_v, u_branch)
                pt = r
                if connected:
                    cur_v.register_parent_processed()
                    break
        else:
            # Normal or new branch line
            c_color = get_available_color(s)
            branch = _Branch(c_color)
            cur_v.add_to_branch(branch, pt["x"])
            cur_v.register_unavailable_point(pt["x"], cur_v, branch)

            for t in range(s + 1, len(vertices)):
                v_t = vertices[t]
                if target_v == v_t and not target_v.is_not_on_branch():
                    r = v_t.get_point()
                else:
                    r = v_t.get_next_point()

                branch.add_line(pt, r, pt["x"] < r["x"])
                v_t.register_unavailable_point(r["x"], target_v, branch)
                pt = r

                if target_v == v_t:
                    cur_v.register_parent_processed()
                    already_on_branch = not target_v.is_not_on_branch()
                    target_v.add_to_branch(branch, r["x"])
                    cur_v = target_v
                    next_p = cur_v.get_next_parent()
                    target_v = vertices[next_p] if next_p is not None else None
                    if target_v is None or already_on_branch:
                        break

            if t == len(vertices) - 1:
                while cur_v.get_next_parent() is not None:
                    cur_v.register_parent_processed()

            branches.append(branch)
            if len(available_colors) <= branch.color:
                available_colors.extend([0] * (branch.color + 1 - len(available_colors)))
            available_colors[branch.color] = t

    # Assign coordinates and branch colors to commits
    for i, c in enumerate(commits):
        c["lane"] = vertices[i].x
        c["color"] = vertices[i].onBranch.color if vertices[i].onBranch else 0

    # Collect continuous line segments
    graph_lines = []
    for b in branches:
        for l in b.lines:
            graph_lines.append({
                "p1": l["p1"],
                "p2": l["p2"],
                "color": b.color,
                "lockedFirst": l["lockedFirst"],
            })

    return graph_lines


async def get_git_graph(workspace_root: Path, limit: int = 150) -> Dict[str, Any]:
    """Retrieve topological git log across all branches, stashes, and Keizu line segments."""
    git_dir = workspace_root / ".git"
    if not git_dir.exists():
        return {
            "has_git": False,
            "commits": [],
            "branches": [],
            "lines": [],
            "total_commits": 0,
            "message": "Not a git repository",
        }

    # 1. Extract all branch heads
    branches_proc = await asyncio.create_subprocess_exec(
        "git",
        "branch",
        "-a",
        "--format=%(refname:short)|%(HEAD)",
        cwd=str(workspace_root),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    b_out, _ = await branches_proc.communicate()

    all_branches: List[Dict[str, Any]] = []
    current_branch = None
    for line in b_out.decode("utf-8", errors="replace").splitlines():
        parts = line.strip().split("|")
        if not parts or not parts[0]:
            continue
        name = parts[0].strip()
        is_cur = len(parts) > 1 and parts[1].strip() == "*"
        if is_cur:
            current_branch = name
        all_branches.append({"name": name, "is_current": is_cur})

    # 2. Extract commits across ALL branches, tags, and remotes (matching Git Keizu getGitLog)
    log_fmt = "%H%x00%P%x00%an%x00%ae%x00%ad%x00%s%x00%D%x01"
    log_proc = await asyncio.create_subprocess_exec(
        "git",
        "log",
        f"-n{max(10, min(limit, 500))}",
        "--branches",
        "--tags",
        "--remotes",
        "--topo-order",
        f"--format={log_fmt}",
        cwd=str(workspace_root),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    l_out, _ = await log_proc.communicate()

    commits: List[Dict[str, Any]] = []
    for block in l_out.decode("utf-8", errors="replace").split("\x01"):
        block = block.strip()
        if not block:
            continue
        fields = block.split("\x00")
        if len(fields) < 6:
            continue

        sha = fields[0].strip()
        parents = [p.strip() for p in fields[1].split() if p.strip()]
        author_name = fields[2].strip()
        author_email = fields[3].strip()
        author_date = fields[4].strip()
        subject = fields[5].strip()
        ref_str = fields[6].strip() if len(fields) > 6 else ""

        branches_list, tags, is_head = _parse_ref_names(ref_str)

        commits.append({
            "sha": sha,
            "short_sha": sha[:7],
            "parents": parents,
            "author_name": author_name,
            "author_email": author_email,
            "date": author_date,
            "subject": subject,
            "branches": branches_list,
            "tags": tags,
            "is_head": is_head,
            "is_stash": False,
        })

    # 3. Extract Stashes and inject as child branches of their base commits (matching Git Keizu getStashes)
    stash_proc = await asyncio.create_subprocess_exec(
        "git",
        "reflog",
        "--format=%H%x00%P%x00%gD%x00%an%x00%ae%x00%ad%x00%s",
        "refs/stash",
        "--",
        cwd=str(workspace_root),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    s_out, _ = await stash_proc.communicate()

    commit_sha_set = {c["sha"] for c in commits}
    stashes: List[Dict[str, Any]] = []
    for line in s_out.decode("utf-8", errors="replace").splitlines():
        fields = line.strip().split("\x00")
        if len(fields) >= 7:
            s_sha = fields[0].strip()
            s_parents = [p.strip() for p in fields[1].split() if p.strip()]
            base_sha = s_parents[0] if s_parents else ""
            selector = fields[2].strip().replace("refs/", "")

            stashes.append({
                "sha": s_sha,
                "short_sha": s_sha[:7],
                "parents": [base_sha] if base_sha else [],
                "author_name": fields[3].strip(),
                "author_email": fields[4].strip(),
                "date": fields[5].strip(),
                "subject": fields[6].strip(),
                "branches": [],
                "tags": [selector],
                "is_head": False,
                "is_stash": True,
            })

    # Splice stashes directly above their base commit in the timeline (exact Keizu behavior)
    for st in stashes:
        if st["sha"] not in commit_sha_set and st["parents"]:
            base = st["parents"][0]
            try:
                base_idx = next(i for i, c in enumerate(commits) if c["sha"] == base)
                commits.insert(base_idx, st)
                commit_sha_set.add(st["sha"])
            except StopIteration:
                pass

    # 4. Generate exact Keizu graph lines & lanes
    lines = _build_keizu_graph(commits)

    return {
        "has_git": True,
        "current_branch": current_branch,
        "branches": all_branches,
        "commits": commits,
        "lines": lines,
        "total_commits": len(commits),
    }


async def get_commit_diff(workspace_root: Path, sha: str) -> Dict[str, Any]:
    """Retrieve detailed metadata, changed files, and unified diff for a commit."""
    git_dir = workspace_root / ".git"
    if not git_dir.exists():
        return {"error": "Not a git repository"}

    # 1. Commit message & author info
    show_meta = await asyncio.create_subprocess_exec(
        "git",
        "show",
        "--stat",
        "--format=%H%x00%an%x00%ae%x00%ad%x00%s%x00%b",
        sha,
        cwd=str(workspace_root),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    meta_out, _ = await show_meta.communicate()
    raw_meta = meta_out.decode("utf-8", errors="replace")

    # 2. Changed files with status (A/M/D/R) and additions/deletions (matching Keizu)
    ns_proc = await asyncio.create_subprocess_exec(
        "git",
        "diff-tree",
        "-M",
        "--name-status",
        "-r",
        "--root",
        sha,
        cwd=str(workspace_root),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    ns_out, _ = await ns_proc.communicate()
    status_map: Dict[str, Dict[str, str]] = {}
    for line in ns_out.decode("utf-8", errors="replace").splitlines():
        parts = line.strip().split("\t")
        if len(parts) >= 2 and parts[0]:
            code = parts[0][0].upper()
            if code in ("A", "M", "D", "R", "C"):
                new_p = parts[-1].strip()
                old_p = parts[1].strip() if code == "R" and len(parts) > 2 else new_p
                status_map[new_p] = {"status": code, "old_path": old_p}

    numstat_proc = await asyncio.create_subprocess_exec(
        "git",
        "diff-tree",
        "-M",
        "--numstat",
        "-r",
        "--root",
        sha,
        cwd=str(workspace_root),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    numstat_out, _ = await numstat_proc.communicate()
    file_changes: List[Dict[str, Any]] = []
    seen_paths = set()
    for line in numstat_out.decode("utf-8", errors="replace").splitlines():
        parts = line.strip().split("\t")
        if len(parts) >= 3 and parts[0].isdigit() and parts[1].isdigit():
            p = parts[-1].strip()
            seen_paths.add(p)
            meta = status_map.get(p, {"status": "M", "old_path": p})
            file_changes.append({
                "additions": int(parts[0]),
                "deletions": int(parts[1]),
                "path": p,
                "status": meta["status"],
                "old_path": meta["old_path"],
            })

    # Include binary/renamed files from status_map not in numstat
    for p, meta in status_map.items():
        if p not in seen_paths:
            file_changes.append({
                "additions": 0,
                "deletions": 0,
                "path": p,
                "status": meta["status"],
                "old_path": meta["old_path"],
            })

    # 3. Unified patch diff
    show_diff = await asyncio.create_subprocess_exec(
        "git",
        "show",
        "-p",
        "--format=",
        sha,
        cwd=str(workspace_root),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    diff_out, _ = await show_diff.communicate()
    patch = diff_out.decode("utf-8", errors="replace")

    return {
        "sha": sha,
        "details": raw_meta[:5000],
        "files": file_changes,
        "total_files": len(file_changes),
        "diff": patch[:100000],
        "truncated": len(patch) > 100000,
    }
