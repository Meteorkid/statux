import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { formatTokens } from "./format-utils";

export const TokensWidget: Widget = {
  type: "tokens",
  category: "tokens",
  displayName: "Tokens",
  description: "输入/输出 token 统计（含 cache 信息，与费用计算一致）",
  defaultColor: "gray",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const tm = ctx.tokenMetrics;
    if (!tm) return null;

    const inStr = formatTokens(tm.inputTokens);
    const outStr = formatTokens(tm.outputTokens);

    // 当有显著 cache tokens 时显示，帮助用户理解费用构成
    let cacheStr = "";
    if (tm.cacheReadTokens > 0) {
      cacheStr = ` cache:${formatTokens(tm.cacheReadTokens)}`;
    } else if (tm.cacheCreationTokens > 0) {
      cacheStr = ` cache:+${formatTokens(tm.cacheCreationTokens)}`;
    }

    return colorize(`in:${inStr} out:${outStr}${cacheStr}`, item.color || this.defaultColor, item.bold);
  },
};
