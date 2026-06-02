import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { formatDuration, renderProgressBar } from "./format-utils";

export const BlockTimerWidget: Widget = {
  type: "block-timer",
  category: "usage",
  displayName: "Block Timer",
  description: "5 小时使用块计时器",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const rateLimit = ctx.data.rate_limits?.five_hour;
    if (!rateLimit) return null;

    const pct = rateLimit.used_percentage;
    if (pct == null) return null;

    const mode = (item.metadata?.mode as string) || "compact";
    const color = pct > 80 ? "red" : pct > 60 ? "yellow" : item.color || this.defaultColor;

    switch (mode) {
      case "bar":
        return colorize(`${renderProgressBar(pct, 32)} ${Math.round(pct)}%`, color, item.bold);
      case "bar-short":
        return colorize(`${renderProgressBar(pct, 16)} ${Math.round(pct)}%`, color, item.bold);
      case "compact":
      default:
        return colorize(`block:${Math.round(pct)}%`, color, item.bold);
    }
  },
};

export const RateLimitTimerWidget: Widget = {
  type: "rate-limit-timer",
  category: "usage",
  displayName: "Rate Limit Timer",
  description: "限速重置倒计时",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const rateLimit = ctx.data.rate_limits?.five_hour;
    if (!rateLimit?.resets_at) return null;

    const resetTime = new Date(rateLimit.resets_at * 1000).getTime();
    const now = Date.now();
    const remaining = resetTime - now;

    if (remaining <= 0) return null;

    const color = remaining < 1800000 ? "red" : "yellow"; // < 30min = red
    return colorize(`rl:${formatDuration(remaining)}`, color, item.bold);
  },
};
