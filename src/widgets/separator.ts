import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const SeparatorWidget: Widget = {
  type: "separator",
  category: "layout",
  displayName: "Separator",
  description: "分隔符",
  defaultColor: "gray",

  render(item: WidgetItem, _ctx: RenderContext): string {
    const sep = (item.metadata?.separator as string) || " │ ";
    return colorize(sep, item.color || this.defaultColor);
  },
};
