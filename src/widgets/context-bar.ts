import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

const BAR_WIDTH = 10;
const FILLED = "█";
const EMPTY = "░";

export const ContextBarWidget: Widget = {
  type: "context-bar",
  category: "context",
  displayName: "Context Bar",
  description: "上下文窗口使用率进度条",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const cw = ctx.data.context_window;
    if (!cw) return null;

    const pct = cw.used_percentage ?? (cw.remaining_percentage != null ? 100 - cw.remaining_percentage : null);
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
