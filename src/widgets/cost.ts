import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { getModelPricing, computeCostFromTokens } from "../data/model-pricing";

function getModelId(ctx: RenderContext): string {
  const model = ctx.data.model;
  if (typeof model === "string") return model;
  return model?.id || model?.display_name || "";
}

/** 从 statusLine 的 context_window.current_usage 获取 token 数据 */
function getStatusLineTokens(ctx: RenderContext) {
  const usage = ctx.data.context_window?.current_usage;
  if (!usage || typeof usage === "number") return null;
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
  };
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
    let pricingName = "";

    const modelId = getModelId(ctx);

    if (modelId) {
      const pricing = getModelPricing(modelId);
      if (pricing) {
        pricingName = pricing.name;

        // 优先：statusLine 的 current_usage（实时、权威）
        // 回退：JSONL 解析的 tokenMetrics
        const tokens = getStatusLineTokens(ctx) ?? ctx.tokenMetrics;
        if (tokens) {
          cost = computeCostFromTokens(
            tokens.inputTokens,
            tokens.outputTokens,
            tokens.cacheCreationTokens,
            tokens.cacheReadTokens,
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
    // 本地计算时添加 ~ 前缀表示估算值
    const display = isEstimated ? `~${formatted}` : formatted;
    return colorize(display, item.color || this.defaultColor, item.bold);
  },
};
