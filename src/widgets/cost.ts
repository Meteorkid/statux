import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { getModelPricing, computeCostFromTokens } from "../data/model-pricing";

function getModelId(ctx: RenderContext): string {
  const model = ctx.data.model;
  if (typeof model === "string") return model;
  return model?.id || model?.display_name || "";
}

/**
 * 计算会话费用（共享逻辑）
 * 同时参考 statusLine 与 JSONL，取较大值确保压缩上下文后不丢失。
 * 返回 { cost, isEstimated }，cost 为 null 表示无法计算。
 */
export function computeSessionCost(ctx: RenderContext): { cost: number | null; isEstimated: boolean } {
  const modelId = getModelId(ctx);
  if (!modelId) {
    return { cost: ctx.data.cost?.total_cost_usd ?? null, isEstimated: false };
  }

  const pricing = getModelPricing(modelId);
  if (!pricing) {
    return { cost: ctx.data.cost?.total_cost_usd ?? null, isEstimated: false };
  }

  let costFromStatusLine: number | null = null;
  let costFromJsonl: number | null = null;

  // 数据源 1：statusLine context_window
  const cw = ctx.data.context_window;
  const totalIn = cw?.total_input_tokens;
  const totalOut = cw?.total_output_tokens;
  if (totalIn != null || totalOut != null) {
    costFromStatusLine = computeCostFromTokens(totalIn ?? 0, totalOut ?? 0, 0, 0, pricing);
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

  if (costFromStatusLine != null || costFromJsonl != null) {
    return { cost: Math.max(costFromStatusLine ?? 0, costFromJsonl ?? 0), isEstimated: true };
  }

  return { cost: ctx.data.cost?.total_cost_usd ?? null, isEstimated: false };
}

export const CostWidget: Widget = {
  type: "cost",
  category: "session",
  displayName: "Cost",
  description: "会话累计费用 (同时参考 statusLine 与 JSONL，取较大值确保压缩上下文后不丢失)",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const { cost, isEstimated } = computeSessionCost(ctx);
    if (cost == null) return null;

    const formatted = cost < 0.01 ? "<$0.01" : `$${cost.toFixed(2)}`;
    const display = isEstimated ? `~${formatted}` : formatted;
    return colorize(display, item.color || this.defaultColor, item.bold);
  },
};
