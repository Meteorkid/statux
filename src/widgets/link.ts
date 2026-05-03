import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const LinkWidget: Widget = {
  type: "link",
  category: "custom",
  displayName: "Link",
  description: "可点击的超链接 (OSC8)",
  defaultColor: "cyan",

  render(item: WidgetItem, _ctx: RenderContext): string | null {
    const url = item.metadata?.url as string;
    const text = (item.metadata?.text as string) || url;
    if (!url) return null;

    // 验证 URL
    if (!url.startsWith("http://") && !url.startsWith("https://")) return null;

    // OSC8 超链接格式: \e]8;;URL\e\\TEXT\e]8;;\e\\
    const osc8 = `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
    return colorize(osc8, item.color || this.defaultColor, item.bold);
  },
};
