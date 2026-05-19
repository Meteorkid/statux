#!/usr/bin/env bun
import { StatusJSONSchema } from "./types/StatusJSON";
import type { RenderContext } from "./types/Widget";
import { loadConfig } from "./config";
import { registerAllWidgets } from "./widgets";
import { renderStatusLines } from "./render/pipeline";
import { initPricingEngine, ensurePricingLoaded } from "./data/model-pricing";
import { recordSession, getRecentSessions, getDailySummaries, getSummaryByModel, closeHistoryDb } from "./data/history";
import { parseJsonl, getTokenMetrics, getSessionDuration, getSpeedMetricsCollection } from "./data/jsonl";
import { fetchUsageData, extractUsageFromRateLimits } from "./data/usage-api";
import { collectGitInfo } from "./data/git";
import { terminalColumns } from "./utils/terminal";
import { detectActiveTool, type Tool } from "./types/Tool";
import { findActiveTranscriptPath, buildMinimalStatusJSON } from "./data/claude-session";
import {
  readLatestCodexThread,
  buildCodexRenderContext,
  readCodexBridgeData,
  buildStatusJSONFromBridge,
  buildCodexTokenMetricsFromTranscript,
  buildCodexSessionDurationFromTranscript,
  buildCodexSpeedMetricsFromTranscript,
  parseCodexTranscript,
} from "./data/codex";

/** 读取 stdin */
async function readStdin(): Promise<string | null> {
  if (process.stdin.isTTY) return null;

  const chunks: string[] = [];
  process.stdin.setEncoding("utf-8");
  for await (const chunk of process.stdin) {
    chunks.push(chunk as string);
  }
  return chunks.join("");
}

/** 单次检测并渲染状态，返回 true 表示成功 */
async function renderOneshot(): Promise<boolean> {
  const tool = detectActiveTool() ?? inferToolFromLocalState();

  if (!tool) {
    return false;
  }

  let ctx: RenderContext;

  if (tool === "codex") {
    const thread = readLatestCodexThread();
    if (thread) {
      ctx = buildCodexRenderContext(thread);
    } else {
      // SQLite 无数据，尝试 bridge 数据
      const bridge = readCodexBridgeData();
      if (!bridge) return false;

      const data = buildStatusJSONFromBridge(bridge);
      const tp = bridge.transcript_path;
      const codexEntries = tp ? parseCodexTranscript(tp) : [];
      const tokenMetrics = tp
        ? buildCodexTokenMetricsFromTranscript(tp)
        : null;
      const sessionDuration = tp
        ? buildCodexSessionDurationFromTranscript(tp)
        : null;
      const speedData = tp
        ? buildCodexSpeedMetricsFromTranscript(tp)
        : null;
      const gitInfo = collectGitInfo(bridge.cwd);

      ctx = {
        data,
        tokenMetrics,
        speedMetrics: speedData?.sessionAverage ?? null,
        windowedSpeedMetrics: speedData?.windowed ?? null,
        sessionDuration,
        terminalWidth: terminalColumns(),
        usageData: null,
        gitInfo,
        tool: "codex",
      };
    }
  } else {
    // Claude Code — 查找活跃会话的 transcript
    const transcriptPath = findActiveTranscriptPath();
    if (!transcriptPath) return false;

    const data = buildMinimalStatusJSON(transcriptPath);
    const entries = parseJsonl(transcriptPath);
    const tokenMetrics = entries.length > 0 ? getTokenMetrics(entries) : null;
    const sessionDuration = entries.length > 0 ? getSessionDuration(entries) : null;

    let speedMetrics = null;
    let windowedSpeedMetrics = null;
    if (entries.length > 0) {
      const collection = getSpeedMetricsCollection(entries, { windowSeconds: [30, 60] });
      if (collection) {
        speedMetrics = collection.sessionAverage;
        windowedSpeedMetrics = collection.windowed;
      }
    }

    const gitInfo = collectGitInfo(process.cwd());

    ctx = {
      data,
      tokenMetrics,
      speedMetrics,
      windowedSpeedMetrics,
      sessionDuration,
      terminalWidth: terminalColumns(),
      usageData: null,
      gitInfo,
      tool: "claude-code",
    };
  }

  const config = loadConfig();
  const lines = renderStatusLines(config.lines, config, ctx);
  for (const line of lines) {
    console.log(line);
  }

  // iTerm2 OSC 序列输出（用于状态栏更新）
  emitIterm2Osc(ctx.data, ctx.tokenMetrics);

  // 直接写入 status.json（备用方案，确保 iTerm2 插件能读取）
  writeStatusJson(ctx.data, ctx.tokenMetrics);

  // 记录会话历史
  try {
    const sessionId = ctx.data.session_id || `${ctx.tool}-${Date.now()}`;
    recordSession({
      id: sessionId,
      tool: ctx.tool || "claude-code",
      model: typeof ctx.data.model === "string" ? ctx.data.model : ctx.data.model?.id,
      project: ctx.data.cwd || ctx.data.workspace?.current_dir,
      tokenMetrics: ctx.tokenMetrics,
      endedAt: Date.now(),
    });
  } catch {
    // 记录失败不影响主流程
  }

  return true;
}

