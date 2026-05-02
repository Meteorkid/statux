import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const SessionClockWidget: Widget = {
  type: "session-clock",
  category: "session",
  displayName: "Session Clock",
  description: "会话时长",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    let duration = ctx.sessionDuration;

    // 从 StatusJSON 的 cost 字段获取时长
    if (!duration && ctx.data.cost?.total_duration_ms) {
      const ms = ctx.data.cost.total_duration_ms;
      const minutes = Math.floor(ms / 60000);
      const hours = Math.floor(minutes / 60);
      duration = hours > 0 ? `${hours}h${minutes % 60}m` : `${minutes}m`;
    }

    if (!duration) return null;
    return colorize(duration, item.color || this.defaultColor, item.bold);
  },
};
