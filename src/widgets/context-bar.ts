import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

const BAR_WIDTH = 10;
const FILLED = "█";
const EMPTY = "░";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return String(n);
}

/** 从上下文数据推算使用百分比（供 context-bar / context-pct / context-pct-usable 共用） */
export function inferContextPct(ctx: RenderContext): number | null {
  const cw = ctx.data.context_window;
  if (cw) {
    // 1. 从 total_input_tokens 计算真实百分比（可超过 100%）
    //    但要过滤掉空数据（total_input_tokens = 0 且 used_percentage = 0）
    if (cw.total_input_tokens != null && cw.total_input_tokens > 0 &&
        cw.context_window_size != null && cw.context_window_size > 0) {
      return (cw.total_input_tokens / cw.context_window_size) * 100;
    }

    // 2. 直接百分比（Claude Code 报告的，会被封顶在 100%）
    //    但要过滤掉空数据（used_percentage = 0 且 total_input_tokens = 0）
    const direct = cw.used_percentage ?? (cw.remaining_percentage != null ? 100 - cw.remaining_percentage : null);
    if (direct != null && direct > 0) return direct;
  }
  // 3. 从 JSONL 回退
  if (ctx.tokenMetrics?.contextLength && ctx.data.context_window?.context_window_size) {
    const windowSize = ctx.data.context_window.context_window_size;
    if (windowSize > 0) return (ctx.tokenMetrics.contextLength / windowSize) * 100;
  }
  return null;
}

export const ContextBarWidget: Widget = {
  type: "context-bar",
  category: "context",
  displayName: "Context Bar",
  description: "上下文窗口使用率进度条",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const rawPct = inferContextPct(ctx);
    if (rawPct == null) return null;

    // bar 视觉上限 100%，但百分比显示实际值（可以 >100% 表示溢出）
    const barPct = Math.max(0, Math.min(100, rawPct));
    const filled = Math.round((barPct / 100) * BAR_WIDTH);
    const empty = BAR_WIDTH - filled;
    const bar = FILLED.repeat(filled) + EMPTY.repeat(empty);

    let color: string;
    if (rawPct > 80) color = "red";
    else if (rawPct > 60) color = "magenta";
    else if (rawPct > 20) color = "green";
    else color = "white";

    // 超 100% 时显示实际 token 数，帮助判断是否需要手动压缩
    const pctDisplay = rawPct > 100
      ? `${Math.round(rawPct)}% (${formatTokens(ctx.tokenMetrics?.contextLength ?? ctx.data.context_window?.total_input_tokens ?? 0)})`
      : `${Math.round(rawPct)}%`;

    // 超过 85% 时添加压缩提醒
    const warning = rawPct > 85 ? " ⚠️/compact" : "";

    return colorize(`ctx:[${bar}] ${pctDisplay}${warning}`, color, item.bold);
  },
};
