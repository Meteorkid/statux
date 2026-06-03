import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { inferContextPct, getCachedContextPct } from "./context-bar";

export const ContextPctWidget: Widget = {
  type: "context-pct",
  category: "context",
  displayName: "Context %",
  description: "上下文窗口使用百分比",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const rawPct = inferContextPct(ctx) ?? getCachedContextPct(ctx);
    if (rawPct == null) return null;
    const pct = Math.max(0, Math.min(999, rawPct));

    let color = item.color || this.defaultColor;
    if (pct > 80) color = "red";
    else if (pct > 60) color = "magenta";

    const label = item.rawValue ? "" : "ctx:";
    return colorize(`${label}${Math.round(pct)}%`, color, item.bold);
  },
};
