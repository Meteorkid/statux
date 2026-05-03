import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const OutputStyleWidget: Widget = {
  type: "output-style",
  category: "core",
  displayName: "Output Style",
  description: "当前输出风格",
  defaultColor: "cyan",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const style = ctx.data.output_style?.name;
    if (!style) return null;
    return colorize(style, item.color || this.defaultColor, item.bold);
  },
};
