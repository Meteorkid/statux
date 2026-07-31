/**
 * 模型定价表
 *
 * 数据源优先级：
 *   1. 精选覆盖表（PRICING_TABLE）— 手动维护，确保关键模型准确
 *   2. LiteLLM 远程数据（2200+ 模型）— 自动每日刷新
 *
 * 单位：USD per million tokens (MTok)
 */

import {
  initPricingEngine,
  ensurePricingLoaded,
  lookupLiteLLMPricing,
  getLiteLLMModelCount,
  type ModelPricing,
} from "./litellm-fetcher";

export type { ModelPricing };

// ─── 精选覆盖表（按优先级排序，更精确的模式放前面） ──────────────
// 匹配规则：模型 ID 转小写后依次匹配，命中即返回

const PRICING_TABLE: { pattern: RegExp; pricing: ModelPricing; name: string }[] = [
  // ── Anthropic Claude 系列（来源：docs.anthropic.com/en/docs/about-claude/pricing） ──
  // Fable 5 / Mythos 5: 最强模型
  { pattern: /fable-5|mythos-5/, name: "Claude Fable 5",
    pricing: { input: 10, output: 50, cacheWrite5m: 12.50, cacheWrite1h: 20, cacheRead: 1.00 } },
  // Opus 系列: $5/$25（Opus 4.5 ~ 5 统一价）
  { pattern: /opus-5/, name: "Claude Opus 5",
    pricing: { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.50 } },
  { pattern: /opus-4-8/, name: "Claude Opus 4.8",
    pricing: { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.50 } },
  { pattern: /opus-4-7/, name: "Claude Opus 4.7",
    pricing: { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.50 } },
  { pattern: /opus-4-6/, name: "Claude Opus 4.6",
    pricing: { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.50 } },
  { pattern: /opus-4-5/, name: "Claude Opus 4.5",
    pricing: { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.50 } },
  { pattern: /opus-4-1/, name: "Claude Opus 4.1",
    pricing: { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.50 } },
  { pattern: /opus-4(?:-0)?(?:-\d{8})?$/, name: "Claude Opus 4",
    pricing: { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.50 } },
  { pattern: /opus-3|3-opus/, name: "Claude Opus 3",
    pricing: { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.50 } },
  // Sonnet 系列: $3/$15（Sonnet 5 限时优惠 $2/$10 至 2026-08-31）
  { pattern: /sonnet-5/, name: "Claude Sonnet 5",
    pricing: { input: 2, output: 10, cacheWrite5m: 2.50, cacheWrite1h: 4, cacheRead: 0.20 } },
  { pattern: /sonnet-4-6/, name: "Claude Sonnet 4.6",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  { pattern: /sonnet-4-5/, name: "Claude Sonnet 4.5",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  { pattern: /sonnet-4(?:-0)?(?:-\d{8})?$/, name: "Claude Sonnet 4",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  { pattern: /sonnet-3-7|3-7-sonnet/, name: "Claude Sonnet 3.7",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  { pattern: /3-5-sonnet|sonnet-3-5/, name: "Claude Sonnet 3.5",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  { pattern: /3-sonnet|sonnet-3(?!-)/, name: "Claude Sonnet 3",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  // Haiku 系列
  { pattern: /haiku-4-5/, name: "Claude Haiku 4.5",
    pricing: { input: 1, output: 5, cacheWrite5m: 1.25, cacheWrite1h: 2, cacheRead: 0.10 } },
  { pattern: /3-5-haiku|haiku-3-5/, name: "Claude Haiku 3.5",
    pricing: { input: 0.80, output: 4, cacheWrite5m: 1, cacheWrite1h: 1.6, cacheRead: 0.08 } },
  { pattern: /3-haiku|haiku-3(?!-)/, name: "Claude Haiku 3",
    pricing: { input: 0.25, output: 1.25, cacheWrite5m: 0.30, cacheWrite1h: 0.50, cacheRead: 0.03 } },

  // ── DeepSeek 系列（来源：api-docs.deepseek.com/quick_start/pricing） ──
  // V4 系列: cache hit 价格大幅低于 miss
  { pattern: /deepseek.*v4.*flash|deepseek-v4-flash/, name: "DeepSeek V4 Flash",
    pricing: { input: 0.14, output: 0.28, cacheWrite5m: 0.14, cacheWrite1h: 0.14, cacheRead: 0.0028 } },
  { pattern: /deepseek.*v4.*pro|deepseek-v4-pro/, name: "DeepSeek V4 Pro",
    pricing: { input: 0.435, output: 0.87, cacheWrite5m: 0.435, cacheWrite1h: 0.435, cacheRead: 0.003625 } },
  { pattern: /deepseek.*v4|deepseek-v4/, name: "DeepSeek V4",
    pricing: { input: 0.435, output: 0.87, cacheWrite5m: 0.435, cacheWrite1h: 0.435, cacheRead: 0.003625 } },
  { pattern: /deepseek.*v3\.2.*speciale|v3\.2-speciale/, name: "DeepSeek V3.2 Speciale",
    pricing: { input: 0.40, output: 1.20, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },
  { pattern: /deepseek.*v3\.2|deepseek-v3\.2/, name: "DeepSeek V3.2",
    pricing: { input: 0.252, output: 0.378, cacheWrite5m: 0.252, cacheWrite1h: 0.252, cacheRead: 0.0252 } },
  { pattern: /deepseek.*v3\.1.*terminus|v3\.1-terminus/, name: "DeepSeek V3.1 Terminus",
    pricing: { input: 0.27, output: 0.95, cacheWrite5m: 0.27, cacheWrite1h: 0.27, cacheRead: 0.027 } },
  { pattern: /deepseek.*v3\.1|deepseek-v3\.1/, name: "DeepSeek V3.1",
    pricing: { input: 0.15, output: 0.75, cacheWrite5m: 0.15, cacheWrite1h: 0.15, cacheRead: 0.015 } },
  { pattern: /deepseek.*v3.*0324|deepseek-chat-v3-0324/, name: "DeepSeek V3 0324",
    pricing: { input: 0.20, output: 0.77, cacheWrite5m: 0.20, cacheWrite1h: 0.20, cacheRead: 0.02 } },
  { pattern: /deepseek.*v3|deepseek-chat|deepseek-v3/, name: "DeepSeek V3",
    pricing: { input: 0.32, output: 0.89, cacheWrite5m: 0.32, cacheWrite1h: 0.32, cacheRead: 0.032 } },
  { pattern: /deepseek.*r1.*0528|r1-0528/, name: "DeepSeek R1 0528",
    pricing: { input: 0.50, output: 2.15, cacheWrite5m: 0.50, cacheWrite1h: 0.50, cacheRead: 0.05 } },
  { pattern: /deepseek.*r1|deepseek-reasoner/, name: "DeepSeek R1",
    pricing: { input: 0.70, output: 2.50, cacheWrite5m: 0.70, cacheWrite1h: 0.70, cacheRead: 0.07 } },
  { pattern: /deepseek-coder/, name: "DeepSeek Coder",
    pricing: { input: 0.27, output: 1.10, cacheWrite5m: 0.27, cacheWrite1h: 0.27, cacheRead: 0.027 } },
  { pattern: /deepseek/, name: "DeepSeek",
    pricing: { input: 0.32, output: 0.89, cacheWrite5m: 0.32, cacheWrite1h: 0.32, cacheRead: 0.032 } },

  // ── Kimi 系列（来源：platform.kimi.com/docs/pricing/chat） ──
  // K3 为旗舰模型，1M 上下文
  { pattern: /kimi.*k3|kimi-k3/, name: "Kimi K3",
    pricing: { input: 0.74, output: 3.49, cacheWrite5m: 0.74, cacheWrite1h: 0.74, cacheRead: 0.074 } },
  { pattern: /kimi.*k2\.7|kimi-k2\.7/, name: "Kimi K2.7 Code",
    pricing: { input: 0.57, output: 2.30, cacheWrite5m: 0.57, cacheWrite1h: 0.57, cacheRead: 0.057 } },
  { pattern: /kimi.*k2\.6|kimi-k2\.6/, name: "Kimi K2.6",
    pricing: { input: 0.74, output: 3.49, cacheWrite5m: 0.74, cacheWrite1h: 0.74, cacheRead: 0.074 } },
  { pattern: /kimi.*k2.*think|k2-thinking/, name: "Kimi K2 Thinking",
    pricing: { input: 0.60, output: 2.50, cacheWrite5m: 0.60, cacheWrite1h: 0.60, cacheRead: 0.06 } },
  { pattern: /kimi.*k2.*instruct|k2-instruct/, name: "Kimi K2 Instruct",
    pricing: { input: 0.57, output: 2.30, cacheWrite5m: 0.57, cacheWrite1h: 0.57, cacheRead: 0.057 } },
  { pattern: /kimi.*k2|kimi-k2/, name: "Kimi K2",
    pricing: { input: 0.40, output: 2.00, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },
  { pattern: /kimi.*k1\.?5|k1-5/, name: "Kimi K1.5",
    pricing: { input: 0.50, output: 1.50, cacheWrite5m: 0.50, cacheWrite1h: 0.50, cacheRead: 0.05 } },
  { pattern: /kimi/, name: "Kimi",
    pricing: { input: 0.74, output: 3.49, cacheWrite5m: 0.74, cacheWrite1h: 0.74, cacheRead: 0.074 } },
  { pattern: /moonshot/, name: "Moonshot",
    pricing: { input: 0.74, output: 3.49, cacheWrite5m: 0.74, cacheWrite1h: 0.74, cacheRead: 0.074 } },

  // ── MiMo 系列 ─────────────────────────────────────────────
  { pattern: /mimo.*v2\.5.*pro|mimo-v2\.5-pro/, name: "MiMo V2.5 Pro",
    pricing: { input: 1, output: 3, cacheWrite5m: 1, cacheWrite1h: 1, cacheRead: 0.10 } },
  { pattern: /mimo.*v2\.5(?!.*pro)|mimo-v2\.5$/, name: "MiMo V2.5",
    pricing: { input: 0.40, output: 2, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },
  { pattern: /mimo.*v2.*pro(?!.*flash)|mimo-v2-pro/, name: "MiMo V2 Pro",
    pricing: { input: 1, output: 3, cacheWrite5m: 1, cacheWrite1h: 1, cacheRead: 0.10 } },
  { pattern: /mimo.*v2.*flash|mimo-v2-flash/, name: "MiMo V2 Flash",
    pricing: { input: 0.09, output: 0.29, cacheWrite5m: 0.09, cacheWrite1h: 0.09, cacheRead: 0.009 } },
  { pattern: /mimo.*v2.*omni|mimo-v2-omni/, name: "MiMo V2 Omni",
    pricing: { input: 0.40, output: 2, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },
  { pattern: /mimo.*v2|mimo-v2/, name: "MiMo V2",
    pricing: { input: 0.40, output: 2, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },
  { pattern: /mimo/, name: "MiMo",
    pricing: { input: 0.15, output: 0.60, cacheWrite5m: 0.15, cacheWrite1h: 0.15, cacheRead: 0.015 } },

  // ── 豆包 系列 ─────────────────────────────────────────────
  { pattern: /doubao.*pro|doubao-pro/, name: "Doubao Pro",
    pricing: { input: 0.40, output: 1.20, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },
  { pattern: /doubao.*lite|doubao-lite/, name: "Doubao Lite",
    pricing: { input: 0.10, output: 0.30, cacheWrite5m: 0.10, cacheWrite1h: 0.10, cacheRead: 0.01 } },
  { pattern: /doubao|豆包/, name: "Doubao",
    pricing: { input: 0.20, output: 0.60, cacheWrite5m: 0.20, cacheWrite1h: 0.20, cacheRead: 0.02 } },

  // ── OpenAI GPT 系列（来源：platform.openai.com/docs/pricing） ──
  // GPT-5.6 系列（最新）
  { pattern: /gpt-5\.6.*sol|gpt-5-6.*sol/, name: "GPT-5.6 Sol",
    pricing: { input: 5, output: 30, cacheWrite5m: 6.25, cacheWrite1h: 6.25, cacheRead: 0.50 } },
  { pattern: /gpt-5\.6.*terra|gpt-5-6.*terra/, name: "GPT-5.6 Terra",
    pricing: { input: 2, output: 12, cacheWrite5m: 2.50, cacheWrite1h: 2.50, cacheRead: 0.20 } },
  { pattern: /gpt-5\.6.*luna|gpt-5-6.*luna/, name: "GPT-5.6 Luna",
    pricing: { input: 0.20, output: 1.20, cacheWrite5m: 0.25, cacheWrite1h: 0.25, cacheRead: 0.02 } },
  { pattern: /gpt-5\.6|gpt-5-6/, name: "GPT-5.6",
    pricing: { input: 2, output: 12, cacheWrite5m: 2.50, cacheWrite1h: 2.50, cacheRead: 0.20 } },
  // GPT-5.5 系列
  { pattern: /gpt-5\.5.*pro|gpt-5-5.*pro/, name: "GPT-5.5 Pro",
    pricing: { input: 30, output: 180, cacheWrite5m: 30, cacheWrite1h: 30, cacheRead: 3 } },
  { pattern: /gpt-5\.5|gpt-5-5/, name: "GPT-5.5",
    pricing: { input: 5, output: 30, cacheWrite5m: 5, cacheWrite1h: 5, cacheRead: 0.50 } },
  // GPT-5.4 系列
  { pattern: /gpt-5\.4.*pro|gpt-5-4.*pro/, name: "GPT-5.4 Pro",
    pricing: { input: 30, output: 180, cacheWrite5m: 30, cacheWrite1h: 30, cacheRead: 3 } },
  { pattern: /gpt-5\.4.*mini|gpt-5-4.*mini/, name: "GPT-5.4 Mini",
    pricing: { input: 0.75, output: 4.50, cacheWrite5m: 0.75, cacheWrite1h: 0.75, cacheRead: 0.075 } },
  { pattern: /gpt-5\.4.*nano|gpt-5-4.*nano/, name: "GPT-5.4 Nano",
    pricing: { input: 0.20, output: 1.25, cacheWrite5m: 0.20, cacheWrite1h: 0.20, cacheRead: 0.02 } },
  { pattern: /gpt-5\.4|gpt-5-4/, name: "GPT-5.4",
    pricing: { input: 2.50, output: 15, cacheWrite5m: 2.50, cacheWrite1h: 2.50, cacheRead: 0.25 } },
  // GPT-5 系列
  { pattern: /gpt-5\.3.*codex|gpt-5-3.*codex/, name: "GPT-5.3 Codex",
    pricing: { input: 1.75, output: 14, cacheWrite5m: 1.75, cacheWrite1h: 1.75, cacheRead: 0.175 } },
  { pattern: /gpt-5[.\-]?mini/, name: "GPT-5 Mini",
    pricing: { input: 0.25, output: 2, cacheWrite5m: 0.25, cacheWrite1h: 0.25, cacheRead: 0.025 } },
  { pattern: /gpt-5[.\-]?nano/, name: "GPT-5 Nano",
    pricing: { input: 0.05, output: 0.40, cacheWrite5m: 0.05, cacheWrite1h: 0.05, cacheRead: 0.005 } },
  { pattern: /gpt-5(?![a-z0-9.\-])|^gpt-5$/i, name: "GPT-5",
    pricing: { input: 1.25, output: 10, cacheWrite5m: 1.25, cacheWrite1h: 1.25, cacheRead: 0.125 } },
  // GPT-4.1 系列
  { pattern: /gpt-4\.1(?!.*mini)(?!.*nano)/, name: "GPT-4.1",
    pricing: { input: 2, output: 8, cacheWrite5m: 2, cacheWrite1h: 2, cacheRead: 0.20 } },
  { pattern: /gpt-4\.1.*mini/, name: "GPT-4.1 Mini",
    pricing: { input: 0.40, output: 1.60, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },
  { pattern: /gpt-4\.1.*nano/, name: "GPT-4.1 Nano",
    pricing: { input: 0.10, output: 0.40, cacheWrite5m: 0.10, cacheWrite1h: 0.10, cacheRead: 0.01 } },
  // GPT-4o 系列
  { pattern: /gpt-4o(?!.*mini)/, name: "GPT-4o",
    pricing: { input: 2.50, output: 10, cacheWrite5m: 2.50, cacheWrite1h: 2.50, cacheRead: 0.25 } },
  { pattern: /gpt-4o.*mini/, name: "GPT-4o Mini",
    pricing: { input: 0.15, output: 0.60, cacheWrite5m: 0.15, cacheWrite1h: 0.15, cacheRead: 0.015 } },
  // Codex 默认
  { pattern: /codex-default|chat-latest/, name: "Codex Default",
    pricing: { input: 5, output: 30, cacheWrite5m: 5, cacheWrite1h: 5, cacheRead: 0.50 } },
  // GPT 兜底
  { pattern: /gpt/, name: "GPT",
    pricing: { input: 1.25, output: 10, cacheWrite5m: 1.25, cacheWrite1h: 1.25, cacheRead: 0.125 } },
];

// ─── 公开 API ────────────────────────────────────────────────

/**
 * 初始化定价引擎（异步）。
 * 应在程序启动时调用一次，首次渲染前完成。
 * 精选表始终可用，LiteLLM 数据加载后自动增强。
 */
export { initPricingEngine };

/**
 * 触发后台加载（不阻塞）。
 * 用于 statusLine 模式等无法等待 init 的场景。
 */
export { ensurePricingLoaded };

/**
 * 根据模型 ID 匹配定价。
 *
 * 优先级：精选覆盖表 → LiteLLM 精确匹配 → LiteLLM 模糊匹配
 */
export function getModelPricing(modelId: string): (ModelPricing & { name: string }) | null {
  const lower = modelId.toLowerCase();

  // 1. 精选覆盖表（最高优先级，确保关键模型准确）
  for (const { pattern, pricing, name } of PRICING_TABLE) {
    if (pattern.test(lower)) return { ...pricing, name };
  }

  // 2. LiteLLM 数据（2200+ 模型）
  return lookupLiteLLMPricing(modelId);
}

/** 已知模型模式列表 */
export const KNOWN_MODEL_PATTERNS = PRICING_TABLE.map((p) => ({
  pattern: p.pattern.source,
  name: p.name,
}));

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