/** 进程列表不可用时，从本地状态文件推断工具类型 */
function inferToolFromLocalState(): Tool | null {
  if (readLatestCodexThread() || readCodexBridgeData()) return "codex";
  return null;
}

/** 轮询模式 — 持续检测并渲染 */
async function renderWatch(intervalSec: number) {
  let lastHadOutput = false;

  const tick = async () => {
    const ok = await renderOneshot();
    if (ok) {
      lastHadOutput = true;
    } else if (lastHadOutput) {
      console.log("\x1b[90mstatux: tool session ended, waiting...\x1b[0m");
      lastHadOutput = false;
    }
  };

  // 首次输出
  await tick();

  // 持续轮询
  const timer = setInterval(async () => {
    try {
      await tick();
    } catch {
      // 轮询容错
    }
  }, intervalSec * 1000);

  // 优雅退出 — renderOneshot 已在每次渲染后记录会话，这里只需关闭数据库
  const cleanup = () => {
    clearInterval(timer);
    closeHistoryDb();
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // 保持进程运行
  await new Promise(() => {});
}

/** iTerm2 OSC 序列输出 */
function emitIterm2Osc(
  data: import("./types/StatusJSON").StatusJSON,
  tokenMetrics: import("./types/Widget").TokenMetrics | null
) {
  if (!process.env.TERM_PROGRAM?.includes("iTerm")) return;

  const model = typeof data.model === "string" ? data.model : data.model?.display_name || data.model?.id || "";
  const pct = data.context_window?.used_percentage ?? (data.context_window?.remaining_percentage != null ? 100 - data.context_window.remaining_percentage : null);
  const cost = data.cost?.total_cost_usd ?? null;
  const rl = data.rate_limits?.five_hour?.used_percentage ?? null;

  const payload = JSON.stringify({
    model,
    ctxPct: pct != null ? Math.round(pct) : null,
    cost: cost != null ? cost.toFixed(2) : null,
    rateLimit: rl != null ? Math.round(rl) : null,
    tokens: tokenMetrics ? { in: tokenMetrics.inputTokens, out: tokenMetrics.outputTokens } : null,
  });

  process.stdout.write(`\x1b]1337;Custom=id=statux:${payload}\x07`);
}

/** 直接写入 status.json（备用方案，确保 iTerm2 插件能读取） */
function writeStatusJson(
  data: import("./types/StatusJSON").StatusJSON,
  tokenMetrics: import("./types/Widget").TokenMetrics | null
) {
  const { mkdirSync, writeFileSync } = require("fs");
  const { join } = require("path");
  const HOME = process.env.HOME || require("os").homedir();
  const STATUS_FILE = join(HOME, ".cache", "statux", "status.json");

  try {
    const model = typeof data.model === "string" ? data.model : data.model?.display_name || data.model?.id || "";
    const pct = data.context_window?.used_percentage ?? (data.context_window?.remaining_percentage != null ? 100 - data.context_window.remaining_percentage : null);
    const cost = data.cost?.total_cost_usd ?? null;
    const rl = data.rate_limits?.five_hour?.used_percentage ?? null;

    const payload = {
      model,
      ctxPct: pct != null ? Math.round(pct) : null,
      cost: cost != null ? cost.toFixed(2) : null,
      rateLimit: rl != null ? Math.round(rl) : null,
      tokens: tokenMetrics ? { in: tokenMetrics.inputTokens, out: tokenMetrics.outputTokens } : null,
    };

    mkdirSync(join(HOME, ".cache", "statux"), { recursive: true });
    writeFileSync(STATUS_FILE, JSON.stringify(payload, null, 2));
  } catch {
    // 写入失败不影响主流程
  }
}

/** 打印会话历史 */
function printHistory(days: number) {
  const { getDailySummaries, getRecentSessions, getSummaryByModel } = require("./data/history");

  console.log(`\n📊 statux — 最近 ${days} 天用量统计\n`);

  // 每日汇总
  const daily = getDailySummaries(days);
  if (daily.length > 0) {
    console.log("日期         会话数   Token        费用");
    console.log("─".repeat(50));
    for (const d of daily) {
      const tokens = d.totalTokens >= 1_000_000
        ? `${(d.totalTokens / 1_000_000).toFixed(1)}M`
        : d.totalTokens >= 1_000
          ? `${(d.totalTokens / 1_000).toFixed(1)}K`
          : String(d.totalTokens);
      const cost = d.totalCostUsd < 0.01 ? "<$0.01" : `$${d.totalCostUsd.toFixed(2)}`;
      console.log(`${d.date}    ${String(d.sessionCount).padStart(4)}    ${tokens.padStart(10)}    ${cost.padStart(8)}`);
    }
    console.log("");
  } else {
    console.log("  暂无历史记录\n");
  }

  // 按模型汇总
  const byModel = getSummaryByModel(days);
  if (byModel.length > 0) {
    console.log("模型                          会话数     费用");
    console.log("─".repeat(50));
    for (const m of byModel.slice(0, 10)) {
      const cost = m.totalCostUsd < 0.01 ? "<$0.01" : `$${m.totalCostUsd.toFixed(2)}`;
      const name = m.model.length > 28 ? m.model.slice(0, 25) + "..." : m.model;
      console.log(`${name.padEnd(28)} ${String(m.sessionCount).padStart(5)}    ${cost.padStart(8)}`);
    }
    console.log("");
  }

  // 最近会话
  const recent = getRecentSessions(10);
  if (recent.length > 0) {
    console.log("最近会话:");
    console.log("工具          模型                          Token      费用");
    console.log("─".repeat(65));
    for (const s of recent) {
      const tokens = (s.tokenMetrics?.totalTokens ?? 0) >= 1_000_000
        ? `${((s.tokenMetrics?.totalTokens ?? 0) / 1_000_000).toFixed(1)}M`
        : (s.tokenMetrics?.totalTokens ?? 0) >= 1_000
          ? `${((s.tokenMetrics?.totalTokens ?? 0) / 1_000).toFixed(1)}K`
          : String(s.tokenMetrics?.totalTokens ?? 0);
      const cost = (s.costUsd ?? 0) < 0.01 ? "<$0.01" : `$${(s.costUsd ?? 0).toFixed(2)}`;
      const model = (s.model ?? "unknown").slice(0, 28);
      console.log(`${s.tool.padEnd(12)} ${model.padEnd(28)} ${tokens.padStart(10)} ${cost.padStart(8)}`);
    }
  }
}

/** 主函数 */
async function main() {
  // --setup 安装 iTerm2 插件
  if (process.argv.includes("--setup")) {
    const { setupIterm2 } = await import("./setup");
    setupIterm2();
    return;
  }

  // --tui 交互式配置
  if (process.argv.includes("--tui") || process.argv.includes("-t")) {
    const { default: React } = await import("react");
    const { render: inkRender } = await import("ink");
    const { App } = await import("./tui/App");
    const { registerAllWidgets: reg } = await import("./widgets");
    reg();
    inkRender(React.createElement(App));
    return;
  }

  // 后台加载 LiteLLM 定价数据（不阻塞首次渲染）
  ensurePricingLoaded();

  // --history 查看会话历史
  if (process.argv.includes("--history")) {
    await initPricingEngine();
    const daysArg = process.argv[process.argv.indexOf("--history") + 1];
    const days = daysArg ? parseInt(daysArg, 10) : 7;
    printHistory(isNaN(days) ? 7 : days);
    closeHistoryDb();
    return;
  }

  // --watch / -w [seconds] 轮询模式
  const watchIdx = process.argv.indexOf("--watch");
  const watchShort = process.argv.indexOf("-w");
  const watchFlagIdx = watchIdx !== -1 ? watchIdx : watchShort;
  if (watchFlagIdx !== -1) {
    const intervalArg = process.argv[watchFlagIdx + 1];
    const intervalSec = intervalArg ? parseInt(intervalArg, 10) : 5;
    if (isNaN(intervalSec) || intervalSec < 1) {
      console.error("statux: --watch interval must be >= 1 second");
      process.exit(1);
    }
    registerAllWidgets();
    await initPricingEngine();
    await renderWatch(intervalSec);
    return;
  }

  // --oneshot / -1 单次检测模式
  if (process.argv.includes("--oneshot") || process.argv.includes("-1")) {
    registerAllWidgets();
    await initPricingEngine();
    const ok = await renderOneshot();
    if (!ok) {
      console.log("\x1b[90mstatux: no active AI tool detected\x1b[0m");
    }
    process.exit(ok ? 0 : 1);
  }

  // --help
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`statux — AI Agent status display

Usage:
  echo '<json>' | statux          # Claude Code statusLine mode (stdin)
  statux --oneshot | -1           # Auto-detect tool, output once
  statux --watch [seconds] | -w   # Polling daemon mode (default 5s)
  statux --tui                    # Interactive config editor
  statux --history [days]         # Show usage history (default 7 days)
  statux --setup                  # Install iTerm2 plugin
  statux --config <path>          # Use custom config file
  statux --help                   # Show this help

Supported tools: Claude Code, Codex (OpenAI)`);
    return;
  }

  // 解析 --config 参数
  let configPath: string | undefined;
  const configIdx = process.argv.indexOf("--config");
  if (configIdx !== -1 && process.argv[configIdx + 1]) {
    configPath = process.argv[configIdx + 1];
  }

  // 注册所有 widget
  registerAllWidgets();

  // === Claude Code statusLine mode (stdin) ===
  const input = await readStdin();
  if (!input || input.trim() === "") {
    // 无 stdin — 尝试自动检测工具
    const tool = detectActiveTool() ?? inferToolFromLocalState();
    if (tool) {
      const ok = await renderOneshot();
      process.exit(ok ? 0 : 1);
    }
    console.log("\x1b[0mstatux: waiting for input...\x1b[0m");
    process.exit(0);
  }

  // 解析 StatusJSON
  let data;
  try {
    data = StatusJSONSchema.parse(JSON.parse(input));
  } catch (err) {
    console.error("statux: invalid input JSON", err);
    process.exit(1);
  }

  // 加载配置
  const config = loadConfig(configPath);

  // 构建渲染上下文 — 单次读取 JSONL，避免重复 I/O
  // statusLine 不一定传 transcript_path，回退到自动查找活跃会话的 JSONL
  const transcriptPath = data.transcript_path || findActiveTranscriptPath();
  const entries = transcriptPath ? parseJsonl(transcriptPath) : [];
  const tokenMetrics = entries.length > 0 ? getTokenMetrics(entries) : null;
  const sessionDuration = entries.length > 0 ? getSessionDuration(entries) : null;

  // 速度指标
  let speedMetrics = null;
  let windowedSpeedMetrics = null;
  if (entries.length > 0) {
    const collection = getSpeedMetricsCollection(entries, { windowSeconds: [30, 60] });
    if (collection) {
      speedMetrics = collection.sessionAverage;
      windowedSpeedMetrics = collection.windowed;
    }
  }

  // Usage 数据（优先从 rate_limits 提取，不完整时调用 API）
  const rateLimitsUsage = extractUsageFromRateLimits(data.rate_limits);
  const usageData = await fetchUsageData(rateLimitsUsage);

  // 预采集 Git 信息 — 单次调用替代 widget 各自 spawn 子进程
  const cwd = data.cwd || data.workspace?.current_dir;
  const gitInfo = collectGitInfo(cwd);

  const ctx: RenderContext = {
    data,
    tokenMetrics,
    speedMetrics,
    windowedSpeedMetrics,
    sessionDuration,
    terminalWidth: terminalColumns(),
    usageData,
    gitInfo,
    tool: "claude-code",
  };

  // 渲染
  const lines = renderStatusLines(config.lines, config, ctx);

  // 输出到 stdout
  for (const line of lines) {
    console.log(line);
  }

  // iTerm2 OSC 序列输出
  emitIterm2Osc(data, tokenMetrics);

  // 直接写入 status.json（备用方案，确保 iTerm2 插件能读取）
  writeStatusJson(data, tokenMetrics);

  // 记录会话历史
  try {
    recordSession({
      id: data.session_id || `stdin-${Date.now()}`,
      tool: "claude-code",
      model: typeof data.model === "string" ? data.model : data.model?.id,
      project: cwd,
      tokenMetrics,
      startedAt: undefined,
      endedAt: Date.now(),
    });
  } catch {
    // 记录失败不影响主流程
  }

  closeHistoryDb();
}

main().catch((err) => {
  console.error("statux error:", err);
  process.exit(1);
});
