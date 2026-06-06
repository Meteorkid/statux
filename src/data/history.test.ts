/**
 * history.ts 单元测试
 *
 * 验证增量 cost 记账、去重、汇总查询等核心逻辑。
 * 每个测试用独立临时目录 + resetHistoryDb() 确保隔离。
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, cpSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  recordSession,
  getTodaySummary,
  getWeekSummary,
  getDailySummaries,
  getRecentSessions,
  getSummaryByTool,
  closeHistoryDb,
  resetHistoryDb,
  type SessionRecord,
} from "./history";

let testDir: string;
let origHome: string | undefined;

/** 切换到临时 HOME，让 history.ts 使用测试数据库 */
function setupTestEnv() {
  testDir = mkdtempSync(join(tmpdir(), "statux-history-test-"));
  origHome = process.env.HOME;
  process.env.HOME = testDir;
  // 重置模块级数据库连接，使其使用新的 HOME
  resetHistoryDb();
}

function cleanupTestEnv() {
  closeHistoryDb();
  if (origHome !== undefined) {
    process.env.HOME = origHome;
  } else {
    delete process.env.HOME;
  }
  try { rmSync(testDir, { recursive: true, force: true }); } catch {}
}

// ─── recordSession 基础测试 ────────────────────────────────

describe("recordSession", () => {
  beforeEach(() => setupTestEnv());
  afterEach(() => cleanupTestEnv());

  test("写入基本 session 并能读回", () => {
    const session: SessionRecord = {
      id: "test-session-1",
      tool: "claude-code",
      model: "claude-sonnet-4-20250514",
      project: "/test/project",
      tokenMetrics: {
        inputTokens: 1000,
        outputTokens: 500,
        cacheCreationTokens: 100,
        cacheReadTokens: 200,
        cachedTokens: 300,
        totalTokens: 1800,
        contextLength: 1300,
      },
      costUsd: 0.05,
      durationSeconds: 120,
    };

    recordSession(session);

    const sessions = getRecentSessions(10);
    expect(sessions.length).toBe(1);
    expect(sessions[0]!.id).toBe("test-session-1");
    expect(sessions[0]!.tool).toBe("claude-code");
    expect(sessions[0]!.model).toBe("claude-sonnet-4-20250514");
    expect(sessions[0]!.costUsd).toBeCloseTo(0.05, 4);
  });

  test("相同 session 不产生重复记录", () => {
    const session: SessionRecord = {
      id: "dedup-test",
      tool: "claude-code",
      model: "claude-sonnet-4-20250514",
      tokenMetrics: {
        inputTokens: 1000,
        outputTokens: 500,
        cacheCreationTokens: 0,
        cacheReadTokens: 100,
        cachedTokens: 100,
        totalTokens: 1600,
        contextLength: 1100,
      },
      costUsd: 0.03,
    };

    recordSession(session);
    recordSession(session); // 重复写入

    const sessions = getRecentSessions(10);
    // 去重：相同 token 数据的 session 只保留一条
    expect(sessions.length).toBe(1);
  });

  test("不同 token 数据的 session 不去重", () => {
    const base: Omit<SessionRecord, "tokenMetrics" | "costUsd"> = {
      id: "multi-test",
      tool: "claude-code",
      model: "claude-sonnet-4-20250514",
    };

    recordSession({
      ...base,
      tokenMetrics: {
        inputTokens: 1000, outputTokens: 500,
        cacheCreationTokens: 0, cacheReadTokens: 100,
        cachedTokens: 100, totalTokens: 1600, contextLength: 1100,
      },
      costUsd: 0.03,
    });

    recordSession({
      ...base,
      id: "multi-test-2",
      tokenMetrics: {
        inputTokens: 2000, outputTokens: 800,
        cacheCreationTokens: 0, cacheReadTokens: 200,
        cachedTokens: 200, totalTokens: 3000, contextLength: 2200,
      },
      costUsd: 0.06,
    });

    const sessions = getRecentSessions(10);
    expect(sessions.length).toBe(2);
  });
});

// ─── 增量 cost 记账 ────────────────────────────────────────

