import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { formatTokens } from "./format-utils";

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
  description: "总 token 数（输入+输出+缓存，与费用计算一致）",
  defaultColor: "white",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    // 优先用 totalTokens（包含 cache），确保与费用计算匹配
    if (ctx.tokenMetrics?.totalTokens) {
      return colorize(`total:${formatTokens(ctx.tokenMetrics.totalTokens)}`, item.color || this.defaultColor, item.bold);
    }
    // 回退：用 StatusJSON 的数据（不含 cache，但比不显示好）
    const a = ctx.data.context_window?.total_input_tokens ?? 0;
    const b = ctx.data.context_window?.total_output_tokens ?? 0;
    if (a === 0 && b === 0) return null;
    return colorize(`total:${formatTokens(a + b)}*`, item.color || this.defaultColor, item.bold);
  },
};
