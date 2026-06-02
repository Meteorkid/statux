import type { StatusJSON } from "./StatusJSON";
import type { Tool } from "./Tool";

/** Token 指标 */
export interface TokenMetrics {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  contextLength: number;
}

/** 速度指标 */
export interface SpeedMetrics {
  tokensPerSecond: number;
  inputTokensPerSecond: number;
  outputTokensPerSecond: number;
}

/** 速度指标集合 */
export interface SpeedMetricsCollection {
  sessionAverage: SpeedMetrics;
  windowed: Record<string, SpeedMetrics>;
}

/** Usage 数据（来自 rate_limits 或 Anthropic API） */
export interface UsageData {
  sessionUsage: number | null;
  sessionResetAt: string | null;
  weeklyUsage: number | null;
  weeklyResetAt: string | null;
}

/** Git 仓库信息 — 预采集，所有 git widget 共享 */
export interface GitInfo {
  branch: string;
  staged: number;
  unstaged: number;
  untracked: number;
  ahead: number;
  behind: number;
  insertions: number;
  deletions: number;
  rootDir: string | null;
  sha: string | null;
  origin: string | null; // owner/repo
  conflicts: number;
  worktree: string | null;
  isClean: boolean;
  // file counts
  stagedFiles: number;
  unstagedFiles: number;
  untrackedFiles: number;
  isFork: boolean | null;
  pullRequest: string | null;
}

/** Jujutsu 仓库信息 — 预采集，所有 jj widget 共享 */
export interface JujutsuInfo {
  bookmarks: string[];
  workspace: string | null;
  rootDir: string | null;
  changes: string | null;
  insertions: number;
  deletions: number;
  description: string | null;
  revision: string | null;
}

/** 渲染上下文 — 所有 widget 共享 */
export interface RenderContext {
  data: StatusJSON;
  tokenMetrics: TokenMetrics | null;
  speedMetrics: SpeedMetrics | null;
  windowedSpeedMetrics: Record<string, SpeedMetrics> | null;
  sessionDuration: string | null;
  terminalWidth: number;
  usageData: UsageData | null;
  gitInfo: GitInfo | null;
  jujutsuInfo: JujutsuInfo | null;
  tool: Tool | null; // 数据来源工具
}

/** Widget 配置项 */
export interface WidgetItem {
  id: string;
  type: string;
  label?: string;
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  rawValue?: boolean;
  hide?: boolean;
  maxWidth?: number;
  merge?: boolean | "no-padding";
  metadata?: Record<string, unknown>;
}

/** 预渲染结果 */
export interface PreRenderedWidget {
  item: WidgetItem;
  text: string | null;
  visibleText: string; // 去除 ANSI 后的文本
  width: number;
}

/** Widget 定义接口 */
export interface Widget {
  type: string;
  category: string;
  displayName: string;
  description: string;
  defaultColor: string;

  /** 渲染 widget，返回 ANSI 文本或 null（隐藏） */
  render(item: WidgetItem, ctx: RenderContext): string | null;
}
