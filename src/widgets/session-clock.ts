import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const SessionClockWidget: Widget = {
  type: "session-clock",
  category: "session",
  displayName: "Session Clock",
  description: "活跃时长（排除闲置时间）",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    // 优先使用活跃时长，回退到会话时长
    let duration = ctx.activeDuration || ctx.sessionDuration;

    // 从 StatusJSON 的 cost 字段获取时长
    if (!duration && ctx.data.cost?.total_duration_ms) {
      const ms = ctx.data.cost.total_duration_ms;
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const hours = Math.floor(minutes / 60);
      if (hours > 0) duration = `${hours}h${minutes % 60}m`;
      else if (minutes > 0) duration = `${minutes}m`;
      else duration = `${totalSeconds}s`;
    }

    if (!duration) return null;
    return colorize(duration, item.color || this.defaultColor, item.bold);
  },
};
