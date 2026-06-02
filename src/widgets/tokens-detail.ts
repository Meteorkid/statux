import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return String(n);
}

export const TokensInputWidget: Widget = {
  type: "tokens-input",
  category: "tokens",
  displayName: "Input Tokens",
  description: "输入 token 数",
  defaultColor: "cyan",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    // 取两个数据源的较大值（token 单调递增，压缩后更准确）
    const fromData = ctx.data.context_window?.total_input_tokens;
    const fromJsonl = ctx.tokenMetrics?.inputTokens;
    const a = fromData ?? 0;
    const b = fromJsonl ?? 0;
    const count = Math.max(a, b);
    if (count === 0 && fromData == null && fromJsonl == null) return null;
    return colorize(`in:${formatTokens(count)}`, item.color || this.defaultColor, item.bold);
  },
};

export const TokensOutputWidget: Widget = {
  type: "tokens-output",
  category: "tokens",
  displayName: "Output Tokens",
  description: "输出 token 数",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const fromData = ctx.data.context_window?.total_output_tokens;
    const fromJsonl = ctx.tokenMetrics?.outputTokens;
    const a = fromData ?? 0;
    const b = fromJsonl ?? 0;
    const count = Math.max(a, b);
    if (count === 0 && fromData == null && fromJsonl == null) return null;
    return colorize(`out:${formatTokens(count)}`, item.color || this.defaultColor, item.bold);
  },
};

export const TokensCachedWidget: Widget = {
  type: "tokens-cached",
  category: "tokens",
  displayName: "Cached Tokens",
  description: "缓存 token 数",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const count = ctx.tokenMetrics?.cachedTokens ?? null;
    if (count == null) return null;
    return colorize(`cache:${formatTokens(count)}`, item.color || this.defaultColor, item.bold);
  },
};

export const TokensTotalWidget: Widget = {
  type: "tokens-total",
  category: "tokens",
  displayName: "Total Tokens",
  description: "总 token 数 (输入+输出)",
  defaultColor: "white",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const a = ctx.tokenMetrics?.inputTokens ?? ctx.data.context_window?.total_input_tokens ?? 0;
    const b = ctx.tokenMetrics?.outputTokens ?? ctx.data.context_window?.total_output_tokens ?? 0;
    if (a === 0 && b === 0) return null;
    return colorize(`total:${formatTokens(a + b)}`, item.color || this.defaultColor, item.bold);
  },
};
