import { execSync } from "child_process";

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

function safeExec(cmd: string, cwd?: string): string | null {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", timeout: 2000, stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

/** 获取当前 Git 分支名 */
export function getGitBranch(cwd?: string): string | null {
  return safeExec("git rev-parse --abbrev-ref HEAD", cwd);
}

/** 获取完整 Git 状态 */
export function getGitStatus(cwd?: string): GitStatus | null {
  const branch = getGitBranch(cwd);
  if (!branch) return null;

  // git status --porcelain -b
  const statusOutput = safeExec("git status --porcelain -b", cwd);
  if (!statusOutput) return { branch, staged: 0, unstaged: 0, untracked: 0, ahead: 0, behind: 0, insertions: 0, deletions: 0 };

  const lines = statusOutput.split("\n");
  let staged = 0;
  let unstaged = 0;
  let untracked = 0;
  let ahead = 0;
  let behind = 0;

  for (const line of lines) {
    if (line.startsWith("##")) {
      // 解析 ahead/behind
      const match = line.match(/\[ahead (\d+)\]/);
      if (match) ahead = parseInt(match[1]!, 10);
      const behindMatch = line.match(/\[behind (\d+)\]/);
      if (behindMatch) behind = parseInt(behindMatch[1]!, 10);
      continue;
    }
    const x = line[0];
    const y = line[1];
    if (x === "?" && y === "?") {
      untracked++;
    } else {
      if (x !== " " && x !== "?") staged++;
      if (y !== " " && y !== "?") unstaged++;
    }
  }

  // git diff --shortstat 获取插入/删除行数
  const diffStat = safeExec("git diff --shortstat HEAD", cwd);
  let insertions = 0;
  let deletions = 0;
  if (diffStat) {
    const insertMatch = diffStat.match(/(\d+) insertion/);
    if (insertMatch) insertions = parseInt(insertMatch[1]!, 10);
    const deleteMatch = diffStat.match(/(\d+) deletion/);
    if (deleteMatch) deletions = parseInt(deleteMatch[1]!, 10);
  }

  return { branch, staged, unstaged, untracked, ahead, behind, insertions, deletions };
}
