import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { inferContextPct } from "./context-bar";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return String(n);
}

export const ContextLengthWidget: Widget = {
  type: "context-length",
  category: "context",
  displayName: "Context Length",
  description: "当前上下文长度（tokens）",
  defaultColor: "cyan",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    // 优先用 StatusJSON，回退到 JSONL 解析的上下文长度
    const used = ctx.data.context_window?.total_input_tokens ?? ctx.tokenMetrics?.contextLength ?? null;
    if (used == null || used === 0) return null;
    const text = formatTokens(used);
    return colorize(text, item.color || this.defaultColor, item.bold);
  },
};

export const ContextWindowWidget: Widget = {
  type: "context-window",
  category: "context",
  displayName: "Context Window",
  description: "上下文窗口大小（tokens）",
  defaultColor: "blue",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const max = ctx.data.context_window?.context_window_size;
    if (max == null) return null;
    const text = formatTokens(max);
    return colorize(text, item.color || this.defaultColor, item.bold);
  },
};

export const ContextPctUsableWidget: Widget = {
  type: "context-pct-usable",
  category: "context",
  displayName: "Context % (Usable)",
  description: "可用上下文百分比（基于 80% 上限）",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const pct = inferContextPct(ctx);
    if (pct == null) return null;
    // 可用百分比 = 实际百分比 / 80% (auto-compact 阈值)
    const usablePct = Math.min(100, Math.round((pct / 80) * 100));
    const color = usablePct > 90 ? "red" : usablePct > 70 ? "yellow" : item.color || this.defaultColor;
    return colorize(`${usablePct}%`, color, item.bold);
  },
};
