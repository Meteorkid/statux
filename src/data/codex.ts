import { Database } from "bun:sqlite";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import type { StatusJSON } from "../types/StatusJSON";
import type { TokenMetrics, SpeedMetrics, SpeedMetricsCollection, RenderContext, GitInfo } from "../types/Widget";
import type { Tool } from "../types/Tool";

interface CodexThread {
  id: string;
  rollout_path: string;
  created_at: number;
  updated_at: number;
  source: string;
  model_provider: string;
  cwd: string;
  title: string;
  tokens_used: number;
  git_sha: string | null;
  git_branch: string | null;
  git_origin_url: string | null;
  cli_version: string;
  model: string | null;
  reasoning_effort: string | null;
  agent_nickname: string | null;
  agent_role: string | null;
  memory_mode: string;
  created_at_ms: number | null;
  updated_at_ms: number | null;
}

/** Bridge 数据（由 Codex hooks 写入） */
interface CodexBridgeData {
  session_id: string;
  transcript_path: string | null;
  cwd: string;
  model: string | null;
  source: string | null;
  last_updated: number;
  last_event: string;
}

const STATE_DB = join(process.env.HOME || "~", ".codex", "state_5.sqlite");
const BRIDGE_FILE = join(process.env.HOME || "~", ".cache", "statux", "codex-bridge.json");

/** 读取 Codex hook bridge 数据 */
export function readCodexBridgeData(): CodexBridgeData | null {
  if (!existsSync(BRIDGE_FILE)) return null;

  try {
    const raw = readFileSync(BRIDGE_FILE, "utf-8");
    const data = JSON.parse(raw);
    // 基本校验
    if (!data.session_id || !data.cwd) return null;
    return data as CodexBridgeData;
  } catch {
    return null;
  }
}

/** 读取 Codex 最新活跃线程 */
export function readLatestCodexThread(): CodexThread | null {
  if (!existsSync(STATE_DB)) return null;

  let db: Database | null = null;
  try {
    db = new Database(STATE_DB, { readonly: true });
    const row = db
      .query("SELECT * FROM threads WHERE archived = 0 ORDER BY updated_at DESC LIMIT 1")
      .get() as CodexThread | undefined;
    return row ?? null;
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

/** 将 Codex 线程数据映射为类 StatusJSON 结构 */
export function buildStatusJSONFromCodex(thread: CodexThread): StatusJSON {
  const modelId = thread.model || "codex-default";

  return {
    hook_event_name: "codex-poll",
    session_id: thread.id,
    transcript_path: undefined,
    cwd: thread.cwd,
    model: { id: modelId, display_name: modelId },
    workspace: { current_dir: thread.cwd, project_dir: thread.cwd },
    version: thread.cli_version || undefined,
    output_style: undefined,
    effort: thread.reasoning_effort ? { level: thread.reasoning_effort } : undefined,
    cost: undefined,
    context_window: null,
    vim: null,
    worktree: null,
    rate_limits: null,
  };
}

/** 从 Bridge 数据构建 StatusJSON */
export function buildStatusJSONFromBridge(bridge: CodexBridgeData): StatusJSON {
  const modelId = bridge.model || "codex-default";

  return {
    hook_event_name: "codex-bridge",
    session_id: bridge.session_id,
    transcript_path: bridge.transcript_path || undefined,
    cwd: bridge.cwd,
    model: { id: modelId, display_name: modelId },
    workspace: { current_dir: bridge.cwd, project_dir: bridge.cwd },
    version: undefined,
    output_style: undefined,
    effort: undefined,
    cost: undefined,
    context_window: null,
    vim: null,
    worktree: null,
    rate_limits: null,
  };
}

// ─── Codex Transcript JSONL 解析 ───────────────────────────────

interface CodexTranscriptEntry {
  type: string;
  usage?: {
    input_tokens?: number;
    cached_input_tokens?: number;
    output_tokens?: number;
  };
  timestamp?: number;
}

/** 解析 Codex transcript JSONL，返回条目列表 */
export function parseCodexTranscript(transcriptPath: string): CodexTranscriptEntry[] {
  if (!existsSync(transcriptPath)) return [];

  try {
    const content = readFileSync(transcriptPath, "utf-8");
    const entries: CodexTranscriptEntry[] = [];
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        entries.push(JSON.parse(trimmed));
      } catch {
        // 跳过无效行
      }
    }
    return entries;
  } catch {
    return [];
  }
}

