import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const RateLimitWidget: Widget = {
  type: "rate-limit",
  category: "session",
  displayName: "Rate Limit",
  description: "速率限制使用百分比",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const rl = ctx.data.rate_limits?.five_hour;
    if (!rl?.used_percentage && rl?.used_percentage !== 0) return null;

    const pct = Math.round(rl.used_percentage);
    let color = item.color || this.defaultColor;
    if (pct > 80) color = "red";
    else if (pct > 50) color = "yellow";

    const label = item.rawValue ? "" : "rl:";
    return colorize(`${label}${pct}%`, color, item.bold);
  },
};
