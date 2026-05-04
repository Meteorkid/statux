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
  description: "会话费用 (基于当前模型定价 + token 指标本地计算)",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    let cost: number | null = null;
    let isEstimated = false;

    const modelId = getModelId(ctx);

    if (modelId) {
      const pricing = getModelPricing(modelId);
      if (pricing) {
        // 优先：statusLine 的 total_input/total_output_tokens（累计、权威）
        const cw = ctx.data.context_window;
        const totalIn = cw?.total_input_tokens;
        const totalOut = cw?.total_output_tokens;

        if (totalIn != null || totalOut != null) {
          cost = computeCostFromTokens(
            totalIn ?? 0,
            totalOut ?? 0,
            0, // statusLine 不单独提供 cache tokens
            0,
            pricing
          );
          isEstimated = true;
        }

        // 回退：JSONL 解析的 tokenMetrics（累计）
        if (cost == null && ctx.tokenMetrics) {
          cost = computeCostFromTokens(
            ctx.tokenMetrics.inputTokens,
            ctx.tokenMetrics.outputTokens,
            ctx.tokenMetrics.cacheCreationTokens,
            ctx.tokenMetrics.cacheReadTokens,
            pricing
          );
          isEstimated = true;
        }
      }
    }

    // 最终回退：使用 Claude Code 客户端提供的费用
    if (cost == null) {
      cost = ctx.data.cost?.total_cost_usd ?? null;
    }

    if (cost == null) return null;

    const formatted = cost < 0.01 ? "<$0.01" : `$${cost.toFixed(2)}`;
    const display = isEstimated ? `~${formatted}` : formatted;
    return colorize(display, item.color || this.defaultColor, item.bold);
  },
};
