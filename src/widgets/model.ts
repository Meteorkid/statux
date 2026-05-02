import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

function extractModelName(ctx: RenderContext): string {
  const model = ctx.data.model;
  if (!model) return "unknown";
  if (typeof model === "string") return model;
  const display = model.display_name || model.id || "unknown";
  // 去掉上下文后缀如 "(1M context)" 或 "[1m]"
  return display
    .replace(/\s*\(.*?context\)/i, "")
    .replace(/\[.*?\]/, "")
    .trim();
}

export const ModelWidget: Widget = {
  type: "model",
  category: "core",
  displayName: "Model",
  description: "当前使用的模型名称",
  defaultColor: "cyan",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const name = extractModelName(ctx);
    if (!name || name === "unknown") return null;
    return colorize(name, item.color || this.defaultColor, item.bold);
  },
};
