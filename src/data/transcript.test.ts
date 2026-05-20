import { describe, expect, test } from "bun:test";
import { computeTokenMetrics, type NormalizedEntry } from "./transcript";

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
});
