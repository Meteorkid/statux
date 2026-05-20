import type { StatusJSON } from "../types/StatusJSON";
import type { RenderContext, SpeedMetrics } from "../types/Widget";
import { findActiveTranscriptPath, buildMinimalStatusJSON } from "./claude-session";
import {
  buildCodexRenderContext,
  buildStatusJSONFromBridge,
  buildCodexTokenMetricsFromTranscript,
  buildCodexSessionDurationFromTranscript,
  buildCodexSpeedMetricsFromTranscript,
  readCodexBridgeData,
  readFreshCodexBridgeData,
  readLatestCodexThread,
  readLatestFreshCodexThread,
  type CodexBridgeData,
} from "./codex";
import { collectGitInfo } from "./git";
import { collectJujutsuInfo } from "./jujutsu";
import { parseJsonl, getTokenMetrics, getSessionDuration, getSpeedMetricsCollection } from "./jsonl";
import { fetchUsageData, extractUsageFromRateLimits } from "./usage-api";
import { terminalColumns } from "../utils/terminal";

function getClaudeTranscriptMetrics(transcriptPath?: string): {
  tokenMetrics: RenderContext["tokenMetrics"];
  sessionDuration: string | null;
  speedMetrics: SpeedMetrics | null;
  windowedSpeedMetrics: RenderContext["windowedSpeedMetrics"];
} {
  const entries = transcriptPath ? parseJsonl(transcriptPath) : [];
  const tokenMetrics = entries.length > 0 ? getTokenMetrics(entries) : null;
  const sessionDuration = entries.length > 0 ? getSessionDuration(entries) : null;

  let speedMetrics: SpeedMetrics | null = null;
  let windowedSpeedMetrics: RenderContext["windowedSpeedMetrics"] = null;
  if (entries.length > 0) {
    const collection = getSpeedMetricsCollection(entries, { windowSeconds: [30, 60] });
    if (collection) {
      speedMetrics = collection.sessionAverage;
      windowedSpeedMetrics = collection.windowed;
    }
  }

  return { tokenMetrics, sessionDuration, speedMetrics, windowedSpeedMetrics };
}

function buildCodexBridgeRenderContext(bridge: CodexBridgeData): RenderContext {
  const data = buildStatusJSONFromBridge(bridge);
  const transcriptPath = bridge.transcript_path;
  const tokenMetrics = transcriptPath
    ? buildCodexTokenMetricsFromTranscript(transcriptPath)
    : null;
  const sessionDuration = transcriptPath
    ? buildCodexSessionDurationFromTranscript(transcriptPath)
    : null;
  const speedData = transcriptPath
    ? buildCodexSpeedMetricsFromTranscript(transcriptPath)
    : null;

  return {
    data,
    tokenMetrics,
    speedMetrics: speedData?.sessionAverage ?? null,
    windowedSpeedMetrics: speedData?.windowed ?? null,
    sessionDuration,
    terminalWidth: terminalColumns(),
    usageData: null,
    gitInfo: collectGitInfo(bridge.cwd),
    jujutsuInfo: collectJujutsuInfo(bridge.cwd),
    tool: "codex",
  };
}

export function buildCodexRenderContextFromLocalState(
  requireFreshLocalState: boolean
): RenderContext | null {
  const thread = requireFreshLocalState ? readLatestFreshCodexThread() : readLatestCodexThread();
  if (thread) return buildCodexRenderContext(thread);

  const bridge = requireFreshLocalState ? readFreshCodexBridgeData() : readCodexBridgeData();
  if (!bridge) return null;

  return buildCodexBridgeRenderContext(bridge);
}

export function buildClaudeRenderContextFromActiveSession(): RenderContext | null {
  const transcriptPath = findActiveTranscriptPath();
  if (!transcriptPath) return null;

  const data = buildMinimalStatusJSON(transcriptPath);
  const metrics = getClaudeTranscriptMetrics(transcriptPath);
  const cwd = data.cwd || data.workspace?.current_dir || process.cwd();

  return {
    data,
    ...metrics,
    terminalWidth: terminalColumns(),
    usageData: null,
    gitInfo: collectGitInfo(cwd),
    jujutsuInfo: collectJujutsuInfo(cwd),
    tool: "claude-code",
  };
}

export async function buildClaudeRenderContextFromStatusData(
  data: StatusJSON
): Promise<RenderContext> {
  const transcriptPath = data.transcript_path || findActiveTranscriptPath() || undefined;
  const metrics = getClaudeTranscriptMetrics(transcriptPath);
  const rateLimitsUsage = extractUsageFromRateLimits(data.rate_limits);
  const usageData = await fetchUsageData(rateLimitsUsage);
  const cwd = data.cwd || data.workspace?.current_dir;

  return {
    data,
    ...metrics,
    terminalWidth: terminalColumns(),
    usageData,
    gitInfo: collectGitInfo(cwd),
    jujutsuInfo: collectJujutsuInfo(cwd),
    tool: "claude-code",
  };
}
