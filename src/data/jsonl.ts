/**
 * Claude Code 转录 JSONL 解析器
 *
 * 解析 ~/.claude/projects 下的 jsonl 文件，提取 token 指标。
 * 底层使用 transcript.ts 的共享实现。
 */

import type { TokenMetrics, SpeedMetrics, SpeedMetricsCollection } from "../types/Widget";
import { parseJsonlFile, computeTokenMetrics, computeSessionDuration, computeActiveDurationMs, formatDurationMs, computeSpeedMetrics, type NormalizedEntry } from "./transcript";

// ─── Claude 条目类型 ─────────────────────────────────────────

interface ClaudeTranscriptEntry {
  type: string;
  timestamp?: string;
  isSidechain?: boolean;
  message?: {
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    stop_reason?: string | null;
  };
}

// ─── 条目归一化 ──────────────────────────────────────────────

/** 将 Claude 条目转换为归一化格式 */
function normalizeClaudeEntry(entry: ClaudeTranscriptEntry): NormalizedEntry | null {
  if (entry.type !== "assistant" || !entry.message?.usage) return null;

  const usage = entry.message.usage;
  const timestamp = entry.timestamp ? new Date(entry.timestamp).getTime() : 0;

  return {
    timestamp,
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
    cacheCreationTokens: usage.cache_creation_input_tokens || 0,
    cacheReadTokens: usage.cache_read_input_tokens || 0,
    // Claude 流式去重：只统计有 stop_reason 的条目
    isFinalized: !!(entry.message.stop_reason && entry.message.stop_reason !== "null"),
    isSidechain: !!entry.isSidechain,
  };
}

/** 将 Claude 条目列表归一化 */
function normalizeClaudeEntries(entries: ClaudeTranscriptEntry[]): NormalizedEntry[] {
  const normalized: NormalizedEntry[] = [];
  for (const entry of entries) {
    const n = normalizeClaudeEntry(entry);
    if (n) normalized.push(n);
  }

  // 如果没有 finalized 条目，确保最后一条被标记为 finalized
  if (normalized.length > 0 && !normalized.some((e) => e.isFinalized)) {
    normalized[normalized.length - 1]!.isFinalized = true;
  }

  return normalized;
}

// ─── 公开 API（保持原有接口不变） ────────────────────────────

/** 解析 JSONL 文件，返回所有条目（带内存缓存） */
export function parseJsonl(filePath: string): ClaudeTranscriptEntry[] {
  return parseJsonlFile<ClaudeTranscriptEntry>(filePath);
}

/** 获取 token 指标 — 处理流式去重 */
export function getTokenMetrics(transcriptPath: string): TokenMetrics | null;
export function getTokenMetrics(entries: ClaudeTranscriptEntry[]): TokenMetrics | null;
export function getTokenMetrics(pathOrEntries: string | ClaudeTranscriptEntry[]): TokenMetrics | null {
  const entries = typeof pathOrEntries === "string" ? parseJsonl(pathOrEntries) : pathOrEntries;
  if (entries.length === 0) return null;
  return computeTokenMetrics(normalizeClaudeEntries(entries));
}

/** 获取会话时长 */
export function getSessionDuration(transcriptPath: string): string | null;
export function getSessionDuration(entries: ClaudeTranscriptEntry[]): string | null;
export function getSessionDuration(pathOrEntries: string | ClaudeTranscriptEntry[]): string | null {
  const entries = typeof pathOrEntries === "string" ? parseJsonl(pathOrEntries) : pathOrEntries;
  if (entries.length === 0) return null;
  return computeSessionDuration(normalizeClaudeEntries(entries));
}

/** 获取速度指标 */
export function getSpeedMetricsCollection(
  transcriptPath: string,
  options?: { windowSeconds?: number[] }
): SpeedMetricsCollection | null;
export function getSpeedMetricsCollection(
  entries: ClaudeTranscriptEntry[],
  options?: { windowSeconds?: number[] }
): SpeedMetricsCollection | null;
export function getSpeedMetricsCollection(
  pathOrEntries: string | ClaudeTranscriptEntry[],
  options: { windowSeconds?: number[] } = {}
): SpeedMetricsCollection | null {
  const entries = typeof pathOrEntries === "string" ? parseJsonl(pathOrEntries) : pathOrEntries;
  if (entries.length === 0) return null;
  return computeSpeedMetrics(normalizeClaudeEntries(entries), options.windowSeconds);
}

/** 获取活跃时长（排除闲置时间） */
export function getActiveDuration(transcriptPath: string): string | null;
export function getActiveDuration(entries: ClaudeTranscriptEntry[]): string | null;
export function getActiveDuration(pathOrEntries: string | ClaudeTranscriptEntry[]): string | null {
  const entries = typeof pathOrEntries === "string" ? parseJsonl(pathOrEntries) : pathOrEntries;
  if (entries.length === 0) return null;
  return formatDurationMs(computeActiveDurationMs(normalizeClaudeEntries(entries)));
}
