import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { execSync } from "child_process";

const HOME = process.env.HOME || homedir();

const USAGE_API_URL = "https://api.anthropic.com/api/oauth/usage";
const USAGE_API_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 180_000; // 3 minutes
const ERROR_CACHE_TTL_MS = 30_000; // 30 seconds
const LOCK_TTL_MS = 30_000; // 30 seconds
const FIVE_HOUR_MS = 5 * 60 * 60 * 1000;
const SEVEN_DAY_MS = 7 * 24 * 60 * 60 * 1000;

const CACHE_DIR = join(HOME, ".cache", "statux");
const CACHE_FILE = join(CACHE_DIR, "usage.json");
const LOCK_FILE = join(CACHE_DIR, "usage.lock");

export interface UsageData {
  sessionUsage: number | null;
  sessionResetAt: string | null;
  weeklyUsage: number | null;
  weeklyResetAt: string | null;
}

interface CachedUsage {
  data: UsageData;
  timestamp: number;
  isError: boolean;
}

// 内存缓存
let memoryCache: CachedUsage | null = null;

/** 从 macOS Keychain 获取 OAuth token */
function getTokenFromKeychain(): string | null {
  if (process.platform !== "darwin") return null;

  try {
    const secret = execSync(
      'security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null',
      { encoding: "utf-8", timeout: 5000 }
    ).trim();

    if (secret) {
      try {
        const parsed = JSON.parse(secret);
        return parsed?.claudeAiOauth?.accessToken || parsed?.accessToken || null;
      } catch {
        return secret || null;
      }
    }
  } catch { /* not found */ }

  return null;
}

/** 从 credentials 文件获取 OAuth token */
function getTokenFromFile(): string | null {
  const configDir = process.env.CLAUDE_CONFIG_DIR || join(HOME, ".claude");
  const credPath = join(configDir, ".credentials.json");

  try {
    if (!existsSync(credPath)) return null;
    const cred = JSON.parse(readFileSync(credPath, "utf-8"));
    return cred?.claudeAiOauth?.accessToken || null;
  } catch {
    return null;
  }
}

/** 获取 OAuth token（优先 Keychain，fallback 文件） */
function getUsageToken(): string | null {
  return getTokenFromKeychain() || getTokenFromFile();
}

/** 从 rate_limits (StatusJSON) 提取 usage 数据 */
export function extractUsageFromRateLimits(
  rateLimits: { five_hour?: { used_percentage?: number | null; resets_at?: number | null }; seven_day?: { used_percentage?: number | null; resets_at?: number | null } } | null | undefined
): UsageData | null {
  if (!rateLimits) return null;

  const fh = rateLimits.five_hour;
  const sd = rateLimits.seven_day;

  if (!fh && !sd) return null;

  const sessionUsage = fh?.used_percentage ?? null;
  const sessionResetAt = fh?.resets_at ? new Date(fh.resets_at * 1000).toISOString() : null;
  const weeklyUsage = sd?.used_percentage ?? null;
  const weeklyResetAt = sd?.resets_at ? new Date(sd.resets_at * 1000).toISOString() : null;

  // 需要至少有一个有效值
  if (sessionUsage == null && weeklyUsage == null) return null;

  return { sessionUsage, sessionResetAt, weeklyUsage, weeklyResetAt };
}

/** 调用 Anthropic Usage API */
async function fetchFromApi(token: string): Promise<UsageData | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), USAGE_API_TIMEOUT_MS);

    const resp = await fetch(USAGE_API_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) return null;

    const json = (await resp.json()) as {
      five_hour?: { utilization?: number | null; resets_at?: string | null };
      seven_day?: { utilization?: number | null; resets_at?: string | null };
    };

    return {
      sessionUsage: json.five_hour?.utilization ?? null,
      sessionResetAt: json.five_hour?.resets_at ?? null,
      weeklyUsage: json.seven_day?.utilization ?? null,
      weeklyResetAt: json.seven_day?.resets_at ?? null,
    };
  } catch {
    return null;
  }
}

/** 读取文件缓存 */
function readCache(): CachedUsage | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    const cached = JSON.parse(readFileSync(CACHE_FILE, "utf-8")) as CachedUsage;
    const ttl = cached.isError ? ERROR_CACHE_TTL_MS : CACHE_TTL_MS;
    if (Date.now() - cached.timestamp > ttl) return null;
    return cached;
  } catch {
    return null;
  }
}

/** 写入文件缓存 */
function writeCache(data: UsageData, isError: boolean): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    const cached: CachedUsage = { data, timestamp: Date.now(), isError };
    writeFileSync(CACHE_FILE, JSON.stringify(cached), "utf-8");
    memoryCache = cached;
  } catch { /* ignore */ }
}

