/**
 * 效率指标 Widget
 *
 * 显示当前会话的费用效率和 token 吞吐率。
 */

import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { computeSessionCost } from "./cost";

/** 从会话时长字符串解析分钟数 */
function parseDurationToMinutes(duration: string | null): number {
  if (!duration) return 0;
  const hourMatch = duration.match(/(\d+)h/);
  const minMatch = duration.match(/(\d+)m/);
  return (hourMatch ? parseInt(hourMatch[1]!) * 60 : 0) + (minMatch ? parseInt(minMatch[1]!) : 0);
}

export const CostRateWidget: Widget = {
  type: "cost-rate",
  category: "session",
  displayName: "Cost Rate",
  description: "每分钟费用（$/min），衡量 token 消耗效率",
  defaultColor: "cyan",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (!ctx.sessionDuration) return null;

    // 使用与 cost widget 相同的双源取大逻辑
    const { cost } = computeSessionCost(ctx);
    if (cost == null || cost <= 0) return null;

    const minutes = parseDurationToMinutes(ctx.sessionDuration);
    if (minutes <= 0) return null;

    const rate = cost / minutes;
    const formatted = rate < 0.01 ? "<$0.01" : `$${rate.toFixed(2)}`;

    const color = rate > 1 ? "red" : rate > 0.5 ? "yellow" : item.color || this.defaultColor;
    return colorize(`${formatted}/min`, color, item.bold);
  },
};

export const TokenRateWidget: Widget = {
  type: "token-rate",
  category: "session",
  displayName: "Token Rate",
  description: "每分钟 token 吞吐率",
  defaultColor: "magenta",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (!ctx.tokenMetrics || !ctx.sessionDuration) return null;

    const minutes = parseDurationToMinutes(ctx.sessionDuration);
    if (minutes <= 0) return null;

    const tokensPerMin = ctx.tokenMetrics.totalTokens / minutes;
    const formatted = tokensPerMin >= 1000
      ? `${(tokensPerMin / 1000).toFixed(1)}K`
      : Math.round(tokensPerMin).toString();

    return colorize(`${formatted}/min`, item.color || this.defaultColor, item.bold);
  },
};

export const SessionEfficiencyWidget: Widget = {
  type: "session-efficiency",
  category: "session",
  displayName: "Session Efficiency",
  description: "综合效率指标：费用/token/时长",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (!ctx.tokenMetrics || !ctx.sessionDuration) return null;

    const modelId = typeof ctx.data.model === "string"
      ? ctx.data.model
      : ctx.data.model?.id || ctx.data.model?.display_name || "";

    const minutes = parseDurationToMinutes(ctx.sessionDuration);
    if (minutes <= 0) return null;

    const tokens = ctx.tokenMetrics.totalTokens;
    const tokensPerMin = tokens >= 1000
      ? `${(tokens / 1000 / minutes).toFixed(1)}K`
      : `${Math.round(tokens / minutes)}`;

    let costStr = "";
    if (modelId) {
      const { cost } = computeSessionCost(ctx);
      if (cost != null) costStr = ` $${cost.toFixed(2)}`;
    }

    return colorize(
      `${tokensPerMin}/min${costStr}`,
      item.color || this.defaultColor,
      item.bold
    );
  },
};
