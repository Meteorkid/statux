#!/usr/bin/env bun
import { StatusJSONSchema } from "./types/StatusJSON";
import type { RenderContext } from "./types/Widget";
import { loadConfig } from "./config";
import { registerAllWidgets } from "./widgets";
import { renderStatusLines } from "./render/pipeline";
import { getTokenMetrics, getSessionDuration, getSpeedMetricsCollection } from "./data/jsonl";
import { fetchUsageData, extractUsageFromRateLimits } from "./data/usage-api";
import { terminalColumns } from "./utils/terminal";

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

  // --help
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`statux — AI Agent status display

Usage:
  echo '<json>' | statux          # Claude Code statusLine mode
  statux --tui                    # Interactive config editor
  statux --setup                  # Install iTerm2 plugin
  statux --config <path>          # Use custom config file
  statux --help                   # Show this help`);
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

  // 读取 stdin
  const input = await readStdin();
  if (!input || input.trim() === "") {
    // 无输入时显示默认状态
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

  // 构建渲染上下文
  const transcriptPath = data.transcript_path;
  const tokenMetrics = transcriptPath ? getTokenMetrics(transcriptPath) : null;
  const sessionDuration = transcriptPath ? getSessionDuration(transcriptPath) : null;

  // 速度指标
  let speedMetrics = null;
  let windowedSpeedMetrics = null;
  if (transcriptPath) {
    const collection = getSpeedMetricsCollection(transcriptPath, { windowSeconds: [30, 60] });
    if (collection) {
      speedMetrics = collection.sessionAverage;
      windowedSpeedMetrics = collection.windowed;
    }
  }

  // Usage 数据（优先从 rate_limits 提取，不完整时调用 API）
  const rateLimitsUsage = extractUsageFromRateLimits(data.rate_limits);
  const usageData = await fetchUsageData(rateLimitsUsage);

  const ctx: RenderContext = {
    data,
    tokenMetrics,
    speedMetrics,
    windowedSpeedMetrics,
    sessionDuration,
    terminalWidth: terminalColumns(),
    usageData,
  };

  // 渲染
  const lines = renderStatusLines(config.lines, config, ctx);

  // 输出到 stdout
  for (const line of lines) {
    console.log(line);
  }

  // iTerm2 OSC 序列输出
  emitIterm2Osc(data, tokenMetrics);
}

/** 向 iTerm2 发送 OSC 1337 自定义序列 */
function emitIterm2Osc(
  data: import("./types/StatusJSON").StatusJSON,
  tokenMetrics: import("./types/Widget").TokenMetrics | null
) {
  // 只在 iTerm2 环境中发送
  if (!process.env.TERM_PROGRAM?.includes("iTerm")) return;

  const model = typeof data.model === "string" ? data.model : data.model?.display_name || data.model?.id || "";
  const pct = data.context_window?.used_percentage ?? null;
  const cost = data.cost?.total_cost_usd ?? null;
  const rl = data.rate_limits?.five_hour?.used_percentage ?? null;

  const payload = JSON.stringify({
    model,
    ctxPct: pct != null ? Math.round(pct) : null,
    cost: cost != null ? cost.toFixed(2) : null,
    rateLimit: rl != null ? Math.round(rl) : null,
    tokens: tokenMetrics ? { in: tokenMetrics.inputTokens, out: tokenMetrics.outputTokens } : null,
  });

  // OSC 1337 自定义序列
  process.stdout.write(`\x1b]1337;Custom=id=statux:${payload}\x07`);
}

main().catch((err) => {
  console.error("statux error:", err);
  process.exit(1);
});
