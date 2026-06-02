import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

const BAR_WIDTH = 10;
const FILLED = "█";
const EMPTY = "░";

/** 从上下文数据推算使用百分比（供 context-bar / context-pct / context-pct-usable 共用） */
export function inferContextPct(ctx: RenderContext): number | null {
  const cw = ctx.data.context_window;
  // 1. 直接百分比
  if (cw) {
    const direct = cw.used_percentage ?? (cw.remaining_percentage != null ? 100 - cw.remaining_percentage : null);
    if (direct != null) return direct;
    // 2. 从 token 数和窗口大小计算
    if (cw.total_input_tokens != null && cw.context_window_size != null && cw.context_window_size > 0) {
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

export const ContextBarWidget: Widget = {
  type: "context-bar",
  category: "context",
  displayName: "Context Bar",
  description: "上下文窗口使用率进度条",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const pct = inferContextPct(ctx);
    if (pct == null) return null;

    const filled = Math.round((pct / 100) * BAR_WIDTH);
    const empty = BAR_WIDTH - filled;
    const bar = FILLED.repeat(filled) + EMPTY.repeat(empty);

    let color: string;
    if (pct > 80) color = "red";
    else if (pct > 60) color = "magenta";
    else if (pct > 20) color = "green";
    else color = "white";

    return colorize(`ctx:[${bar}] ${Math.round(pct)}%`, color, item.bold);
  },
};