/** 从 Codex transcript 中提取 token 指标 */
export function buildCodexTokenMetricsFromTranscript(transcriptPath: string): TokenMetrics | null {
  const entries = parseCodexTranscript(transcriptPath);
  if (entries.length === 0) return null;

  let inputTokens = 0;
  let outputTokens = 0;
  let cachedInputTokens = 0;

  for (const entry of entries) {
    // Codex transcript 中 token 数据在 turn.completed 事件中
    if (entry.type === "turn.completed" && entry.usage) {
      inputTokens += entry.usage.input_tokens || 0;
      outputTokens += entry.usage.output_tokens || 0;
      cachedInputTokens += entry.usage.cached_input_tokens || 0;
    }
  }

  const totalTokens = inputTokens + outputTokens + cachedInputTokens;
  if (totalTokens === 0) return null;

  // contextLength 用最后一个 turn.completed 的 input_tokens + cached
  const lastCompleted = entries
    .filter((e) => e.type === "turn.completed" && e.usage)
    .pop();
  const contextLength = lastCompleted
    ? (lastCompleted.usage!.input_tokens || 0) + (lastCompleted.usage!.cached_input_tokens || 0)
    : 0;

  return {
    inputTokens,
    outputTokens,
    cachedTokens: cachedInputTokens,
    cacheCreationTokens: 0,
    cacheReadTokens: cachedInputTokens,
    totalTokens,
    contextLength,
  };
}

/** 从 Codex transcript 提取会话时长 */
export function buildCodexSessionDurationFromTranscript(transcriptPath: string): string | null {
  const entries = parseCodexTranscript(transcriptPath);
  if (entries.length === 0) return null;

  const timestamps = entries
    .map((e) => e.timestamp)
    .filter((t): t is number => t != null && t > 0)
    .sort((a, b) => a - b);

  if (timestamps.length < 2) return null;

  const durationMs = timestamps[timestamps.length - 1]! - timestamps[0]!;
  const minutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h${minutes % 60}m`;
  return `${minutes}m`;
}

/** 从 Codex transcript 提取速度指标 */
export function buildCodexSpeedMetricsFromTranscript(
  transcriptPath: string,
  windows: number[] = [30, 60]
): { sessionAverage: SpeedMetrics; windowed: Record<string, SpeedMetrics> } | null {
  const entries = parseCodexTranscript(transcriptPath);
  if (entries.length === 0) return null;

  const completed = entries
    .filter((e) => e.type === "turn.completed" && e.usage)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  if (completed.length === 0) return null;

  let totalTokens = 0;
  const tokenEvents: { tokens: number; time: number }[] = [];

  for (const entry of completed) {
    const tokens =
      (entry.usage!.input_tokens || 0) +
      (entry.usage!.output_tokens || 0) +
      (entry.usage!.cached_input_tokens || 0);
    totalTokens += tokens;
    if (entry.timestamp) {
      tokenEvents.push({ tokens, time: entry.timestamp });
    }
  }

  const firstTime = completed[0]!.timestamp || 0;
  const lastTime = completed[completed.length - 1]!.timestamp || 0;
  const durationSec = (lastTime - firstTime) / 1000;

  const sessionAverage: SpeedMetrics = {
    tokensPerSecond: durationSec > 0 ? totalTokens / durationSec : 0,
  };

  const windowed: Record<string, SpeedMetrics> = {};
  const now = Date.now();

  for (const w of windows) {
    const cutoff = now - w * 1000;
    const windowEvents = tokenEvents.filter((t) => t.time >= cutoff);
    const windowTokens = windowEvents.reduce((sum, t) => sum + t.tokens, 0);
    const windowDuration =
      windowEvents.length > 1
        ? (windowEvents[windowEvents.length - 1]!.time - windowEvents[0]!.time) / 1000
        : w;

    windowed[String(w)] = {
      tokensPerSecond: windowDuration > 0 ? windowTokens / windowDuration : 0,
    };
  }

  return { sessionAverage, windowed };
}

// ─── Token 指标（SQLite fallback）─────────────────────────────

/** 从 Codex 线程数据构建 Token 指标 */
export function buildCodexTokenMetrics(thread: CodexThread): TokenMetrics | null {
  if (!thread.tokens_used || thread.tokens_used <= 0) return null;

  return {
    inputTokens: Math.round(thread.tokens_used * 0.7),
    outputTokens: Math.round(thread.tokens_used * 0.3),
    cachedTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    totalTokens: thread.tokens_used,
    contextLength: 0,
  };
}

/** 从 Codex 线程数据计算会话时长 */
export function buildCodexSessionDuration(thread: CodexThread): string | null {
  const startMs = thread.created_at_ms ?? thread.created_at * 1000;
  const endMs = thread.updated_at_ms ?? thread.updated_at * 1000;
  const durationMs = endMs - startMs;

  if (durationMs <= 0) return null;

  const minutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h${minutes % 60}m`;
  return `${minutes}m`;
}

