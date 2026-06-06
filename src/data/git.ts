import { execSync } from "child_process";
import type { GitInfo } from "../types/Widget";

export interface CollectGitInfoOptions {
  includeFork?: boolean;
  includePullRequest?: boolean;
}

function safeExec(cmd: string, cwd?: string, timeout: number = 2000): string | null {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", timeout, stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

/** 预采集所有 Git 信息 — 单次调用，所有 git widget 共享结果 */
export function collectGitInfo(cwd?: string, options: CollectGitInfoOptions = {}): GitInfo | null {
  // 快速检测是否在 git 仓库中
  const isGit = safeExec("git rev-parse --is-inside-work-tree", cwd);
  if (isGit !== "true") return null;

  // 核心信息：branch + file counts（git status --porcelain -b 包含这些）
  const statusOutput = safeExec("git status --porcelain -b", cwd) || "";
  let branch = "", staged = 0, unstaged = 0, untracked = 0, ahead = 0, behind = 0;
  for (const line of statusOutput.split("\n")) {
    if (line.startsWith("##")) {
      // ## main...origin/main [ahead 2, behind 1]
      const branchMatch = line.match(/^## ([^.]+)/);
      if (branchMatch) branch = branchMatch[1]!;
      const aheadMatch = line.match(/ahead (\d+)/);
      if (aheadMatch) ahead = parseInt(aheadMatch[1]!, 10);
      const behindMatch = line.match(/behind (\d+)/);
      if (behindMatch) behind = parseInt(behindMatch[1]!, 10);
      continue;
    }
    const x = line[0], y = line[1];
    if (x === "?" && y === "?") {
      untracked++;
    } else {
      if (x !== " " && x !== "?") staged++;
      if (y !== " " && y !== "?") unstaged++;
    }
  }
  if (!branch) return null;

  // 一次调用获取 rootDir + sha + gitDir（用于 worktree 检测）
  const metaOutput = safeExec("git rev-parse --show-toplevel --short HEAD --git-dir", cwd);
  const metaLines = (metaOutput || "").split("\n").map(l => l.trim()).filter(Boolean);
  const rootDirRaw = metaLines[0] ?? null;
  const rootDir = rootDirRaw ? (rootDirRaw.split("/").pop() || rootDirRaw) : null;
  const sha = metaLines[1] ?? null;
  const gitDir = metaLines[2] ?? null;

  // worktree 检测
  let worktree: string | null = null;
  if (gitDir) {
    const wtMatch = gitDir.match(/\.git\/worktrees\/(.+)$/);
    if (wtMatch) worktree = wtMatch[1]!;
  }

  // insertions/deletions + conflicts + origin（3 次调用，比原来 5 次少）
  const diffStat = safeExec("git diff --shortstat HEAD", cwd) || "";
  let insertions = 0, deletions = 0;
  const insertMatch = diffStat.match(/(\d+) insertion/);
  if (insertMatch) insertions = parseInt(insertMatch[1]!, 10);
  const deleteMatch = diffStat.match(/(\d+) deletion/);
  if (deleteMatch) deletions = parseInt(deleteMatch[1]!, 10);

  const conflictOutput = safeExec("git diff --name-only --diff-filter=U", cwd);
  const conflicts = conflictOutput ? conflictOutput.split("\n").filter(l => l.trim()).length : 0;

  const originUrl = safeExec("git remote get-url origin", cwd);
  let origin: string | null = null;
  if (originUrl) {
    const match = originUrl.match(/[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/);
    if (match) origin = `${match[1]}/${match[2]}`;
  }

  let isFork: boolean | null = null;
  if (options.includeFork) {
    const forkOutput = safeExec("gh repo view --json isFork -q .isFork 2>/dev/null", cwd, 800);
    isFork = forkOutput === null ? null : forkOutput === "true";
  }

  let pullRequest: string | null = null;
  if (options.includePullRequest) {
    const githubPr = safeExec("gh pr view --json number,title,state --jq '\"#\" + (.number|tostring) + \" \" + .title + \" [\" + .state + \"]\"' 2>/dev/null", cwd, 800);
    const gitlabPr = githubPr ? null : safeExec("glab mr view --json iid,title,state --jq '\"!\" + (.iid|tostring) + \" \" + .title + \" [\" + .state + \"]\"' 2>/dev/null", cwd, 800);
    pullRequest = githubPr || gitlabPr;
  }

  return {
    branch, staged, unstaged, untracked, ahead, behind,
    insertions, deletions, rootDir, sha, origin, conflicts,
    worktree, isClean: staged === 0 && unstaged === 0 && untracked === 0,
    // porcelain status 已包含所有文件计数，无需额外 git 调用
    stagedFiles: staged, unstagedFiles: unstaged, untrackedFiles: untracked,
    isFork,
    pullRequest,
  };
}

/** 获取当前 Git 分支名 */
export function getGitBranch(cwd?: string): string | null {
  return safeExec("git rev-parse --abbrev-ref HEAD", cwd);
}

/** 获取完整 Git 状态 */
export interface GitStatus {
  branch: string;
  staged: number;
  unstaged: number;
  untracked: number;
  ahead: number;
  behind: number;
  insertions: number;
  deletions: number;
}

export function getGitStatus(cwd?: string): GitStatus | null {
  const branch = getGitBranch(cwd);
  if (!branch) return null;

  const statusOutput = safeExec("git status --porcelain -b", cwd);
  if (!statusOutput) return { branch, staged: 0, unstaged: 0, untracked: 0, ahead: 0, behind: 0, insertions: 0, deletions: 0 };

  const lines = statusOutput.split("\n");
  let staged = 0, unstaged = 0, untracked = 0, ahead = 0, behind = 0;

  for (const line of lines) {
    if (line.startsWith("##")) {
      const match = line.match(/\[ahead (\d+)\]/);
      if (match) ahead = parseInt(match[1]!, 10);
      const behindMatch = line.match(/\[behind (\d+)\]/);
      if (behindMatch) behind = parseInt(behindMatch[1]!, 10);
      continue;
    }
    const x = line[0], y = line[1];
    if (x === "?" && y === "?") {
      untracked++;
    } else {
      if (x !== " " && x !== "?") staged++;
      if (y !== " " && y !== "?") unstaged++;
    }
  }

  const diffStat = safeExec("git diff --shortstat HEAD", cwd);
  let insertions = 0, deletions = 0;
  if (diffStat) {
    const insertMatch = diffStat.match(/(\d+) insertion/);
    if (insertMatch) insertions = parseInt(insertMatch[1]!, 10);
    const deleteMatch = diffStat.match(/(\d+) deletion/);
    if (deleteMatch) deletions = parseInt(deleteMatch[1]!, 10);
  }

  return { branch, staged, unstaged, untracked, ahead, behind, insertions, deletions };
}
