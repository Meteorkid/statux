import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { formatTokens } from "./format-utils";

const HOME = process.env.HOME || homedir();
const BAR_WIDTH = 10;
const FILLED = "█";
const EMPTY = "░";

/** 从上下文数据推算使用百分比（纯函数，无副作用，供 context-bar / context-pct / context-pct-usable 共用） */
export function inferContextPct(ctx: RenderContext): number | null {
  const cw = ctx.data.context_window;
  if (cw) {
    // 1. 直接百分比（Claude Code 报告的，封顶 100%）
    const direct = cw.used_percentage ?? (cw.remaining_percentage != null ? 100 - cw.remaining_percentage : null);
    if (direct != null && direct > 0) return direct;

    // 2. 从 total_input_tokens 计算
    if (cw.total_input_tokens != null && cw.total_input_tokens > 0 &&
        cw.context_window_size != null && cw.context_window_size > 0) {
      return (cw.total_input_tokens / cw.context_window_size) * 100;
    }
  }
  // 3. 从 JSONL 回退
  if (ctx.tokenMetrics?.contextLength && ctx.data.context_window?.context_window_size) {
    const windowSize = ctx.data.context_window.context_window_size;
    if (windowSize > 0) return (ctx.tokenMetrics.contextLength / windowSize) * 100;
  }
  return null;
}

/** 获取会话特定的缓存文件路径 */
function getCacheFile(ctx: RenderContext): string {
  const sessionId = ctx.data.session_id || ctx.data.transcript_path || "default";
  const safeName = sessionId.replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 50);
  return join(HOME, ".cache", "statux", `ctx-${safeName}.json`);
}

/** 读取上次缓存的 ctx 百分比 */
export function getCachedContextPct(ctx: RenderContext): number | null {
  try {
    const cacheFile = getCacheFile(ctx);
    if (existsSync(cacheFile)) {
      const data = JSON.parse(readFileSync(cacheFile, "utf-8"));
      if (data.pct != null && Date.now() - data.timestamp < 300_000) return data.pct;
    }
  } catch {}
  return null;
}

/** 缓存 ctx 百分比（只在 ctx-bar render 时调用一次） */
export function setCachedContextPct(ctx: RenderContext, pct: number): void {
  try {
    const cacheFile = getCacheFile(ctx);
    mkdirSync(join(HOME, ".cache", "statux"), { recursive: true });
    writeFileSync(cacheFile, JSON.stringify({ pct, timestamp: Date.now() }), "utf-8");
  } catch {}
}

export const ContextBarWidget: Widget = {
  type: "context-bar",
  category: "context",
  displayName: "Context Bar",
  description: "上下文窗口使用率进度条",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const rawPct = inferContextPct(ctx) ?? getCachedContextPct(ctx);
    if (rawPct == null) return null;

    // 缓存结果（只在 context-bar render 时写一次）
    setCachedContextPct(ctx, rawPct);

    const barPct = Math.max(0, Math.min(100, rawPct));
    const filled = Math.round((barPct / 100) * BAR_WIDTH);
    const empty = BAR_WIDTH - filled;
    const bar = FILLED.repeat(filled) + EMPTY.repeat(empty);

    let color: string;
    if (rawPct > 80) color = "red";
    else if (rawPct > 60) color = "magenta";
    else if (rawPct > 20) color = "green";
    else color = "white";

    const pctDisplay = `${Math.round(rawPct)}%`;
    const warning = rawPct > 85 ? " ⚠️/compact" : "";

    return colorize(`ctx:[${bar}] ${pctDisplay}${warning}`, color, item.bold);
  },
};
