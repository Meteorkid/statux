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
  description: "会话累计费用 (同时参考 statusLine 与 JSONL，取较大值确保压缩上下文后不丢失)",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    let cost: number | null = null;
    let isEstimated = false;

    const modelId = getModelId(ctx);

    if (modelId) {
      const pricing = getModelPricing(modelId);
      if (pricing) {
        // 同时计算两个数据源的费用，取较大值
        // — token 数是单调递增的，更大的值更接近真实的会话累计
        let costFromStatusLine: number | null = null;
        let costFromJsonl: number | null = null;

        // 数据源 1：statusLine context_window
        const cw = ctx.data.context_window;
        const totalIn = cw?.total_input_tokens;
        const totalOut = cw?.total_output_tokens;
        if (totalIn != null || totalOut != null) {
          costFromStatusLine = computeCostFromTokens(
            totalIn ?? 0,
            totalOut ?? 0,
            0,
            0,
            pricing
          );
        }

        // 数据源 2：JSONL 解析（含 cache tokens）
        if (ctx.tokenMetrics) {
          costFromJsonl = computeCostFromTokens(
            ctx.tokenMetrics.inputTokens,
            ctx.tokenMetrics.outputTokens,
            ctx.tokenMetrics.cacheCreationTokens,
            ctx.tokenMetrics.cacheReadTokens,
            pricing
          );
        }

        // 取两者较大值，确保压缩上下文后费用不会回退
        if (costFromStatusLine != null || costFromJsonl != null) {
          cost = Math.max(costFromStatusLine ?? 0, costFromJsonl ?? 0);
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
