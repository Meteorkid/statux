/**
 * Claude 模型定价表
 * 来源：https://platform.claude.com/docs/en/about-claude/pricing
 * 单位：USD per million tokens (MTok)
 */

export interface ModelPricing {
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
}

// 定价表 — key 为模型 ID 模糊匹配模式
const PRICING_TABLE: { pattern: RegExp; pricing: ModelPricing }[] = [
  // Opus 系列
  { pattern: /opus-4-7/, pricing: { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.50 } },
  { pattern: /opus-4-6/, pricing: { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.50 } },
  { pattern: /opus-4-5/, pricing: { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.50 } },
  { pattern: /opus-4-1/, pricing: { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.50 } },
  { pattern: /opus-4/,   pricing: { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.50 } },
  { pattern: /opus-3/,   pricing: { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.50 } },

  // Sonnet 系列
  { pattern: /sonnet-4-6/, pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  { pattern: /sonnet-4-5/, pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  { pattern: /sonnet-4/,   pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  { pattern: /sonnet-3-7/, pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },

  // Haiku 系列
  { pattern: /haiku-4-5/, pricing: { input: 1, output: 5, cacheWrite5m: 1.25, cacheWrite1h: 2, cacheRead: 0.10 } },
  { pattern: /haiku-3-5/, pricing: { input: 0.80, output: 4, cacheWrite5m: 1, cacheWrite1h: 1.6, cacheRead: 0.08 } },
  { pattern: /haiku-3/,   pricing: { input: 0.25, output: 1.25, cacheWrite5m: 0.30, cacheWrite1h: 0.50, cacheRead: 0.03 } },
];

/** 根据模型 ID 匹配定价 */
export function getModelPricing(modelId: string): ModelPricing | null {
  const lower = modelId.toLowerCase();
  for (const { pattern, pricing } of PRICING_TABLE) {
    if (pattern.test(lower)) return pricing;
  }
  return null;
}

/** 已知模型模式列表（用于模糊匹配显示） */
export const KNOWN_MODEL_PATTERNS = PRICING_TABLE.map((p) => p.pattern.source);

/** 从 token 指标计算费用 */
export function computeCostFromTokens(
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number,
  cacheReadTokens: number,
  pricing: ModelPricing
): number {
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const cacheWriteCost = (cacheCreationTokens / 1_000_000) * pricing.cacheWrite5m;
  const cacheReadCost = (cacheReadTokens / 1_000_000) * pricing.cacheRead;
  return inputCost + outputCost + cacheWriteCost + cacheReadCost;
}
