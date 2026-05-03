import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { buildWeeklyWindow } from "../data/usage-api";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join("");
}

function renderProgressBar(pct: number, width: number): string {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
}

export const WeeklyResetTimerWidget: Widget = {
  type: "weekly-reset-timer",
  category: "usage",
  displayName: "Weekly Reset Timer",
  description: "7 天窗口重置倒计时",
  defaultColor: "cyan",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (!ctx.usageData?.weeklyResetAt) return null;

    const window = buildWeeklyWindow(ctx.usageData.weeklyResetAt);
    if (!window) return null;

    const mode = (item.metadata?.mode as string) || "compact";
    const invert = item.metadata?.invert === true;
    const pct = invert ? window.elapsedPercent : 100 - window.elapsedPercent;
    const color = pct < 20 ? "red" : pct < 40 ? "yellow" : item.color || this.defaultColor;

    switch (mode) {
      case "bar":
        return colorize(`${renderProgressBar(pct, 32)} ${formatDuration(window.remainingMs)}`, color, item.bold);
      case "bar-short":
        return colorize(`${renderProgressBar(pct, 16)} ${formatDuration(window.remainingMs)}`, color, item.bold);
      case "date": {
        const resetDate = new Date(ctx.usageData.weeklyResetAt);
        const dateStr = resetDate.toLocaleString();
        return colorize(`reset: ${dateStr}`, color, item.bold);
      }
      case "compact":
      default:
        return colorize(`week:${formatDuration(window.remainingMs)}`, color, item.bold);
    }
  },
};
