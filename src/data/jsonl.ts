import { readFileSync, existsSync } from "fs";
import type { TokenMetrics, SpeedMetrics, SpeedMetricsCollection } from "../types/Widget";

interface TranscriptEntry {
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

/** 解析 JSONL 文件，返回所有条目 */
function parseJsonl(filePath: string): TranscriptEntry[] {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, "utf-8");
  const entries: TranscriptEntry[] = [];
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
}

/** 获取 token 指标 — 处理流式去重 */
export function getTokenMetrics(transcriptPath: string): TokenMetrics | null {
  const entries = parseJsonl(transcriptPath);
  if (entries.length === 0) return null;

  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let contextLength = 0;

  // 按时间戳排序
  const assistantEntries = entries
    .filter((e) => e.type === "assistant" && e.message?.usage)
    .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));

  // 跟踪已处理的流式条目，避免重复计算
  // 策略：对于同一时间窗口内的连续 assistant 条目，
  // 只计算 stop_reason 非 null 的条目 + 最后一个条目
  const finalized: TranscriptEntry[] = [];
  let lastAssistant: TranscriptEntry | null = null;

  for (const entry of assistantEntries) {
    if (entry.message?.stop_reason && entry.message.stop_reason !== "null") {
      finalized.push(entry);
    }
    lastAssistant = entry;
  }

  // 加上最后一个未完成的条目（如果有）
  if (lastAssistant && !finalized.includes(lastAssistant)) {
    finalized.push(lastAssistant);
  }

  for (const entry of finalized) {
    const usage = entry.message!.usage!;
    inputTokens += usage.input_tokens || 0;
    outputTokens += usage.output_tokens || 0;
    cachedTokens += (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
  }

  // 上下文长度 = 最后一个主链条目的 input + cache_read + cache_creation
  const mainChainEntries = entries
    .filter((e) => e.type === "assistant" && !e.isSidechain && e.message?.usage)
    .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));

  if (mainChainEntries.length > 0) {
    const last = mainChainEntries[mainChainEntries.length - 1]!;
    const usage = last.message!.usage!;
    contextLength =
      (usage.input_tokens || 0) +
      (usage.cache_read_input_tokens || 0) +
      (usage.cache_creation_input_tokens || 0);
  }

  return {
    inputTokens,
    outputTokens,
    cachedTokens,
    totalTokens: inputTokens + outputTokens + cachedTokens,
    contextLength,
  };
}

/** 获取会话时长 */
export function getSessionDuration(transcriptPath: string): string | null {
  const entries = parseJsonl(transcriptPath);
  if (entries.length === 0) return null;

  const timestamps = entries
    .map((e) => e.timestamp)
    .filter((t): t is string => !!t)
    .sort();

  if (timestamps.length === 0) return null;

  const first = new Date(timestamps[0]!).getTime();
  const last = new Date(timestamps[timestamps.length - 1]!).getTime();
  const durationMs = last - first;

  const minutes = Math.floor(durationMs / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h${minutes % 60}m`;
  }
  return `${minutes}m`;
}

/** 获取速度指标 */
export function getSpeedMetricsCollection(
  transcriptPath: string,
  options: { windowSeconds?: number[] } = {}
): SpeedMetricsCollection | null {
  const entries = parseJsonl(transcriptPath);
  if (entries.length === 0) return null;

  const assistantEntries = entries
    .filter((e) => e.type === "assistant" && e.message?.usage)
    .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));

  if (assistantEntries.length === 0) return null;

  // 计算总 tokens 和总时间
  let totalTokens = 0;
  const tokenTimestamps: { tokens: number; time: number }[] = [];

  for (const entry of assistantEntries) {
    const usage = entry.message!.usage!;
    const tokens = (usage.input_tokens || 0) + (usage.output_tokens || 0);
    totalTokens += tokens;
    if (entry.timestamp) {
      tokenTimestamps.push({ tokens, time: new Date(entry.timestamp).getTime() });
    }
  }

  // 会话平均速度
  const firstTime = new Date(assistantEntries[0]!.timestamp || "").getTime();
  const lastTime = new Date(
    assistantEntries[assistantEntries.length - 1]!.timestamp || ""
  ).getTime();
  const durationSec = (lastTime - firstTime) / 1000;
  const sessionAverage: SpeedMetrics = {
    tokensPerSecond: durationSec > 0 ? totalTokens / durationSec : 0,
  };

  // 窗口速度
  const windowed: Record<string, SpeedMetrics> = {};
  const now = Date.now();

  for (const window of options.windowSeconds || []) {
    const cutoff = now - window * 1000;
    const windowedEntries = tokenTimestamps.filter((t) => t.time >= cutoff);
    const windowTokens = windowedEntries.reduce((sum, t) => sum + t.tokens, 0);
    const windowDuration =
      windowedEntries.length > 1
        ? (windowedEntries[windowedEntries.length - 1]!.time - windowedEntries[0]!.time) / 1000
        : window;

    windowed[String(window)] = {
      tokensPerSecond: windowDuration > 0 ? windowTokens / windowDuration : 0,
    };
  }

  return { sessionAverage, windowed };
}
