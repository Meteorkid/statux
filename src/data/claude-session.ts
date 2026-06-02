import { execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { existsSync, readFileSync, statSync, readdirSync } from "fs";
import { getProcessList, processNameMatches } from "../utils/process";
import type { StatusJSON } from "../types/StatusJSON";

const HOME = process.env.HOME || homedir();

/** 从 ps 输出中提取活跃的 Claude Code 会话信息 */
export interface ClaudeSession {
  pid: number;
  sessionId: string | null;
}

/** 查找所有 Claude Code 进程 */
export function findClaudeProcesses(): ClaudeSession[] {
  const processes = getProcessList();
  const sessions: ClaudeSession[] = [];

  for (const proc of processes) {
    if (!processNameMatches(proc.command, "claude") || proc.command.includes("brew")) continue;
    // 只处理有 --resume 标志的会话进程
    if (!proc.command.includes("--resume")) continue;

    // 从命令行提取 session ID
    const resumeMatch = proc.command.match(/--resume\s+([\w-]+)/);
    sessions.push({
      pid: proc.pid,
      sessionId: resumeMatch ? (resumeMatch[1] ?? null) : null,
    });
  }

  return sessions;
}

/** 根据 session ID 查找 transcript 文件路径 */
export function findTranscriptPath(sessionId: string): string | null {
  const projectsDir = join(HOME, ".claude", "projects");

  if (!existsSync(projectsDir)) return null;

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

// mtime 缓存：避免每次 oneshot 都遍历文件系统
let activeTranscriptCache: { mtime: number; path: string | null } | null = null;

/** 查找活跃 Claude Code 会话的最新 transcript 路径（按修改时间排序，带缓存） */
export function findActiveTranscriptPath(): string | null {
  const processes = findClaudeProcesses();
  if (processes.length === 0) return null;

  // 用进程列表的哈希作为缓存 key（进程变化时重新查找）
  const procKey = processes.map(p => p.pid).join(",");
  const cacheKey = procKey;

  if (activeTranscriptCache) {
    // 检查缓存的路径是否仍然有效
    const cached = activeTranscriptCache;
    if (cached.path && existsSync(cached.path)) {
      const currentMtime = statSync(cached.path).mtimeMs;
      if (currentMtime === cached.mtime) return cached.path;
      // mtime 变了，更新缓存
      activeTranscriptCache = { mtime: currentMtime, path: cached.path };
      return cached.path;
    }
  }

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

  if (bestPath) {
    activeTranscriptCache = { mtime: bestMtime, path: bestPath };
  }
  return bestPath;
}

// model 缓存：避免每次 oneshot 都读整个 JSONL
const modelCache = new Map<string, { mtime: number; model: string | null }>();

/** 从 JSONL transcript 中提取模型名称（带 mtime 缓存） */
export function extractModelFromTranscript(transcriptPath: string): string | null {
  try {
    const mtime = statSync(transcriptPath).mtimeMs;
    const cached = modelCache.get(transcriptPath);
    if (cached && cached.mtime === mtime) return cached.model;

    const content = readFileSync(transcriptPath, "utf-8");
    let model: string | null = null;
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed);
        if (entry.type === "system" && entry.message?.model) {
          model = entry.message.model;
          break;
        }
        if (entry.type === "assistant" && entry.message?.model) {
          model = entry.message.model;
          break;
        }
      } catch {
        // skip invalid lines
      }
    }

    modelCache.set(transcriptPath, { mtime, model });
    return model;
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
