/**
 * 模型定价表
 * 来源：
 *   Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
 *   DeepSeek:  https://platform.deepseek.com/api-docs/pricing
 *   Kimi:      https://platform.moonshot.cn/docs/pricing
 *   MiMo:      https://open-platform.mihoyo.com
 *   豆包:      https://www.volcengine.com/docs/82379
 * 单位：USD per million tokens (MTok)
 * 最后更新：2026-05-04
 */

export interface ModelPricing {
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
}

// 定价表 — 按优先级排序，更精确的模式放前面
// 匹配规则：模型 ID 转小写后依次匹配，命中即返回
const PRICING_TABLE: { pattern: RegExp; pricing: ModelPricing; name: string }[] = [
  // ── Anthropic Claude 系列 ──────────────────────────────────
  // Opus 4.7 — 当前旗舰 ($5/$25)
  { pattern: /opus-4-7/, name: "Claude Opus 4.7",
    pricing: { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.50 } },
  // Opus 4.6 — 遗留 ($5/$25)
  { pattern: /opus-4-6/, name: "Claude Opus 4.6",
    pricing: { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.50 } },
  // Opus 4.5 — 遗留 ($5/$25)
  { pattern: /opus-4-5/, name: "Claude Opus 4.5",
    pricing: { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.50 } },
  // Opus 4.1 — 遗留 ($15/$75)
  { pattern: /opus-4-1/, name: "Claude Opus 4.1",
    pricing: { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.50 } },
  // Opus 4 (deprecated) — claude-opus-4-20250514 / claude-opus-4-0 ($15/$75)
  { pattern: /opus-4(?:-0)?(?:-\d{8})?$/, name: "Claude Opus 4",
    pricing: { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.50 } },
  // Opus 3 — claude-3-opus-20240229 / claude-3-opus-latest ($15/$75)
  { pattern: /opus-3|3-opus/, name: "Claude Opus 3",
    pricing: { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.50 } },

  // Sonnet 4.6 — 当前 ($3/$15)
  { pattern: /sonnet-4-6/, name: "Claude Sonnet 4.6",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  // Sonnet 4.5 — 遗留 ($3/$15)
  { pattern: /sonnet-4-5/, name: "Claude Sonnet 4.5",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  // Sonnet 4 (deprecated) — claude-sonnet-4-20250514 / claude-sonnet-4-0 ($3/$15)
  { pattern: /sonnet-4(?:-0)?(?:-\d{8})?$/, name: "Claude Sonnet 4",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  // Sonnet 3.7 (deprecated) ($3/$15)
  { pattern: /sonnet-3-7|3-7-sonnet/, name: "Claude Sonnet 3.7",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  // Sonnet 3.5 ($3/$15)
  { pattern: /3-5-sonnet|sonnet-3-5/, name: "Claude Sonnet 3.5",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  // Sonnet 3 ($3/$15)
  { pattern: /3-sonnet|sonnet-3(?!-)/, name: "Claude Sonnet 3",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },

  // Haiku 4.5 — 当前 ($1/$5)
  { pattern: /haiku-4-5/, name: "Claude Haiku 4.5",
    pricing: { input: 1, output: 5, cacheWrite5m: 1.25, cacheWrite1h: 2, cacheRead: 0.10 } },
  // Haiku 3.5 ($0.80/$4)
  { pattern: /3-5-haiku|haiku-3-5/, name: "Claude Haiku 3.5",
    pricing: { input: 0.80, output: 4, cacheWrite5m: 1, cacheWrite1h: 1.6, cacheRead: 0.08 } },
  // Haiku 3 ($0.25/$1.25)
  { pattern: /3-haiku|haiku-3(?!-)/, name: "Claude Haiku 3",
    pricing: { input: 0.25, output: 1.25, cacheWrite5m: 0.30, cacheWrite1h: 0.50, cacheRead: 0.03 } },

  // ── DeepSeek 系列 ─────────────────────────────────────────
  // DeepSeek-V3 / deepseek-chat ($0.27/$1.10, cache hit $0.07)
  { pattern: /deepseek-v3|deepseek-chat/, name: "DeepSeek V3",
    pricing: { input: 0.27, output: 1.10, cacheWrite5m: 0.27, cacheWrite1h: 0.27, cacheRead: 0.07 } },
  // DeepSeek-R1 / deepseek-reasoner ($0.55/$2.19, cache hit $0.14)
  { pattern: /deepseek-r1|deepseek-reasoner/, name: "DeepSeek R1",
    pricing: { input: 0.55, output: 2.19, cacheWrite5m: 0.55, cacheWrite1h: 0.55, cacheRead: 0.14 } },
  // DeepSeek-Coder / deepseek-coder ($0.27/$1.10)
  { pattern: /deepseek-coder/, name: "DeepSeek Coder",
    pricing: { input: 0.27, output: 1.10, cacheWrite5m: 0.27, cacheWrite1h: 0.27, cacheRead: 0.07 } },
  // DeepSeek 通用匹配（兜底）
  { pattern: /deepseek/, name: "DeepSeek",
    pricing: { input: 0.27, output: 1.10, cacheWrite5m: 0.27, cacheWrite1h: 0.27, cacheRead: 0.07 } },

  // ── Kimi (月之暗面 Moonshot AI) 系列 ──────────────────────
  // Kimi K2 — MoE 1T 参数 (32B 激活) (~$0.60/$2.00)
  { pattern: /kimi-k2|k2/, name: "Kimi K2",
    pricing: { input: 0.60, output: 2.00, cacheWrite5m: 0.60, cacheWrite1h: 0.60, cacheRead: 0.06 } },
  // Kimi K1.5 (~$0.50/$1.50)
  { pattern: /kimi-k1|k1-5|k1\.5/, name: "Kimi K1.5",
    pricing: { input: 0.50, output: 1.50, cacheWrite5m: 0.50, cacheWrite1h: 0.50, cacheRead: 0.05 } },
  // Kimi 通用（kimi-latest 等）(~$0.40/$1.20)
  { pattern: /kimi/, name: "Kimi",
    pricing: { input: 0.40, output: 1.20, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },
  // Moonshot 通用
  { pattern: /moonshot/, name: "Moonshot",
    pricing: { input: 0.40, output: 1.20, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },

  // ── MiMo (小米) 系列 ──────────────────────────────────────
  // MiMo-V2 (~$0.20/$0.80)
  { pattern: /mimo-v2|mimo_v2/, name: "MiMo V2",
    pricing: { input: 0.20, output: 0.80, cacheWrite5m: 0.20, cacheWrite1h: 0.20, cacheRead: 0.02 } },
  // MiMo 通用（mimo-7b 等）(~$0.15/$0.60)
  { pattern: /mimo/, name: "MiMo",
    pricing: { input: 0.15, output: 0.60, cacheWrite5m: 0.15, cacheWrite1h: 0.15, cacheRead: 0.015 } },

  // ── 豆包 (ByteDance/字节跳动) 系列 ────────────────────────
  // Doubao-pro (~$0.40/$1.20)
  { pattern: /doubao-pro|doubao_pro/, name: "Doubao Pro",
    pricing: { input: 0.40, output: 1.20, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },
  // Doubao-lite (~$0.10/$0.30)
  { pattern: /doubao-lite|doubao_lite/, name: "Doubao Lite",
    pricing: { input: 0.10, output: 0.30, cacheWrite5m: 0.10, cacheWrite1h: 0.10, cacheRead: 0.01 } },
  // Doubao 通用
  { pattern: /doubao/, name: "Doubao",
    pricing: { input: 0.20, output: 0.60, cacheWrite5m: 0.20, cacheWrite1h: 0.20, cacheRead: 0.02 } },
  // 豆包中文名
  { pattern: /豆包/, name: "Doubao",
    pricing: { input: 0.20, output: 0.60, cacheWrite5m: 0.20, cacheWrite1h: 0.20, cacheRead: 0.02 } },
];

/** 根据模型 ID 匹配定价 */
export function getModelPricing(modelId: string): (ModelPricing & { name: string }) | null {
  const lower = modelId.toLowerCase();
  for (const { pattern, pricing, name } of PRICING_TABLE) {
    if (pattern.test(lower)) return { ...pricing, name };
  }
  return null;
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
