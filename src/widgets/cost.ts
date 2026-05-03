import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { getModelPricing, computeCostFromTokens } from "../data/model-pricing";

function getModelId(ctx: RenderContext): string {
  const model = ctx.data.model;
  if (typeof model === "string") return model;
  return model?.id || model?.display_name || "";
}

export const CostWidget: Widget = {
  type: "cost",
  category: "session",
  displayName: "Cost",
  description: "会话费用 (USD)",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    let cost: number | null = null;
    let isEstimated = false;

    // 优先：根据模型定价 + token 指标本地计算
    const modelId = getModelId(ctx);
    const metrics = ctx.tokenMetrics;
    if (modelId && metrics) {
      const pricing = getModelPricing(modelId);
      if (pricing) {
        cost = computeCostFromTokens(
          metrics.inputTokens,
          metrics.outputTokens,
          metrics.cacheCreationTokens,
          metrics.cacheReadTokens,
          pricing
        );
        isEstimated = true;
      }
    }

    // 回退：使用 Claude Code 客户端提供的费用
    if (cost == null) {
      cost = ctx.data.cost?.total_cost_usd ?? null;
    }

    if (cost == null) return null;

    const formatted = cost < 0.01 ? "<$0.01" : `$${cost.toFixed(2)}`;
    // 本地计算时添加 ~ 前缀表示估算值
    const display = isEstimated ? `~${formatted}` : formatted;
    return colorize(display, item.color || this.defaultColor, item.bold);
  },
};
