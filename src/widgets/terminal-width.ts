import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const TerminalWidthWidget: Widget = {
  type: "terminal-width",
  category: "core",
  displayName: "Terminal Width",
  description: "终端宽度（列数）",
  defaultColor: "gray",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const width = ctx.terminalWidth;
    if (!width) return null;
    return colorize(`${width}col`, item.color || this.defaultColor, item.bold);
  },
};