/** 从 Codex 线程构建 Git 信息 */
export function buildCodexGitInfo(thread: CodexThread): GitInfo | null {
  if (!thread.git_branch) return null;

  const origin = thread.git_origin_url
    ? thread.git_origin_url
        .replace(/^https:\/\/github\.com\//, "")
        .replace(/\.git$/, "")
        .replace(/^git@github\.com:/, "")
    : null;

  return {
    branch: thread.git_branch,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    ahead: 0,
    behind: 0,
    insertions: 0,
    deletions: 0,
    rootDir: null,
    sha: thread.git_sha,
    origin,
    conflicts: 0,
    worktree: null,
    isClean: true,
    stagedFiles: 0,
    unstagedFiles: 0,
    untrackedFiles: 0,
  };
}

// ─── RenderContext 构建 ───────────────────────────────────────

/** 为 Codex 构建完整的 RenderContext
 *
 * 优先使用 bridge 数据（含 transcript_path → 可解析 JSONL 获取精确 token 数据），
 * fallback 到 SQLite 直接读取。 */
export function buildCodexRenderContext(thread: CodexThread): RenderContext {
  // 尝试读取 bridge 数据获取 transcript_path
  const bridge = readCodexBridgeData();

  // 如果 bridge 和 thread 是同一会话，使用 bridge 的 transcript_path
  if (bridge && bridge.session_id === thread.id && bridge.transcript_path) {
    const data = buildStatusJSONFromBridge(bridge);
    const tokenMetrics = buildCodexTokenMetricsFromTranscript(bridge.transcript_path)
      || buildCodexTokenMetrics(thread);
    const sessionDuration = buildCodexSessionDurationFromTranscript(bridge.transcript_path)
      || buildCodexSessionDuration(thread);
    const speedData = buildCodexSpeedMetricsFromTranscript(bridge.transcript_path);

    return {
      data,
      tokenMetrics,
      speedMetrics: speedData?.sessionAverage ?? null,
      windowedSpeedMetrics: speedData?.windowed ?? null,
      sessionDuration,
      terminalWidth: process.stdout.columns || 80,
      usageData: null,
      gitInfo: buildCodexGitInfo(thread),
      tool: "codex",
    };
  }

  // Fallback: 仅 SQLite 数据
  const data = buildStatusJSONFromCodex(thread);
  const tokenMetrics = buildCodexTokenMetrics(thread);
  const sessionDuration = buildCodexSessionDuration(thread);
  const gitInfo = buildCodexGitInfo(thread);

  return {
    data,
    tokenMetrics,
    speedMetrics: null,
    windowedSpeedMetrics: null,
    sessionDuration,
    terminalWidth: process.stdout.columns || 80,
    usageData: null,
    gitInfo,
    tool: "codex",
  };
}