describe("incremental cost tracking", () => {
  beforeEach(() => setupTestEnv());
  afterEach(() => cleanupTestEnv());

  test("第二次写入同一 session 只计入增量 cost", () => {
    const session: SessionRecord = {
      id: "incremental-test",
      tool: "claude-code",
      model: "claude-sonnet-4-20250514",
      tokenMetrics: {
        inputTokens: 1000, outputTokens: 500,
        cacheCreationTokens: 0, cacheReadTokens: 100,
        cachedTokens: 100, totalTokens: 1600, contextLength: 1100,
      },
      costUsd: 0.05, // 累计 cost
    };
    recordSession(session);

    // 同一 session，累计 cost 增长到 0.08
    recordSession({ ...session, costUsd: 0.08 });

    const sessions = getRecentSessions(10);
    expect(sessions.length).toBe(1);
    // 增量 = 0.08 - 0.05 = 0.03，累加后 total = 0.05 + 0.03 = 0.08
    expect(sessions[0]!.costUsd).toBeCloseTo(0.08, 4);
  });

  test("cost 回退（压缩）不产生负增量", () => {
    const session: SessionRecord = {
      id: "rollback-test",
      tool: "claude-code",
      model: "claude-sonnet-4-20250514",
      tokenMetrics: {
        inputTokens: 1000, outputTokens: 500,
        cacheCreationTokens: 0, cacheReadTokens: 100,
        cachedTokens: 100, totalTokens: 1600, contextLength: 1100,
      },
      costUsd: 0.10,
    };
    recordSession(session);

    // 累计 cost 回退（context 压缩导致）
    recordSession({ ...session, costUsd: 0.06 });

    const sessions = getRecentSessions(10);
    expect(sessions.length).toBe(1);
    // delta = max(0, 0.06 - 0.10) = 0，total 保持 0.10
    expect(sessions[0]!.costUsd).toBeCloseTo(0.10, 4);
  });
});

// ─── 汇总查询 ──────────────────────────────────────────────

describe("summary queries", () => {
  beforeEach(() => setupTestEnv());
  afterEach(() => cleanupTestEnv());

  test("getTodaySummary 包含今天的 session", () => {
    recordSession({
      id: "today-1",
      tool: "claude-code",
      model: "claude-sonnet-4-20250514",
      tokenMetrics: {
        inputTokens: 500, outputTokens: 200,
        cacheCreationTokens: 0, cacheReadTokens: 50,
        cachedTokens: 50, totalTokens: 750, contextLength: 550,
      },
      costUsd: 0.02,
      endedAt: Date.now(),
    });

    const summary = getTodaySummary();
    expect(summary.sessionCount).toBeGreaterThanOrEqual(1);
    expect(summary.totalCostUsd).toBeGreaterThan(0);
  });

  test("getRecentSessions 按时间倒序", () => {
    const now = Date.now();
    recordSession({
      id: "seq-1", tool: "claude-code", costUsd: 0.01,
      startedAt: now - 2000, endedAt: now - 1000,
    });
    recordSession({
      id: "seq-2", tool: "claude-code", costUsd: 0.02,
      startedAt: now - 1000, endedAt: now,
    });

    const sessions = getRecentSessions(10);
    expect(sessions.length).toBe(2);
    // 最新的排在前面
    expect(sessions[0]!.id).toBe("seq-2");
    expect(sessions[1]!.id).toBe("seq-1");
  });

  test("getSummaryByTool 按工具汇总", () => {
    const now = Date.now();
    recordSession({
      id: "tool-claude", tool: "claude-code", costUsd: 0.05,
      startedAt: now, endedAt: now,
    });
    recordSession({
      id: "tool-codex", tool: "codex", costUsd: 0.03,
      startedAt: now, endedAt: now,
    });

    const summary = getSummaryByTool();
    expect(summary.length).toBeGreaterThanOrEqual(2);
    const claudeEntry = summary.find((s) => s.tool === "claude-code");
    expect(claudeEntry).toBeDefined();
    expect(claudeEntry!.sessionCount).toBeGreaterThanOrEqual(1);
  });
});
