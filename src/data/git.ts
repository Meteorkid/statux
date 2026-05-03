import { execSync } from "child_process";
import type { GitInfo } from "../types/Widget";

function safeExec(cmd: string, cwd?: string): string | null {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", timeout: 2000, stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

/** 预采集所有 Git 信息 — 单次调用，所有 git widget 共享结果 */
export function collectGitInfo(cwd?: string): GitInfo | null {
  // 快速检测是否在 git 仓库中
  const isGit = safeExec("git rev-parse --is-inside-work-tree", cwd);
  if (isGit !== "true") return null;

  // 并行执行所有 git 命令（用 shell 子命令分隔）
  const branch = safeExec("git rev-parse --abbrev-ref HEAD", cwd) || "";
  if (!branch) return null;

  // git status --porcelain -b: 分支、ahead/behind、staged/unstaged/untracked
  const statusOutput = safeExec("git status --porcelain -b", cwd) || "";
  let staged = 0, unstaged = 0, untracked = 0, ahead = 0, behind = 0;
  for (const line of statusOutput.split("\n")) {
    if (line.startsWith("##")) {
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

  // git diff --shortstat HEAD: insertions/deletions
  const diffStat = safeExec("git diff --shortstat HEAD", cwd) || "";
  let insertions = 0, deletions = 0;
  const insertMatch = diffStat.match(/(\d+) insertion/);
  if (insertMatch) insertions = parseInt(insertMatch[1]!, 10);
  const deleteMatch = diffStat.match(/(\d+) deletion/);
  if (deleteMatch) deletions = parseInt(deleteMatch[1]!, 10);

  // 其他信息
  const rootDirRaw = safeExec("git rev-parse --show-toplevel", cwd);
  const rootDir = rootDirRaw ? (rootDirRaw.split("/").pop() || rootDirRaw) : null;
  const sha = safeExec("git rev-parse --short HEAD", cwd);

  // origin: owner/repo
  const originUrl = safeExec("git remote get-url origin", cwd);
  let origin: string | null = null;
  if (originUrl) {
    const match = originUrl.match(/[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/);
    if (match) origin = `${match[1]}/${match[2]}`;
  }

  // conflicts
  const conflictOutput = safeExec("git diff --name-only --diff-filter=U", cwd);
  const conflicts = conflictOutput ? conflictOutput.split("\n").filter(l => l.trim()).length : 0;

  // worktree
  const gitDir = safeExec("git rev-parse --git-dir", cwd);
  let worktree: string | null = null;
  if (gitDir) {
    const wtMatch = gitDir.match(/\.git\/worktrees\/(.+)$/);
    if (wtMatch) worktree = wtMatch[1]!;
  }

  // file counts
  const stagedFilesOutput = safeExec("git diff --cached --name-only", cwd);
  const stagedFiles = stagedFilesOutput ? stagedFilesOutput.split("\n").filter(l => l.trim()).length : 0;
  const unstagedFilesOutput = safeExec("git diff --name-only", cwd);
  const unstagedFiles = unstagedFilesOutput ? unstagedFilesOutput.split("\n").filter(l => l.trim()).length : 0;
  const untrackedFilesOutput = safeExec("git ls-files --others --exclude-standard", cwd);
  const untrackedFiles = untrackedFilesOutput ? untrackedFilesOutput.split("\n").filter(l => l.trim()).length : 0;

  return {
    branch, staged, unstaged, untracked, ahead, behind,
    insertions, deletions, rootDir, sha, origin, conflicts,
    worktree, isClean: staged === 0 && unstaged === 0 && untracked === 0,
    stagedFiles, unstagedFiles, untrackedFiles,
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
