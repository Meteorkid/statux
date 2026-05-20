#!/usr/bin/env bun
import { StatusJSONSchema } from "./types/StatusJSON";
import { loadConfig } from "./config";
import { registerAllWidgets } from "./widgets";
import { renderStatusLines } from "./render/pipeline";
import { initPricingEngine, ensurePricingLoaded } from "./data/model-pricing";
import { closeHistoryDb } from "./data/history";
import { detectActiveTool, type Tool } from "./types/Tool";
import { hasFreshCodexLocalState } from "./data/codex";
import {
  buildClaudeRenderContextFromActiveSession,
  buildClaudeRenderContextFromStatusData,
  buildCodexRenderContextFromLocalState,
} from "./data/render-context";
import { parseCliCommand, HELP_TEXT } from "./cli/args";
import { emitIterm2Osc, writeStatusJson } from "./cli/output";
import { printHistory, recordRenderContextSession } from "./cli/session-history";

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
  const activeTool = detectActiveTool();
  const tool = activeTool ?? inferToolFromLocalState();

  if (!tool) {
    return false;
  }

  const config = loadConfig();
  const requireFreshLocalState = activeTool == null;
  const ctx =
    tool === "codex"
      ? buildCodexRenderContextFromLocalState(requireFreshLocalState, { lines: config.lines })
      : buildClaudeRenderContextFromActiveSession({ lines: config.lines });

  if (!ctx) return false;

  const lines = renderStatusLines(config.lines, config, ctx);
  for (const line of lines) {
    console.log(line);
  }

  // iTerm2 OSC 序列输出（用于状态栏更新）
  emitIterm2Osc(ctx.data, ctx.tokenMetrics);

  // 直接写入 status.json（备用方案，确保 iTerm2 插件能读取）
  writeStatusJson(ctx.data, ctx.tokenMetrics);

  // 记录会话历史
  recordRenderContextSession(ctx, `${ctx.tool}-${Date.now()}`, "claude-code");

  return true;
}

/** 进程列表不可用时，从本地状态文件推断工具类型 */
function inferToolFromLocalState(): Tool | null {
  if (hasFreshCodexLocalState()) return "codex";
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

/** 主函数 */
async function main() {
  const command = parseCliCommand(process.argv);

  if (command.type === "setup") {
    const { setupIterm2 } = await import("./setup");
    setupIterm2();
    return;
  }

  if (command.type === "tui") {
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

  if (command.type === "history") {
    await initPricingEngine();
    printHistory(command.days);
    closeHistoryDb();
    return;
  }

  if (command.type === "watch") {
    if (command.intervalSec < 1) {
      console.error("statux: --watch interval must be >= 1 second");
      process.exit(1);
    }
    registerAllWidgets();
    await initPricingEngine();
    await renderWatch(command.intervalSec);
    return;
  }

  if (command.type === "oneshot") {
    registerAllWidgets();
    await initPricingEngine();
    const ok = await renderOneshot();
    if (!ok) {
      console.log("\x1b[90mstatux: no active AI tool detected\x1b[0m");
    }
    process.exit(ok ? 0 : 1);
  }

  if (command.type === "help") {
    console.log(HELP_TEXT);
    return;
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
  const config = loadConfig(command.configPath);

  const ctx = await buildClaudeRenderContextFromStatusData(data, { lines: config.lines });

  // 渲染
  const lines = renderStatusLines(config.lines, config, ctx);

  // 输出到 stdout
  for (const line of lines) {
    console.log(line);
  }

  // iTerm2 OSC 序列输出
  emitIterm2Osc(ctx.data, ctx.tokenMetrics);

  // 直接写入 status.json（备用方案，确保 iTerm2 插件能读取）
  writeStatusJson(ctx.data, ctx.tokenMetrics);

  // 记录会话历史
  recordRenderContextSession(ctx, data.session_id || `stdin-${Date.now()}`, "claude-code");

  closeHistoryDb();
}

main().catch((err) => {
  console.error("statux error:", err);
  process.exit(1);
});
