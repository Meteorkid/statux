import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

function renderProgressBar(pct: number, width: number): string {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
}

export const WeeklyUsageWidget: Widget = {
  type: "weekly-usage",
  category: "usage",
  displayName: "Weekly Usage",
  description: "7 天使用百分比（Anthropic API）",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (!ctx.usageData) return null;
    const pct = ctx.usageData.weeklyUsage;
    if (pct == null) return null;

    const clamped = Math.max(0, Math.min(100, pct));
    const invert = item.metadata?.invert === true;
    const displayPct = invert ? 100 - clamped : clamped;
    const color = clamped > 80 ? "red" : clamped > 60 ? "yellow" : item.color || this.defaultColor;
    const mode = (item.metadata?.mode as string) || "compact";

    switch (mode) {
      case "bar":
        return colorize(`${renderProgressBar(displayPct, 32)} ${Math.round(displayPct)}%`, color, item.bold);
      case "bar-short":
        return colorize(`${renderProgressBar(displayPct, 16)} ${Math.round(displayPct)}%`, color, item.bold);
      case "slider":
        return colorize(`${Math.round(displayPct)}%`, color, item.bold);
      case "compact":
      default:
        return colorize(`weekly:${Math.round(displayPct)}%`, color, item.bold);
    }
  },
};
