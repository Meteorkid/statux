/**
 * 模型定价表
 * 来源：
 *   Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
 *   OpenRouter: https://openrouter.ai/models (2026-05-04 实时数据)
 *   DeepSeek:  https://platform.deepseek.com
 *   Kimi:      https://platform.moonshot.cn
 *   MiMo:      https://open-platform.mihoyo.com
 *   豆包:      https://www.volcengine.com
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
  // Opus 4 (deprecated) ($15/$75)
  { pattern: /opus-4(?:-0)?(?:-\d{8})?$/, name: "Claude Opus 4",
    pricing: { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.50 } },
  // Opus 3 ($15/$75)
  { pattern: /opus-3|3-opus/, name: "Claude Opus 3",
    pricing: { input: 15, output: 75, cacheWrite5m: 18.75, cacheWrite1h: 30, cacheRead: 1.50 } },

  // Sonnet 4.6 ($3/$15)
  { pattern: /sonnet-4-6/, name: "Claude Sonnet 4.6",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  // Sonnet 4.5 ($3/$15)
  { pattern: /sonnet-4-5/, name: "Claude Sonnet 4.5",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  // Sonnet 4 (deprecated) ($3/$15)
  { pattern: /sonnet-4(?:-0)?(?:-\d{8})?$/, name: "Claude Sonnet 4",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  // Sonnet 3.7 ($3/$15)
  { pattern: /sonnet-3-7|3-7-sonnet/, name: "Claude Sonnet 3.7",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  // Sonnet 3.5 ($3/$15)
  { pattern: /3-5-sonnet|sonnet-3-5/, name: "Claude Sonnet 3.5",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },
  // Sonnet 3 ($3/$15)
  { pattern: /3-sonnet|sonnet-3(?!-)/, name: "Claude Sonnet 3",
    pricing: { input: 3, output: 15, cacheWrite5m: 3.75, cacheWrite1h: 6, cacheRead: 0.30 } },

  // Haiku 4.5 ($1/$5)
  { pattern: /haiku-4-5/, name: "Claude Haiku 4.5",
    pricing: { input: 1, output: 5, cacheWrite5m: 1.25, cacheWrite1h: 2, cacheRead: 0.10 } },
  // Haiku 3.5 ($0.80/$4)
  { pattern: /3-5-haiku|haiku-3-5/, name: "Claude Haiku 3.5",
    pricing: { input: 0.80, output: 4, cacheWrite5m: 1, cacheWrite1h: 1.6, cacheRead: 0.08 } },
  // Haiku 3 ($0.25/$1.25)
  { pattern: /3-haiku|haiku-3(?!-)/, name: "Claude Haiku 3",
    pricing: { input: 0.25, output: 1.25, cacheWrite5m: 0.30, cacheWrite1h: 0.50, cacheRead: 0.03 } },

  // ── DeepSeek 系列 (OpenRouter 实时价格 2026-05-04) ────────
  // DeepSeek V4 Flash — 284B/13B active, 1M ctx ($0.14/$0.28)
  { pattern: /deepseek.*v4.*flash|deepseek-v4-flash/, name: "DeepSeek V4 Flash",
    pricing: { input: 0.14, output: 0.28, cacheWrite5m: 0.14, cacheWrite1h: 0.14, cacheRead: 0.014 } },
  // DeepSeek V4 Pro — 1.6T/49B active, 1M ctx ($0.435/$0.87)
  { pattern: /deepseek.*v4.*pro|deepseek-v4-pro/, name: "DeepSeek V4 Pro",
    pricing: { input: 0.435, output: 0.87, cacheWrite5m: 0.435, cacheWrite1h: 0.435, cacheRead: 0.0435 } },
  // DeepSeek V4 通用 (兜底到 Pro)
  { pattern: /deepseek.*v4|deepseek-v4/, name: "DeepSeek V4",
    pricing: { input: 0.435, output: 0.87, cacheWrite5m: 0.435, cacheWrite1h: 0.435, cacheRead: 0.0435 } },
  // DeepSeek V3.2 Speciale — 高推理变体 ($0.40/$1.20)
  { pattern: /deepseek.*v3\.2.*speciale|v3\.2-speciale/, name: "DeepSeek V3.2 Speciale",
    pricing: { input: 0.40, output: 1.20, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },
  // DeepSeek V3.2 ($0.252/$0.378)
  { pattern: /deepseek.*v3\.2|deepseek-v3\.2/, name: "DeepSeek V3.2",
    pricing: { input: 0.252, output: 0.378, cacheWrite5m: 0.252, cacheWrite1h: 0.252, cacheRead: 0.0252 } },
  // DeepSeek V3.1 Terminus ($0.27/$0.95)
  { pattern: /deepseek.*v3\.1.*terminus|v3\.1-terminus/, name: "DeepSeek V3.1 Terminus",
    pricing: { input: 0.27, output: 0.95, cacheWrite5m: 0.27, cacheWrite1h: 0.27, cacheRead: 0.027 } },
  // DeepSeek V3.1 ($0.15/$0.75)
  { pattern: /deepseek.*v3\.1|deepseek-v3\.1/, name: "DeepSeek V3.1",
    pricing: { input: 0.15, output: 0.75, cacheWrite5m: 0.15, cacheWrite1h: 0.15, cacheRead: 0.015 } },
  // DeepSeek V3 0324 ($0.20/$0.77)
  { pattern: /deepseek.*v3.*0324|deepseek-chat-v3-0324/, name: "DeepSeek V3 0324",
    pricing: { input: 0.20, output: 0.77, cacheWrite5m: 0.20, cacheWrite1h: 0.20, cacheRead: 0.02 } },
  // DeepSeek V3 / deepseek-chat ($0.32/$0.89)
  { pattern: /deepseek.*v3|deepseek-chat|deepseek-v3/, name: "DeepSeek V3",
    pricing: { input: 0.32, output: 0.89, cacheWrite5m: 0.32, cacheWrite1h: 0.32, cacheRead: 0.032 } },
  // DeepSeek R1 0528 ($0.50/$2.15)
  { pattern: /deepseek.*r1.*0528|r1-0528/, name: "DeepSeek R1 0528",
    pricing: { input: 0.50, output: 2.15, cacheWrite5m: 0.50, cacheWrite1h: 0.50, cacheRead: 0.05 } },
  // DeepSeek R1 / deepseek-reasoner ($0.70/$2.50)
  { pattern: /deepseek.*r1|deepseek-reasoner/, name: "DeepSeek R1",
    pricing: { input: 0.70, output: 2.50, cacheWrite5m: 0.70, cacheWrite1h: 0.70, cacheRead: 0.07 } },
  // DeepSeek Coder ($0.27/$1.10)
  { pattern: /deepseek-coder/, name: "DeepSeek Coder",
    pricing: { input: 0.27, output: 1.10, cacheWrite5m: 0.27, cacheWrite1h: 0.27, cacheRead: 0.027 } },
  // DeepSeek 通用兜底
  { pattern: /deepseek/, name: "DeepSeek",
    pricing: { input: 0.32, output: 0.89, cacheWrite5m: 0.32, cacheWrite1h: 0.32, cacheRead: 0.032 } },

  // ── Kimi (月之暗面 Moonshot AI) 系列 (OpenRouter 2026-05-04) ──
  // Kimi K2.6 — 多模态, 长程编码, 多智能体 ($0.74/$3.49)
  { pattern: /kimi.*k2\.6|kimi-k2\.6/, name: "Kimi K2.6",
    pricing: { input: 0.74, output: 3.49, cacheWrite5m: 0.74, cacheWrite1h: 0.74, cacheRead: 0.074 } },
  // Kimi K2 Thinking — 推理增强版 ($0.60/$2.50)
  { pattern: /kimi.*k2.*think|k2-thinking/, name: "Kimi K2 Thinking",
    pricing: { input: 0.60, output: 2.50, cacheWrite5m: 0.60, cacheWrite1h: 0.60, cacheRead: 0.06 } },
  // Kimi K2 Instruct — 指令微调版 ($0.57/$2.30)
  { pattern: /kimi.*k2.*instruct|k2-instruct/, name: "Kimi K2 Instruct",
    pricing: { input: 0.57, output: 2.30, cacheWrite5m: 0.57, cacheWrite1h: 0.57, cacheRead: 0.057 } },
  // Kimi K2 0905 / Kimi K2 通用 ($0.40/$2.00)
  { pattern: /kimi.*k2|kimi-k2/, name: "Kimi K2",
    pricing: { input: 0.40, output: 2.00, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },
  // Kimi K1.5 ($0.50/$1.50)
  { pattern: /kimi.*k1\.?5|k1-5/, name: "Kimi K1.5",
    pricing: { input: 0.50, output: 1.50, cacheWrite5m: 0.50, cacheWrite1h: 0.50, cacheRead: 0.05 } },
  // Kimi Latest / Kimi 通用 ($0.74/$3.49)
  { pattern: /kimi/, name: "Kimi",
    pricing: { input: 0.74, output: 3.49, cacheWrite5m: 0.74, cacheWrite1h: 0.74, cacheRead: 0.074 } },
  // Moonshot 通用
  { pattern: /moonshot/, name: "Moonshot",
    pricing: { input: 0.74, output: 3.49, cacheWrite5m: 0.74, cacheWrite1h: 0.74, cacheRead: 0.074 } },

  // ── MiMo (小米) 系列 (OpenRouter 2026-05-04) ──────────────
  // MiMo-V2.5-Pro — 旗舰, 1M ctx ($1/$3)
  { pattern: /mimo.*v2\.5.*pro|mimo-v2\.5-pro/, name: "MiMo V2.5 Pro",
    pricing: { input: 1, output: 3, cacheWrite5m: 1, cacheWrite1h: 1, cacheRead: 0.10 } },
  // MiMo-V2.5 — 全模态, 1M ctx ($0.40/$2)
  { pattern: /mimo.*v2\.5(?!.*pro)|mimo-v2\.5$/, name: "MiMo V2.5",
    pricing: { input: 0.40, output: 2, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },
  // MiMo-V2-Pro — 1T params, 1M ctx ($1/$3)
  { pattern: /mimo.*v2.*pro(?!.*flash)|mimo-v2-pro/, name: "MiMo V2 Pro",
    pricing: { input: 1, output: 3, cacheWrite5m: 1, cacheWrite1h: 1, cacheRead: 0.10 } },
  // MiMo-V2-Flash — 309B/15B active ($0.09/$0.29)
  { pattern: /mimo.*v2.*flash|mimo-v2-flash/, name: "MiMo V2 Flash",
    pricing: { input: 0.09, output: 0.29, cacheWrite5m: 0.09, cacheWrite1h: 0.09, cacheRead: 0.009 } },
  // MiMo-V2-Omni — 全模态 ($0.40/$2)
  { pattern: /mimo.*v2.*omni|mimo-v2-omni/, name: "MiMo V2 Omni",
    pricing: { input: 0.40, output: 2, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },
  // MiMo V2 通用 ($0.40/$2)
  { pattern: /mimo.*v2|mimo-v2/, name: "MiMo V2",
    pricing: { input: 0.40, output: 2, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },
  // MiMo 通用兜底 ($0.15/$0.60)
  { pattern: /mimo/, name: "MiMo",
    pricing: { input: 0.15, output: 0.60, cacheWrite5m: 0.15, cacheWrite1h: 0.15, cacheRead: 0.015 } },

  // ── 豆包 (ByteDance 字节跳动) 系列 ────────────────────────
  // Doubao Pro ($0.40/$1.20)
  { pattern: /doubao.*pro|doubao-pro/, name: "Doubao Pro",
    pricing: { input: 0.40, output: 1.20, cacheWrite5m: 0.40, cacheWrite1h: 0.40, cacheRead: 0.04 } },
  // Doubao Lite ($0.10/$0.30)
  { pattern: /doubao.*lite|doubao-lite/, name: "Doubao Lite",
    pricing: { input: 0.10, output: 0.30, cacheWrite5m: 0.10, cacheWrite1h: 0.10, cacheRead: 0.01 } },
  // Doubao 通用
  { pattern: /doubao|豆包/, name: "Doubao",
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
