import { Database } from "bun:sqlite";
import { homedir } from "os";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import type { StatusJSON } from "../types/StatusJSON";
import type { TokenMetrics, SpeedMetrics, RenderContext, GitInfo } from "../types/Widget";
import type { Tool } from "../types/Tool";
import { parseJsonlFile, computeTokenMetrics, computeSessionDuration, computeSpeedMetrics } from "./transcript";
import { collectGitInfo } from "./git";

const HOME = process.env.HOME || homedir();

export interface CodexThread {
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
export interface CodexBridgeData {
  session_id: string;
  transcript_path: string | null;
  cwd: string;
  model: string | null;
  source: string | null;
  last_updated: number;
  last_event: string;
}

const STATE_DB = join(HOME, ".codex", "state_5.sqlite");
const BRIDGE_FILE = join(HOME, ".cache", "statux", "codex-bridge.json");
const LOCAL_STATE_TTL_MS = 2 * 60 * 1000;

function normalizeTimestampMs(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value > 1_000_000_000_000 ? value : value * 1000;
}

function getThreadUpdatedMs(thread: CodexThread): number | null {
  return normalizeTimestampMs(thread.updated_at_ms ?? thread.updated_at);
}

/** 判断 Codex bridge 数据是否足够新鲜，可用于无进程 fallback */
export function isCodexBridgeFresh(
  bridge: CodexBridgeData,
  now: number = Date.now(),
  ttlMs: number = LOCAL_STATE_TTL_MS
): boolean {
  const updatedMs = normalizeTimestampMs(bridge.last_updated);
  if (updatedMs == null) return false;
  return now - updatedMs >= 0 && now - updatedMs <= ttlMs;
}

/** 判断 Codex SQLite 线程是否足够新鲜，可用于无进程 fallback */
export function isCodexThreadFresh(
  thread: CodexThread,
  now: number = Date.now(),
  ttlMs: number = LOCAL_STATE_TTL_MS
): boolean {
  const updatedMs = getThreadUpdatedMs(thread);
  if (updatedMs == null) return false;
  return now - updatedMs >= 0 && now - updatedMs <= ttlMs;
}

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

/** 读取足够新鲜的 Codex bridge 数据 */
export function readFreshCodexBridgeData(): CodexBridgeData | null {
  const bridge = readCodexBridgeData();
  if (!bridge || !isCodexBridgeFresh(bridge)) return null;
  return bridge;
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

/** 读取足够新鲜的 Codex 线程 */
export function readLatestFreshCodexThread(): CodexThread | null {
  const thread = readLatestCodexThread();
  if (!thread || !isCodexThreadFresh(thread)) return null;
  return thread;
}

/** 本地 Codex 状态是否可作为无进程 fallback */
export function hasFreshCodexLocalState(): boolean {
  return !!(readLatestFreshCodexThread() || readFreshCodexBridgeData());
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

// ─── Codex Transcript JSONL 解析（基于共享 transcript 模块） ────

interface CodexTranscriptEntry {
  type: string;
  usage?: {
    input_tokens?: number;
    cached_input_tokens?: number;
    output_tokens?: number;
  };
  timestamp?: number;
}

/** 将 Codex 条目归一化为共享格式 */
function normalizeCodexEntries(entries: CodexTranscriptEntry[]): import("./transcript").NormalizedEntry[] {
  const normalized: import("./transcript").NormalizedEntry[] = [];
  for (const entry of entries) {
    if (entry.type !== "turn.completed" || !entry.usage) continue;
    normalized.push({
      timestamp: entry.timestamp || 0,
      inputTokens: entry.usage.input_tokens || 0,
      outputTokens: entry.usage.output_tokens || 0,
      cacheCreationTokens: 0,
      cacheReadTokens: entry.usage.cached_input_tokens || 0,
      isFinalized: true, // Codex 条目无需去重
      isSidechain: false,
    });
  }
  return normalized;
}

/** 解析 Codex transcript JSONL，返回条目列表 */
export function parseCodexTranscript(transcriptPath: string): CodexTranscriptEntry[] {
  return parseJsonlFile<CodexTranscriptEntry>(transcriptPath);
}

/** 从 Codex transcript 中提取 token 指标 */
export function buildCodexTokenMetricsFromTranscript(transcriptPath: string): TokenMetrics | null {
  const entries = parseCodexTranscript(transcriptPath);
  if (entries.length === 0) return null;
  return computeTokenMetrics(normalizeCodexEntries(entries));
}

/** 从 Codex transcript 提取会话时长 */
export function buildCodexSessionDurationFromTranscript(transcriptPath: string): string | null {
  const entries = parseCodexTranscript(transcriptPath);
  if (entries.length === 0) return null;
  return computeSessionDuration(normalizeCodexEntries(entries));
}

/** 从 Codex transcript 提取速度指标 */
export function buildCodexSpeedMetricsFromTranscript(
  transcriptPath: string,
  windows: number[] = [30, 60]
): { sessionAverage: SpeedMetrics; windowed: Record<string, SpeedMetrics> } | null {
  const entries = parseCodexTranscript(transcriptPath);
  if (entries.length === 0) return null;
  return computeSpeedMetrics(normalizeCodexEntries(entries), windows);
}

// ─── Token 指标（SQLite fallback）─────────────────────────────

/** 从 Codex 线程数据构建 Token 指标 */
export function buildCodexTokenMetrics(thread: CodexThread): TokenMetrics | null {
  if (!thread.tokens_used || thread.tokens_used <= 0) return null;

  // SQLite fallback 模式：Codex 仅记录总 tokens_used，无 input/output 分拆。
  // 70/30 是经验值（Claude/OpenAI 典型 usage 分布），精度有限。
  // 有 bridge + transcript 时会走更精确的路径。
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
    isFork: null,
    pullRequest: null,
  };
}

// ─── RenderContext 构建 ───────────────────────────────────────

/** 为 Codex 构建完整的 RenderContext
 *
 * 优先使用 bridge 数据（含 transcript_path → 可解析 JSONL 获取精确 token 数据），
 * fallback 到 SQLite 直接读取。 */
export function buildCodexRenderContext(thread: CodexThread, requirements?: { needsGit?: boolean; needsGitFork?: boolean; needsGitPullRequest?: boolean }): RenderContext {
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
      gitInfo: requirements?.needsGit !== false ? (collectGitInfo(bridge.cwd) || buildCodexGitInfo(thread)) : null,
      jujutsuInfo: null,
      tool: "codex",
    };
  }

  // Fallback: 仅 SQLite 数据，git 状态未知（返回 null 而非假数据）
  const data = buildStatusJSONFromCodex(thread);
  const tokenMetrics = buildCodexTokenMetrics(thread);
  const sessionDuration = buildCodexSessionDuration(thread);

  return {
    data,
    tokenMetrics,
    speedMetrics: null,
    windowedSpeedMetrics: null,
    sessionDuration,
    terminalWidth: process.stdout.columns || 80,
    usageData: null,
    gitInfo: null,  // SQLite 无 git 数据，不显示而非误报 clean
    jujutsuInfo: null,
    tool: "codex",
  };
}
