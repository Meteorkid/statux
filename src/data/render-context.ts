import type { StatusJSON } from "../types/StatusJSON";
import type { RenderContext, SpeedMetrics, WidgetItem } from "../types/Widget";
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
import { getWidgetRequirements, type WidgetRequirements } from "./widget-requirements";

export interface RenderContextBuildOptions {
  lines?: WidgetItem[][];
}

function getRequirements(options: RenderContextBuildOptions = {}): WidgetRequirements {
  return getWidgetRequirements(options.lines ?? []);
}

function collectGitInfoForRequirements(cwd: string | undefined, requirements: WidgetRequirements): RenderContext["gitInfo"] {
  if (!requirements.needsGit) return null;
  return collectGitInfo(cwd, {
    includeFork: requirements.needsGitFork,
    includePullRequest: requirements.needsGitPullRequest,
  });
}

function collectJujutsuInfoForRequirements(cwd: string | undefined, requirements: WidgetRequirements): RenderContext["jujutsuInfo"] {
  if (!requirements.needsJujutsu) return null;
  return collectJujutsuInfo(cwd);
}

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

function buildCodexBridgeRenderContext(
  bridge: CodexBridgeData,
  requirements: WidgetRequirements
): RenderContext {
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
    gitInfo: collectGitInfoForRequirements(bridge.cwd, requirements),
    jujutsuInfo: collectJujutsuInfoForRequirements(bridge.cwd, requirements),
    tool: "codex",
  };
}

export function buildCodexRenderContextFromLocalState(
  requireFreshLocalState: boolean,
  options: RenderContextBuildOptions = {}
): RenderContext | null {
  const requirements = getRequirements(options);
  const thread = requireFreshLocalState ? readLatestFreshCodexThread() : readLatestCodexThread();
  if (thread) return buildCodexRenderContext(thread, requirements);

  const bridge = requireFreshLocalState ? readFreshCodexBridgeData() : readCodexBridgeData();
  if (!bridge) return null;

  return buildCodexBridgeRenderContext(bridge, requirements);
}

export function buildClaudeRenderContextFromActiveSession(
  options: RenderContextBuildOptions = {}
): RenderContext | null {
  const transcriptPath = findActiveTranscriptPath();
  if (!transcriptPath) return null;

  const data = buildMinimalStatusJSON(transcriptPath);
  const metrics = getClaudeTranscriptMetrics(transcriptPath);
  const cwd = data.cwd || data.workspace?.current_dir || process.cwd();
  const requirements = getRequirements(options);

  return {
    data,
    ...metrics,
    terminalWidth: terminalColumns(),
    usageData: null,
    gitInfo: collectGitInfoForRequirements(cwd, requirements),
    jujutsuInfo: collectJujutsuInfoForRequirements(cwd, requirements),
    tool: "claude-code",
  };
}

export async function buildClaudeRenderContextFromStatusData(
  data: StatusJSON,
  options: RenderContextBuildOptions = {}
): Promise<RenderContext> {
  const transcriptPath = data.transcript_path || findActiveTranscriptPath() || undefined;
  const metrics = getClaudeTranscriptMetrics(transcriptPath);
  const rateLimitsUsage = extractUsageFromRateLimits(data.rate_limits);
  const usageData = await fetchUsageData(rateLimitsUsage);
  const cwd = data.cwd || data.workspace?.current_dir;
  const requirements = getRequirements(options);

  return {
    data,
    ...metrics,
    terminalWidth: terminalColumns(),
    usageData,
    gitInfo: collectGitInfoForRequirements(cwd, requirements),
    jujutsuInfo: collectJujutsuInfoForRequirements(cwd, requirements),
    tool: "claude-code",
  };
}
