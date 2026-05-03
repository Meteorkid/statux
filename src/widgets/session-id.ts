import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const SessionIdWidget: Widget = {
  type: "session-id",
  category: "core",
  displayName: "Session ID",
  description: "会话 UUID",
  defaultColor: "gray",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const id = ctx.data.session_id;
    if (!id) return null;
    const maxLen = (item.metadata?.maxLength as number) || 8;
    const display = id.length > maxLen ? id.slice(0, maxLen) : id;
    return colorize(display, item.color || this.defaultColor, item.bold);
  },
};
