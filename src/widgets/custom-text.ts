import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const CustomTextWidget: Widget = {
  type: "custom-text",
  category: "custom",
  displayName: "Custom Text",
  description: "自定义静态文本",
  defaultColor: "white",

  render(item: WidgetItem, _ctx: RenderContext): string | null {
    const text = item.metadata?.text as string;
    if (!text) return null;
    return colorize(text, item.color || this.defaultColor, item.bold);
  },
};

export const CustomSymbolWidget: Widget = {
  type: "custom-symbol",
  category: "custom",
  displayName: "Custom Symbol",
  description: "自定义符号/emoji",
  defaultColor: "white",

  render(item: WidgetItem, _ctx: RenderContext): string | null {
    const symbol = item.metadata?.symbol as string;
    if (!symbol) return null;
    return colorize(symbol, item.color || this.defaultColor, item.bold);
  },
};
