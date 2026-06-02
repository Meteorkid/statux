/**
 * 会话历史存储
 *
 * 使用 SQLite 记录每次 AI 工具会话的 token 用量和费用，
 * 支持按天/周/月查询汇总。
 */

import { Database } from "bun:sqlite";
import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import type { TokenMetrics } from "../types/Widget";
import type { Tool } from "../types/Tool";
import { getModelPricing, computeCostFromTokens } from "./model-pricing";

const HOME = process.env.HOME || homedir();
const DB_DIR = join(HOME, ".config", "statux");
const DB_PATH = join(DB_DIR, "history.db");

// ─── 数据库初始化 ────────────────────────────────────────────

let db: Database | null = null;

function getDb(): Database {
  if (db) return db;

  mkdirSync(DB_DIR, { recursive: true });
  db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      tool TEXT NOT NULL,
      model TEXT,
      project TEXT,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cache_creation_tokens INTEGER DEFAULT 0,
      cache_read_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      cost_cumulative_snapshot REAL DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      started_at INTEGER,
      ended_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_tool ON sessions(tool);
    CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project);
  `);

  // 迁移：为已有表添加新列（如果不存在）
  try { db.exec(`ALTER TABLE sessions ADD COLUMN cost_cumulative_snapshot REAL DEFAULT 0`); } catch { /* 已存在 */ }

  return db;
}

// ─── 写入 ───────────────────────────────────────────────────

export interface SessionRecord {
  id: string;
  tool: Tool;
  model?: string;
  project?: string;
  tokenMetrics?: TokenMetrics | null;
  costUsd?: number;
  durationSeconds?: number;
  startedAt?: number;
  endedAt?: number;
}

/** 查找可能重复的 session（同模型、同 token 数据、5 分钟内） */
function findDuplicateSession(
  database: Database,
  model: string | undefined,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number
): { id: string } | null {
  if (!model || (inputTokens === 0 && outputTokens === 0)) return null;
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  return database
    .query(
      `SELECT id FROM sessions
       WHERE model = ? AND input_tokens = ? AND output_tokens = ? AND cache_read_tokens = ?
         AND created_at >= ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(model, inputTokens, outputTokens, cacheReadTokens, fiveMinAgo) as { id: string } | null;
}

/**
 * 记录一次会话（增量模式 + 去重）
 *
 * 累计 cost 来自 JSONL 全量数据，每次 render 都在增长（cache_read 持续累积）。
 * 为了历史汇总准确，只记录 cost 的增量（本次 - 上次），避免重复计费。
 * 同时检查是否有重复 session（同模型+token 数据），避免同一会话多条记录。
 */
