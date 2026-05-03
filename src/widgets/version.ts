import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const VersionWidget: Widget = {
  type: "version",
  category: "core",
  displayName: "Version",
  description: "Claude Code CLI 版本",
  defaultColor: "gray",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const version = ctx.data.version;
    if (!version) return null;
    return colorize(`v${version}`, item.color || this.defaultColor, item.bold);
  },
};