/** 检查锁文件 */
function isLocked(): boolean {
  try {
    if (!existsSync(LOCK_FILE)) return false;
    const lock = JSON.parse(readFileSync(LOCK_FILE, "utf-8"));
    return lock.blockedUntil && Date.now() < lock.blockedUntil;
  } catch {
    return false;
  }
}

/** 写入锁文件 */
function writeLock(): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(
      LOCK_FILE,
      JSON.stringify({ blockedUntil: Date.now() + LOCK_TTL_MS, error: "timeout" }),
      "utf-8"
    );
  } catch { /* ignore */ }
}

/**
 * 获取 usage 数据（两层策略）
 * 1. 优先从 StatusJSON 的 rate_limits 提取
 * 2. 不完整时调用 Anthropic API（带缓存和锁）
 */
export async function fetchUsageData(
  rateLimits?: UsageData | null
): Promise<UsageData> {
  // 如果 rate_limits 数据完整，直接使用
  if (rateLimits?.sessionUsage != null && rateLimits?.weeklyUsage != null) {
    return rateLimits;
  }

  // 检查内存缓存
  if (memoryCache && !memoryCache.isError) {
    const ttl = memoryCache.isError ? ERROR_CACHE_TTL_MS : CACHE_TTL_MS;
    if (Date.now() - memoryCache.timestamp < ttl) {
      return mergeUsageData(rateLimits, memoryCache.data);
    }
  }

  // 检查文件缓存
  const fileCache = readCache();
  if (fileCache) {
    memoryCache = fileCache;
    return mergeUsageData(rateLimits, fileCache.data);
  }

  // 检查锁
  if (isLocked()) {
    return rateLimits || { sessionUsage: null, sessionResetAt: null, weeklyUsage: null, weeklyResetAt: null };
  }

  // 获取 token
  const token = getUsageToken();
  if (!token) {
    return rateLimits || { sessionUsage: null, sessionResetAt: null, weeklyUsage: null, weeklyResetAt: null };
  }

  // 调用 API
  writeLock();
  const apiData = await fetchFromApi(token);
  if (apiData) {
    writeCache(apiData, false);
    return mergeUsageData(rateLimits, apiData);
  }

  writeCache(rateLimits || { sessionUsage: null, sessionResetAt: null, weeklyUsage: null, weeklyResetAt: null }, true);
  return rateLimits || { sessionUsage: null, sessionResetAt: null, weeklyUsage: null, weeklyResetAt: null };
}

/** 合并两个 usage 数据源（rate_limits 优先） */
function mergeUsageData(primary: UsageData | null | undefined, secondary: UsageData): UsageData {
  if (!primary) return secondary;
  return {
    sessionUsage: primary.sessionUsage ?? secondary.sessionUsage,
    sessionResetAt: primary.sessionResetAt ?? secondary.sessionResetAt,
    weeklyUsage: primary.weeklyUsage ?? secondary.weeklyUsage,
    weeklyResetAt: primary.weeklyResetAt ?? secondary.weeklyResetAt,
  };
}

/** 计算 5 小时窗口的进度信息 */
export function buildBlockWindow(resetAt: string | null): {
  elapsedMs: number;
  remainingMs: number;
  elapsedPercent: number;
} | null {
  if (!resetAt) return null;

  const resetAtMs = Date.parse(resetAt);
  if (isNaN(resetAtMs)) return null;

  const now = Date.now();
  const startAtMs = resetAtMs - FIVE_HOUR_MS;
  const elapsedMs = Math.max(0, Math.min(now - startAtMs, FIVE_HOUR_MS));
  const remainingMs = FIVE_HOUR_MS - elapsedMs;
  const elapsedPercent = (elapsedMs / FIVE_HOUR_MS) * 100;

  return { elapsedMs, remainingMs, elapsedPercent };
}

/** 计算 7 天窗口的进度信息 */
export function buildWeeklyWindow(resetAt: string | null): {
  elapsedMs: number;
  remainingMs: number;
  elapsedPercent: number;
} | null {
  if (!resetAt) return null;

  const resetAtMs = Date.parse(resetAt);
  if (isNaN(resetAtMs)) return null;

  const now = Date.now();
  const startAtMs = resetAtMs - SEVEN_DAY_MS;
  const elapsedMs = Math.max(0, Math.min(now - startAtMs, SEVEN_DAY_MS));
  const remainingMs = SEVEN_DAY_MS - elapsedMs;
  const elapsedPercent = (elapsedMs / SEVEN_DAY_MS) * 100;

  return { elapsedMs, remainingMs, elapsedPercent };
}
