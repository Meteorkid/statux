import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export const TokensWidget: Widget = {
  type: "tokens",
  category: "tokens",
  displayName: "Tokens",
  description: "输入/输出 token 统计",
  defaultColor: "gray",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const tm = ctx.tokenMetrics;
    if (!tm) return null;

    const inStr = formatTokens(tm.inputTokens);
    const outStr = formatTokens(tm.outputTokens);

    const label = item.rawValue ? "" : "";
    return colorize(`${label}in:${inStr} out:${outStr}`, item.color || this.defaultColor, item.bold);
  },
};
