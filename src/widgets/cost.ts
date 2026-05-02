import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const CostWidget: Widget = {
  type: "cost",
  category: "session",
  displayName: "Cost",
  description: "会话费用 (USD)",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const cost = ctx.data.cost?.total_cost_usd;
    if (cost == null) return null;

    const formatted = cost < 0.01 ? "<$0.01" : `$${cost.toFixed(2)}`;
    return colorize(formatted, item.color || this.defaultColor, item.bold);
  },
};
