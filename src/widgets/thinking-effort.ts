import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

const EFFORT_LABELS: Record<string, string> = {
  low: "low",
  medium: "med",
  high: "high",
  xhigh: "xhigh",
};

const EFFORT_COLORS: Record<string, string> = {
  low: "gray",
  medium: "yellow",
  high: "green",
  xhigh: "cyan",
};

export const ThinkingEffortWidget: Widget = {
  type: "thinking-effort",
  category: "core",
  displayName: "Thinking Effort",
  description: "当前思维努力级别",
  defaultColor: "cyan",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const effort = ctx.data.effort;
    const level = effort?.level;
    if (!level) return null;

    const label = EFFORT_LABELS[level] || level;
    const color = item.color || EFFORT_COLORS[level] || this.defaultColor;
    return colorize(`think:${label}`, color, item.bold);
  },
};
