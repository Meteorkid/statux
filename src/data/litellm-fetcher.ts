/**
 * LiteLLM 定价数据获取器
 *
 * 从 GitHub 获取 model_prices_and_context_window.json（2200+ 模型），
 * 本地磁盘缓存 24 小时，离线时使用缓存兜底。
 *
 * 单位：USD per million tokens (MTok)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const HOME = process.env.HOME || homedir();
const CACHE_DIR = join(HOME, ".config", "statux");
const CACHE_FILE = join(CACHE_DIR, "pricing-cache.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时

const LITELLM_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

export interface ModelPricing {
  input: number;
  output: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  cacheRead: number;
}

export interface LiteLLMModelEntry {
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  cache_creation_input_token_cost?: number;
  cache_read_input_token_cost?: number;
  litellm_provider?: string;
  mode?: string;
  [key: string]: unknown;
}

/** 模块级定价缓存 — initPricingEngine() 填充 */
let pricingMap: Map<string, ModelPricing> | null = null;
let loadPromise: Promise<void> | null = null;

/** 从 LiteLLM 的 per-token 成本转换为 USD/MTok */
function perTokenToPerMTok(cost: number | undefined): number {
  return (cost ?? 0) * 1_000_000;
}

/** 从 LiteLLM JSON 条目解析定价 */
function parseLiteLLMEntry(entry: LiteLLMModelEntry): ModelPricing | null {
  const input = perTokenToPerMTok(entry.input_cost_per_token);
  const output = perTokenToPerMTok(entry.output_cost_per_token);
  // 无有效定价则跳过
  if (input === 0 && output === 0) return null;

  return {
    input,
    output,
    cacheWrite5m: perTokenToPerMTok(entry.cache_creation_input_token_cost),
    cacheWrite1h: 0, // LiteLLM 无 1h 缓存字段
    cacheRead: perTokenToPerMTok(entry.cache_read_input_token_cost),
  };
}

/** 从磁盘缓存加载定价数据 */
function loadFromDiskCache(): Map<string, ModelPricing> | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const raw = readFileSync(CACHE_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (!data.timestamp || !data.models) return null;

    const map = new Map<string, ModelPricing>();
    for (const [modelId, pricing] of Object.entries(data.models)) {
      map.set(modelId, pricing as ModelPricing);
    }
    return map;
  } catch {
    return null;
  }
}

/** 检查磁盘缓存是否仍然有效 */
function isCacheFresh(): boolean {
  try {
    if (!existsSync(CACHE_FILE)) return false;
    const { mtimeMs } = statSync(CACHE_FILE);
    return Date.now() - mtimeMs < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

/** 保存定价数据到磁盘缓存 */
function saveToDiskCache(map: Map<string, ModelPricing>): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    const models: Record<string, ModelPricing> = {};
    for (const [k, v] of map) models[k] = v;
    writeFileSync(CACHE_FILE, JSON.stringify({ timestamp: Date.now(), models }, null, 2), "utf-8");
  } catch {
    // 写缓存失败不影响运行
  }
}

/** 从远程获取 LiteLLM 定价数据 */
async function fetchFromRemote(): Promise<Map<string, ModelPricing> | null> {
  try {
    const resp = await fetch(LITELLM_URL, { signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) return null;

    const json = (await resp.json()) as Record<string, LiteLLMModelEntry>;
    const map = new Map<string, ModelPricing>();

    for (const [modelId, entry] of Object.entries(json)) {
      // 跳过非模型条目（如 _litellm 版本信息）
      if (modelId.startsWith("_")) continue;
      if (typeof entry !== "object" || entry === null) continue;

      const pricing = parseLiteLLMEntry(entry);
      if (pricing) map.set(modelId, pricing);
    }

    if (map.size > 0) {
      saveToDiskCache(map);
      return map;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 初始化定价引擎。
 *
 * 优先级：磁盘缓存（< 24h） → 远程获取 → 过期缓存 → 空（使用 curated 兜底）
 */
export async function initPricingEngine(): Promise<void> {
  // 快速路径：有效缓存
  if (isCacheFresh()) {
    pricingMap = loadFromDiskCache();
    return;
  }

  // 尝试远程获取
  const remote = await fetchFromRemote();
  if (remote && remote.size > 0) {
    pricingMap = remote;
    return;
  }

  // 远程失败，使用过期缓存
  pricingMap = loadFromDiskCache();
}

/**
 * 触发后台加载（不阻塞）。
 * 首次调用时启动，后续调用直接返回。
 */
export function ensurePricingLoaded(): void {
  if (!loadPromise) {
    loadPromise = initPricingEngine();
  }
}

/**
 * 从 LiteLLM 数据中查找模型定价。
 *
 * 匹配策略：
 * 1. 精确匹配
 * 2. 去除 provider 前缀（如 "anthropic/claude-sonnet" → "claude-sonnet"）
 * 3. 去除日期后缀（如 "claude-sonnet-4-5-20250514" → "claude-sonnet-4-5"）
 */
export function lookupLiteLLMPricing(modelId: string): (ModelPricing & { name: string }) | null {
  if (!pricingMap || pricingMap.size === 0) return null;

  const lower = modelId.toLowerCase();

  // 1. 精确匹配
  const exact = pricingMap.get(lower);
  if (exact) return { ...exact, name: lower };

  // 2. 去除 provider 前缀
  const slashIdx = lower.lastIndexOf("/");
  if (slashIdx >= 0) {
    const stripped = lower.slice(slashIdx + 1);
    const match = pricingMap.get(stripped);
    if (match) return { ...match, name: stripped };
  }

  // 3. 去除日期后缀（如 -20250514, -20241022）
  const withoutDate = lower.replace(/-\d{8}$/, "");
  if (withoutDate !== lower) {
    const match = pricingMap.get(withoutDate);
    if (match) return { ...match, name: withoutDate };
  }

  // 4. 去除 provider 前缀 + 日期后缀
  if (slashIdx >= 0) {
    const stripped = lower.slice(slashIdx + 1).replace(/-\d{8}$/, "");
    const match = pricingMap.get(stripped);
    if (match) return { ...match, name: stripped };
  }

  return null;
}

/** 获取已加载的模型总数 */
export function getLiteLLMModelCount(): number {
  return pricingMap?.size ?? 0;
}