export function recordSession(session: SessionRecord): void {
  const database = getDb();
  const now = Date.now();
  const metrics = session.tokenMetrics;

  // 如果有模型和 token 数据但没有费用，自动计算（累计值）
  let cumulativeCost = session.costUsd ?? 0;
  if (cumulativeCost === 0 && session.model && metrics) {
    const pricing = getModelPricing(session.model);
    if (pricing) {
      cumulativeCost = computeCostFromTokens(
        metrics.inputTokens,
        metrics.outputTokens,
        metrics.cacheCreationTokens,
        metrics.cacheReadTokens,
        pricing
      );
    }
  }

  // 去重：检查是否已有相同 token 数据的 session
  let sessionId = session.id;
  if (metrics && session.model) {
    const dup = findDuplicateSession(
      database, session.model,
      metrics.inputTokens, metrics.outputTokens, metrics.cacheReadTokens
    );
    if (dup && dup.id !== sessionId) {
      sessionId = dup.id;
    }
  }

  // 读取上次的累计快照和已累加费用
  const existing = database
    .query(`SELECT cost_usd, cost_cumulative_snapshot FROM sessions WHERE id = ?`)
    .get(sessionId) as { cost_usd: number; cost_cumulative_snapshot: number } | undefined;

  const previousSnapshot = existing?.cost_cumulative_snapshot ?? 0;
  const accumulatedCost = existing?.cost_usd ?? 0;

  // 增量 = 当前累计 - 上次快照（只取正增量，压缩导致的回退不计）
  const delta = Math.max(0, cumulativeCost - previousSnapshot);
  const newAccumulatedCost = accumulatedCost + delta;

  const createdAt = existing
    ? (database.query(`SELECT created_at FROM sessions WHERE id = ?`).get(sessionId) as { created_at: number }).created_at
    : now;

  database.run(
    `INSERT OR REPLACE INTO sessions (id, tool, model, project, input_tokens, output_tokens,
     cache_creation_tokens, cache_read_tokens, total_tokens, cost_usd, cost_cumulative_snapshot,
     duration_seconds, started_at, ended_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      session.tool,
      session.model ?? null,
      session.project ?? null,
      metrics?.inputTokens ?? 0,
      metrics?.outputTokens ?? 0,
      metrics?.cacheCreationTokens ?? 0,
      metrics?.cacheReadTokens ?? 0,
      metrics?.totalTokens ?? 0,
      newAccumulatedCost,
      cumulativeCost,
      session.durationSeconds ?? 0,
      session.startedAt ?? now,
      session.endedAt ?? now,
      createdAt,
    ]
  );
}

// ─── 查询 ───────────────────────────────────────────────────

export interface SessionSummary {
  sessionCount: number;
  totalTokens: number;
  totalCostUsd: number;
  totalDurationSeconds: number;
}

export interface DailySummary {
  date: string;
  sessionCount: number;
  totalTokens: number;
  totalCostUsd: number;
}

/** 获取今日汇总 */
export function getTodaySummary(): SessionSummary {
  const database = getDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startMs = startOfDay.getTime();

  const row = database
    .query(
      `SELECT COUNT(*) as sessionCount,
              COALESCE(SUM(total_tokens), 0) as totalTokens,
              COALESCE(SUM(cost_usd), 0) as totalCostUsd,
              COALESCE(SUM(duration_seconds), 0) as totalDurationSeconds
       FROM sessions WHERE created_at >= ?`
    )
    .get(startMs) as SessionSummary;

  return row ?? { sessionCount: 0, totalTokens: 0, totalCostUsd: 0, totalDurationSeconds: 0 };
}

/** 获取本周汇总 */
export function getWeekSummary(): SessionSummary {
  const database = getDb();
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const startMs = startOfWeek.getTime();

  const row = database
    .query(
      `SELECT COUNT(*) as sessionCount,
              COALESCE(SUM(total_tokens), 0) as totalTokens,
              COALESCE(SUM(cost_usd), 0) as totalCostUsd,
              COALESCE(SUM(duration_seconds), 0) as totalDurationSeconds
       FROM sessions WHERE created_at >= ?`
    )
    .get(startMs) as SessionSummary;

  return row ?? { sessionCount: 0, totalTokens: 0, totalCostUsd: 0, totalDurationSeconds: 0 };
}

/** 获取最近 N 天的每日汇总 */
export function getDailySummaries(days: number = 7): DailySummary[] {
  const database = getDb();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const rows = database
    .query(
      `SELECT
        date(created_at / 1000, 'unixepoch', 'localtime') as date,
        COUNT(*) as sessionCount,
        SUM(total_tokens) as totalTokens,
        SUM(cost_usd) as totalCostUsd
       FROM sessions
       WHERE created_at >= ?
       GROUP BY date
       ORDER BY date DESC`
    )
    .all(cutoff) as DailySummary[];

  return rows;
}

/** 获取最近 N 条会话记录 */
export function getRecentSessions(limit: number = 20): SessionRecord[] {
  const database = getDb();

  const rows = database
    .query(
      `SELECT id, tool, model, project, input_tokens, output_tokens,
              cache_creation_tokens, cache_read_tokens, total_tokens,
              cost_usd, duration_seconds, started_at, ended_at, created_at
       FROM sessions
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(limit) as Array<{
      id: string;
      tool: Tool;
      model: string | null;
      project: string | null;
      input_tokens: number;
      output_tokens: number;
      cache_creation_tokens: number;
      cache_read_tokens: number;
      total_tokens: number;
      cost_usd: number;
      duration_seconds: number;
      started_at: number | null;
      ended_at: number | null;
      created_at: number;
    }>;

  return rows.map((row) => ({
    id: row.id,
    tool: row.tool,
    model: row.model ?? undefined,
    project: row.project ?? undefined,
    tokenMetrics: {
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      cacheCreationTokens: row.cache_creation_tokens,
      cacheReadTokens: row.cache_read_tokens,
      cachedTokens: row.cache_creation_tokens + row.cache_read_tokens,
      totalTokens: row.total_tokens,
      contextLength: 0,
    },
    costUsd: row.cost_usd,
    durationSeconds: row.duration_seconds,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
  }));
}

/** 按工具汇总 */
export function getSummaryByTool(): Array<{ tool: string; sessionCount: number; totalCostUsd: number }> {
  const database = getDb();

  return database
    .query(
      `SELECT tool, COUNT(*) as sessionCount, SUM(cost_usd) as totalCostUsd
       FROM sessions
       GROUP BY tool
       ORDER BY totalCostUsd DESC`
    )
    .all() as Array<{ tool: string; sessionCount: number; totalCostUsd: number }>;
}

/** 按模型汇总（最近 N 天） */
export function getSummaryByModel(days: number = 7): Array<{ model: string; sessionCount: number; totalCostUsd: number }> {
  const database = getDb();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return database
    .query(
      `SELECT model, COUNT(*) as sessionCount, SUM(cost_usd) as totalCostUsd
       FROM sessions
       WHERE created_at >= ? AND model IS NOT NULL
       GROUP BY model
       ORDER BY totalCostUsd DESC`
    )
    .all(cutoff) as Array<{ model: string; sessionCount: number; totalCostUsd: number }>;
}

/** 关闭数据库连接 */
export function closeHistoryDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
