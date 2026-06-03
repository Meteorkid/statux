#!/usr/bin/env bun
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";
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

const HOME = process.env.HOME || homedir();

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

/** 从 StatusJSON 数据生成稳定 session ID */
function resolveSessionId(data: { session_id?: string; transcript_path?: string; hook_event_name?: string }): string {
  if (data.session_id) return data.session_id;
  if (data.transcript_path) return `transcript:${data.transcript_path}`;
  return `stdin-${data.hook_event_name || "unknown"}`;
}

/** 从 transcript 路径提取稳定的 session ID（UUID 部分） */
function sessionIdFromTranscript(transcriptPath: string | undefined): string | null {
  if (!transcriptPath) return null;
  const match = transcriptPath.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/);
  return match ? match[1]! : null;
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

  // 使用稳定 session ID，避免每次刷新创建新记录
  // 优先用 session_id → transcript UUID → oneshot fallback
  const sessionId = ctx.data.session_id
    || sessionIdFromTranscript(ctx.data.transcript_path)
    || `oneshot:${ctx.tool}`;
  recordRenderContextSession(ctx, sessionId, "claude-code");

  return true;
}

/** 进程列表不可用时，从本地状态文件推断工具类型 */
function inferToolFromLocalState(): Tool | null {
  if (hasFreshCodexLocalState()) return "codex";
  return null;
}

/** 轮询模式 — 持续检测并渲染（带互斥锁防止僵尸进程） */
async function renderWatch(intervalSec: number) {
  const lockPath = join(HOME, ".cache", "statux", "watch.lock");
  try {
    mkdirSync(join(HOME, ".cache", "statux"), { recursive: true });
    if (existsSync(lockPath)) {
      const lockPid = parseInt(readFileSync(lockPath, "utf-8").trim(), 10);
      // 检查锁文件对应的进程是否还活着
      try {
        process.kill(lockPid, 0); // 信号 0 只检查进程是否存在
        console.error(`statux: 另一个 --watch 实例正在运行 (PID ${lockPid})，退出`);
        process.exit(1);
      } catch {
        // 进程不存在，清理过期锁
      }
    }
    writeFileSync(lockPath, String(process.pid), "utf-8");
  } catch {
    // 锁机制失败不阻止运行
  }

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

  // 优雅退出 — 清理锁文件和数据库
  const cleanup = () => {
    clearInterval(timer);
    try { if (existsSync(lockPath)) { const { unlinkSync } = require("fs"); unlinkSync(lockPath); } } catch {}
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

  if (command.type === "doctor") {
    const { runDoctor } = await import("./cli/doctor");
    process.exit(runDoctor());
  }

  if (command.type === "widgets") {
    registerAllWidgets();
    const { getAllWidgets } = await import("./widgets/registry");
    const widgets = getAllWidgets();
    const byCategory = new Map<string, typeof widgets>();
    for (const w of widgets) {
      const list = byCategory.get(w.category) || [];
      list.push(w);
      byCategory.set(w.category, list);
    }
    for (const [cat, list] of [...byCategory.entries()].sort()) {
      console.log(`\n\x1b[1m${cat}\x1b[0m`);
      for (const w of list) {
        console.log(`  \x1b[36m${w.type.padEnd(22)}\x1b[0m ${w.description}`);
      }
    }
    console.log(`\n\x1b[90m共 ${widgets.length} 个 widget\x1b[0m`);
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

  // === 快速路径：读取上次渲染缓存（消除刷新闪烁） ===
  const renderCachePath = join(HOME, ".cache", "statux", "render-cache.txt");
  const oscCachePath = join(HOME, ".cache", "statux", "osc-cache.txt");
  try {
    if (existsSync(renderCachePath)) {
      const { mtimeMs } = statSync(renderCachePath);
      if (Date.now() - mtimeMs < 10_000) {
        // 缓存新鲜，直接输出（<1ms）
        const cached = readFileSync(renderCachePath, "utf-8");
        if (cached) process.stdout.write(cached);
        // iTerm2 OSC 也用缓存
        if (existsSync(oscCachePath)) {
          const osc = readFileSync(oscCachePath, "utf-8");
          if (osc) process.stdout.write(osc);
        }
        return;
      }
    }
  } catch { /* 缓存读取失败，走正常路径 */ }

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

    // DEBUG: 记录 context_window 数据（按会话分文件）
    if (data.context_window) {
      try {
        const sessionId = data.session_id || "unknown";
        const debugPath = join(HOME, ".cache", "statux", `ctx-debug-${sessionId}.json`);
        mkdirSync(join(HOME, ".cache", "statux"), { recursive: true });
        writeFileSync(debugPath, JSON.stringify({
          session_id: data.session_id,
          transcript_path: data.transcript_path,
          used_percentage: data.context_window.used_percentage,
          remaining_percentage: data.context_window.remaining_percentage,
          total_input_tokens: data.context_window.total_input_tokens,
          context_window_size: data.context_window.context_window_size,
          current_usage: data.context_window.current_usage,
          timestamp: new Date().toISOString(),
        }, null, 2), "utf-8");
      } catch {}
    }
  } catch (err) {
    console.error("statux: invalid input JSON", err);
    process.exit(1);
  }

  // 加载配置
  const config = loadConfig(command.configPath);

  const ctx = await buildClaudeRenderContextFromStatusData(data, { lines: config.lines });

  // 渲染
  const lines = renderStatusLines(config.lines, config, ctx);

  // 输出到 stdout + 写入缓存（下次刷新即时输出）
  const output = lines.join("\n") + "\n";
  process.stdout.write(output);
  try {
    mkdirSync(join(HOME, ".cache", "statux"), { recursive: true });
    writeFileSync(renderCachePath, output, "utf-8");
  } catch { /* 缓存写入失败不影响主流程 */ }

  // iTerm2 OSC 序列输出 + 缓存
  emitIterm2Osc(ctx.data, ctx.tokenMetrics);
  try {
    // 捕获 iTerm2 OSC 输出到缓存
    if (process.env.TERM_PROGRAM?.includes("iTerm")) {
      const { buildIterm2StatusPayload } = await import("./data/iterm2-status");
      const oscPayload = JSON.stringify(buildIterm2StatusPayload(ctx.data, ctx.tokenMetrics));
      const oscOutput = `\x1b]1337;Custom=id=statux:${oscPayload}\x07`;
      writeFileSync(oscCachePath, oscOutput, "utf-8");
    }
  } catch { /* ignore */ }

  // 直接写入 status.json（备用方案，确保 iTerm2 插件能读取）
  writeStatusJson(ctx.data, ctx.tokenMetrics);

  // 记录会话历史（使用稳定 session ID，避免重复插入）
  recordRenderContextSession(ctx, resolveSessionId(data), "claude-code");

  closeHistoryDb();
}

main().catch((err) => {
  console.error("statux error:", err);
  process.exit(1);
});
