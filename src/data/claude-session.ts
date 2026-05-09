import { execSync } from "child_process";
import { join } from "path";
import { existsSync } from "fs";
import type { StatusJSON } from "../types/StatusJSON";

/** 从 ps 输出中提取活跃的 Claude Code 会话信息 */
export interface ClaudeSession {
  pid: number;
  sessionId: string | null;
}

/** 查找所有 Claude Code 进程 */
export function findClaudeProcesses(): ClaudeSession[] {
  try {
    const ps = execSync("ps aux", { encoding: "utf-8", timeout: 3000 });
    const sessions: ClaudeSession[] = [];

    for (const line of ps.split("\n")) {
      if (!/\bclaude\b/.test(line) || line.includes("brew")) continue;
      // 只处理有 --resume 标志的会话进程
      if (!line.includes("--resume")) continue;

      const parts = line.trim().split(/\s+/);
      const pid = parseInt(parts[1] || "", 10);
      if (isNaN(pid)) continue;

      // 从命令行提取 session ID
      const resumeMatch = line.match(/--resume\s+([\w-]+)/);
      sessions.push({
        pid,
        sessionId: resumeMatch ? (resumeMatch[1] ?? null) : null,
      });
    }

    return sessions;
  } catch {
    return [];
  }
}

/** 根据 session ID 查找 transcript 文件路径 */
export function findTranscriptPath(sessionId: string): string | null {
  const projectsDir = join(process.env.HOME || "~", ".claude", "projects");

  if (!existsSync(projectsDir)) return null;

  const { readdirSync, statSync } = require("fs");

  function walk(dir: string, depth: number = 0): string | null {
    if (depth > 4) return null;
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        if (entry.startsWith(".")) continue;

        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            const found = walk(fullPath, depth + 1);
            if (found) return found;
          } else if (entry === `${sessionId}.jsonl`) {
            return fullPath;
          }
        } catch {
          // permission denied or other stat error
        }
      }
    } catch {
      // directory read error
    }
    return null;
  }

  return walk(projectsDir);
}

/** 查找活跃 Claude Code 会话的最新 transcript 路径（按修改时间排序） */
export function findActiveTranscriptPath(): string | null {
  const { statSync } = require("fs");
  const processes = findClaudeProcesses();

  let bestPath: string | null = null;
  let bestMtime = 0;

  for (const proc of processes) {
    if (proc.sessionId) {
      const path = findTranscriptPath(proc.sessionId);
      if (path) {
        try {
          const mtime = statSync(path).mtimeMs;
          if (mtime > bestMtime) {
            bestMtime = mtime;
            bestPath = path;
          }
        } catch {
          // stat failed, skip
        }
      }
    }
  }

  return bestPath;
}

/** 从 JSONL transcript 中提取模型名称 */
export function extractModelFromTranscript(transcriptPath: string): string | null {
  try {
    const { readFileSync } = require("fs");
    const content = readFileSync(transcriptPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed);
        if (entry.type === "system" && entry.message?.model) {
          return entry.message.model;
        }
        if (entry.type === "assistant" && entry.message?.model) {
          return entry.message.model;
        }
      } catch {
        // skip invalid lines
      }
    }
  } catch {}
  return null;
}

/** 为 Claude Code oneshot 模式构建 StatusJSON */
export function buildMinimalStatusJSON(transcriptPath: string): StatusJSON {
  const model = extractModelFromTranscript(transcriptPath);

  return {
    hook_event_name: "oneshot",
    session_id: undefined,
    transcript_path: transcriptPath,
    cwd: process.cwd(),
    model: model || undefined,
    workspace: { current_dir: process.cwd() },
    version: undefined,
    output_style: undefined,
    effort: null,
    cost: undefined,
    context_window: null,
    vim: null,
    worktree: null,
    rate_limits: null,
  };
}
