/**
 * 共享转录解析层
 *
 * 提供 JSONL 文件解析和 token 指标计算的通用实现，
 * Claude 和 Codex 各自通过适配器函数转换为统一格式。
 */

import { readFileSync, existsSync, statSync } from "fs";
import type { TokenMetrics, SpeedMetrics, SpeedMetricsCollection } from "../types/Widget";

// ─── 归一化条目格式 ──────────────────────────────────────────

/** 归一化的转录条目 — 统一 Claude/Codex 的差异 */
export interface NormalizedEntry {
  /** 时间戳（Unix 毫秒） */
  timestamp: number;
  /** 输入 token 数 */
  inputTokens: number;
  /** 输出 token 数 */
  outputTokens: number;
  /** 缓存写入 token 数 */
  cacheCreationTokens: number;
  /** 缓存读取 token 数 */
  cacheReadTokens: number;
  /** 是否为最终条目（用于流式去重） */
  isFinalized: boolean;
  /** 是否为侧链条目 */
  isSidechain: boolean;
}

// ─── JSONL 文件解析（带 mtime 缓存） ─────────────────────────

const parseCache = new Map<string, { mtime: number; entries: unknown[] }>();

/**
 * 解析 JSONL 文件，返回所有条目。
 * 基于文件 mtime 的内存缓存，避免重复解析。
 */
export function parseJsonlFile<T = unknown>(filePath: string): T[] {
  if (!existsSync(filePath)) return [];

  const mtime = statSync(filePath).mtimeMs;
  const cached = parseCache.get(filePath);
  if (cached && cached.mtime === mtime) return cached.entries as T[];

  const content = readFileSync(filePath, "utf-8");
  const entries: unknown[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed));
    } catch {
      // 跳过无效行
    }
  }

  parseCache.set(filePath, { mtime, entries });
  return entries as T[];
}

// ─── Token 指标计算 ──────────────────────────────────────────

/**
 * 从归一化条目计算 token 指标。
 *
 * 去重策略：只统计 isFinalized=true 的条目，
 * 如果没有 finalized 条目则取最后一条。
 */
export function computeTokenMetrics(entries: NormalizedEntry[]): TokenMetrics | null {
  if (entries.length === 0) return null;

  const finalized = entries.filter((e) => e.isFinalized);
  const counted = finalized.length > 0 ? finalized : [entries[entries.length - 1]!];

  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreationTokens = 0;
  let cacheReadTokens = 0;

  for (const entry of counted) {
    inputTokens += entry.inputTokens;
    outputTokens += entry.outputTokens;
    cacheCreationTokens += entry.cacheCreationTokens;
    cacheReadTokens += entry.cacheReadTokens;
  }

  // 上下文长度：取最后一条非侧链条目的 input + cache
  const mainChainEntries = entries.filter((e) => !e.isSidechain);
  let contextLength = 0;
  if (mainChainEntries.length > 0) {
    const last = mainChainEntries[mainChainEntries.length - 1]!;
    contextLength = last.inputTokens + last.cacheReadTokens + last.cacheCreationTokens;
  }

  const cachedTokens = cacheCreationTokens + cacheReadTokens;
  return {
    inputTokens,
    outputTokens,
    cachedTokens,
    cacheCreationTokens,
    cacheReadTokens,
    totalTokens: inputTokens + outputTokens + cachedTokens,
    contextLength,
  };
}

// ─── 会话时长计算 ────────────────────────────────────────────

/** 从归一化条目计算会话时长 */
export function computeSessionDuration(entries: NormalizedEntry[]): string | null {
  if (entries.length < 2) return null;

  const timestamps = entries.map((e) => e.timestamp).filter((t) => t > 0).sort((a, b) => a - b);
  if (timestamps.length < 2) return null;

  const durationMs = timestamps[timestamps.length - 1]! - timestamps[0]!;
  const minutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h${minutes % 60}m`;
  return `${minutes}m`;
}

// ─── 速度指标计算 ────────────────────────────────────────────

/** 从归一化条目计算速度指标 */
export function computeSpeedMetrics(
  entries: NormalizedEntry[],
  windows: number[] = [30, 60]
): SpeedMetricsCollection | null {
  if (entries.length === 0) return null;

  // 按时间排序
  const sorted = entries
    .filter((e) => e.timestamp > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (sorted.length === 0) return null;

  let totalInput = 0;
  let totalOutput = 0;
  const tokenEvents: { input: number; output: number; time: number }[] = [];

  for (const entry of sorted) {
    totalInput += entry.inputTokens;
    totalOutput += entry.outputTokens;
    tokenEvents.push({ input: entry.inputTokens, output: entry.outputTokens, time: entry.timestamp });
  }

  const firstTime = sorted[0]!.timestamp;
  const lastTime = sorted[sorted.length - 1]!.timestamp;
  const durationSec = (lastTime - firstTime) / 1000;

  const makeSpeedMetrics = (input: number, output: number, duration: number): SpeedMetrics => ({
    tokensPerSecond: duration > 0 ? (input + output) / duration : 0,
    inputTokensPerSecond: duration > 0 ? input / duration : 0,
    outputTokensPerSecond: duration > 0 ? output / duration : 0,
  });

  const sessionAverage = makeSpeedMetrics(totalInput, totalOutput, durationSec);

  const windowed: Record<string, SpeedMetrics> = {};
  const now = Date.now();

  for (const w of windows) {
    const cutoff = now - w * 1000;
    const windowEvents = tokenEvents.filter((t) => t.time >= cutoff);
    const windowInput = windowEvents.reduce((sum, t) => sum + t.input, 0);
    const windowOutput = windowEvents.reduce((sum, t) => sum + t.output, 0);
    const windowDuration =
      windowEvents.length > 1
        ? (windowEvents[windowEvents.length - 1]!.time - windowEvents[0]!.time) / 1000
        : w;

    windowed[String(w)] = makeSpeedMetrics(windowInput, windowOutput, windowDuration);
  }

  return { sessionAverage, windowed };
}
