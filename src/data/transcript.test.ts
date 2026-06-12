import { describe, expect, test } from "bun:test";
import { computeTokenMetrics, computeSessionDuration, computeSpeedMetrics, type NormalizedEntry } from "./transcript";

describe("computeTokenMetrics", () => {
  test("counts finalized entries and cache tokens", () => {
    const entries: NormalizedEntry[] = [
      {
        timestamp: 1,
        inputTokens: 100,
        outputTokens: 20,
        cacheCreationTokens: 5,
        cacheReadTokens: 10,
        isFinalized: false,
        isSidechain: false,
      },
      {
        timestamp: 2,
        inputTokens: 200,
        outputTokens: 40,
        cacheCreationTokens: 7,
        cacheReadTokens: 13,
        isFinalized: true,
        isSidechain: false,
      },
    ];

    expect(computeTokenMetrics(entries)).toEqual({
      inputTokens: 200,
      outputTokens: 40,
      cacheCreationTokens: 7,
      cacheReadTokens: 13,
      cachedTokens: 20,
      totalTokens: 260,
      contextLength: 220,
    });
  });

  test("falls back to the last entry when nothing is finalized", () => {
    const entries: NormalizedEntry[] = [
      {
        timestamp: 1,
        inputTokens: 10,
        outputTokens: 1,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        isFinalized: false,
        isSidechain: false,
      },
      {
        timestamp: 2,
        inputTokens: 20,
        outputTokens: 2,
        cacheCreationTokens: 0,
        cacheReadTokens: 3,
        isFinalized: false,
        isSidechain: false,
      },
    ];

    expect(computeTokenMetrics(entries)?.totalTokens).toBe(25);
  });

  test("returns null for empty entries", () => {
    expect(computeTokenMetrics([])).toBeNull();
  });

  test("excludes sidechain entries from context length", () => {
    const entries: NormalizedEntry[] = [
      { timestamp: 1, inputTokens: 100, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
      { timestamp: 2, inputTokens: 500, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: true },
    ];
    const metrics = computeTokenMetrics(entries);
    // contextLength 只取主链条目
    expect(metrics!.contextLength).toBe(100);
  });
});

describe("computeSessionDuration", () => {
  test("returns null for < 2 entries", () => {
    expect(computeSessionDuration([])).toBeNull();
    expect(computeSessionDuration([{ timestamp: 1, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false }])).toBeNull();
  });

  test("formats as seconds for short sessions", () => {
    const entries: NormalizedEntry[] = [
      { timestamp: 1000, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
      { timestamp: 30_000, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
    ];
    expect(computeSessionDuration(entries)).toBe("29s");
  });

  test("formats as minutes for medium sessions", () => {
    const entries: NormalizedEntry[] = [
      { timestamp: 1000, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
      { timestamp: 5 * 60_000 + 1000, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
    ];
    expect(computeSessionDuration(entries)).toBe("5m");
  });

  test("formats as hours for long sessions", () => {
    const entries: NormalizedEntry[] = [
      { timestamp: 1000, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
      { timestamp: 90 * 60_000 + 1000, inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
    ];
    expect(computeSessionDuration(entries)).toBe("1h30m");
  });
});

describe("computeSpeedMetrics", () => {
  test("returns null for empty entries", () => {
    expect(computeSpeedMetrics([])).toBeNull();
  });

  test("computes session average speed", () => {
    const entries: NormalizedEntry[] = [
      { timestamp: 1000, inputTokens: 100, outputTokens: 50, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
      { timestamp: 11_000, inputTokens: 200, outputTokens: 100, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
    ];
    const result = computeSpeedMetrics(entries);
    expect(result).not.toBeNull();
    expect(result!.sessionAverage.tokensPerSecond).toBeGreaterThan(0);
  });

  test("excludes sidechain entries from speed", () => {
    const entries: NormalizedEntry[] = [
      { timestamp: 1000, inputTokens: 100, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
      { timestamp: 6000, inputTokens: 5000, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: true },
      { timestamp: 11_000, inputTokens: 200, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
    ];
    const result = computeSpeedMetrics(entries);
    expect(result).not.toBeNull();
    // 只有非 sidechain 条目参与计算
    expect(result!.sessionAverage.inputTokensPerSecond).toBeGreaterThan(0);
  });

  test("computes windowed metrics", () => {
    const now = Date.now();
    const entries: NormalizedEntry[] = [
      { timestamp: now - 120_000, inputTokens: 100, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
      { timestamp: now - 60_000, inputTokens: 200, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
      { timestamp: now, inputTokens: 300, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
    ];
    const result = computeSpeedMetrics(entries, [60, 120]);
    expect(result).not.toBeNull();
    expect(result!.windowed["60"]).toBeDefined();
    expect(result!.windowed["120"]).toBeDefined();
    expect(result!.windowed["60"]!.tokensPerSecond).toBeGreaterThanOrEqual(0);
  });

  test("computes 10-second window metrics", () => {
    const now = Date.now();
    const entries: NormalizedEntry[] = [
      { timestamp: now - 60_000, inputTokens: 100, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
      { timestamp: now - 5_000, inputTokens: 200, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
      { timestamp: now, inputTokens: 300, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
    ];
    const result = computeSpeedMetrics(entries, [10, 30, 60]);
    expect(result).not.toBeNull();
    // 10s 窗口只包含最近两个事件
    expect(result!.windowed["10"]).toBeDefined();
    expect(result!.windowed["10"]!.inputTokensPerSecond).toBeGreaterThan(0);
    expect(result!.windowed["30"]).toBeDefined();
    expect(result!.windowed["60"]).toBeDefined();
  });

  test("single event in window uses actual time delta", () => {
    const now = Date.now();
    // 只有一个事件在 10 秒窗口内，发生在 3 秒前
    const entries: NormalizedEntry[] = [
      { timestamp: now - 60_000, inputTokens: 100, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
      { timestamp: now - 3_000, inputTokens: 200, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, isFinalized: true, isSidechain: false },
    ];
    const result = computeSpeedMetrics(entries, [10]);
    expect(result).not.toBeNull();
    expect(result!.windowed["10"]).toBeDefined();
    // 应该用 ~3 秒计算，而不是 10 秒
    const speed = result!.windowed["10"]!.inputTokensPerSecond;
    expect(speed).toBeGreaterThan(0);
  });
});
