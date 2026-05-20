import { describe, expect, test } from "bun:test";
import { buildIterm2StatusPayload } from "./iterm2-status";
import type { StatusJSON } from "../types/StatusJSON";
import type { TokenMetrics } from "../types/Widget";

const tokenMetrics: TokenMetrics = {
  inputTokens: 1234,
  outputTokens: 567,
  cachedTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
  totalTokens: 1801,
  contextLength: 1234,
};

describe("buildIterm2StatusPayload", () => {
  test("uses used_percentage when present", () => {
    const data: StatusJSON = {
      model: { id: "claude-opus", display_name: "Opus" },
      context_window: { used_percentage: 42.4, remaining_percentage: 10 },
      cost: { total_cost_usd: 0.345 },
      rate_limits: { five_hour: { used_percentage: 81.7 } },
    };

    expect(buildIterm2StatusPayload(data, tokenMetrics)).toEqual({
      model: "Opus",
      ctxPct: 42,
      cost: "0.34",
      rateLimit: 82,
      tokens: { in: 1234, out: 567 },
    });
  });

  test("derives context percentage from remaining_percentage", () => {
    const data: StatusJSON = {
      model: "gpt-5",
      context_window: { remaining_percentage: 12.2 },
      rate_limits: null,
    };

    expect(buildIterm2StatusPayload(data, null)).toEqual({
      model: "gpt-5",
      ctxPct: 88,
      cost: null,
      rateLimit: null,
      tokens: null,
    });
  });
});
