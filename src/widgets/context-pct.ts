import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const ContextPctWidget: Widget = {
  type: "context-pct",
  category: "context",
  displayName: "Context %",
  description: "上下文窗口使用百分比",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const cw = ctx.data.context_window;
    if (!cw) return null;

    const pct = cw.used_percentage ?? (cw.remaining_percentage != null ? 100 - cw.remaining_percentage : null);
    if (pct == null) return null;

    let color = item.color || this.defaultColor;
    if (pct > 80) color = "red";
    else if (pct > 60) color = "yellow";

    const label = item.rawValue ? "" : "ctx:";
    return colorize(`${label}${Math.round(pct)}%`, color, item.bold);
  },
};
