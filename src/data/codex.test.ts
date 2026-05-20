import { describe, expect, test } from "bun:test";
import {
  isCodexBridgeFresh,
  isCodexThreadFresh,
  type CodexBridgeData,
  type CodexThread,
} from "./codex";

function bridge(lastUpdated: number): CodexBridgeData {
  return {
    session_id: "session-1",
    transcript_path: null,
    cwd: "/tmp/project",
    model: "gpt-5",
    source: "hook",
    last_updated: lastUpdated,
    last_event: "Stop",
  };
}

function thread(updatedAt: number, updatedAtMs: number | null = null): CodexThread {
  return {
    id: "thread-1",
    rollout_path: "/tmp/rollout.jsonl",
    created_at: updatedAt - 60,
    updated_at: updatedAt,
    source: "codex",
    model_provider: "openai",
    cwd: "/tmp/project",
    title: "Test thread",
    tokens_used: 1000,
    git_sha: null,
    git_branch: null,
    git_origin_url: null,
    cli_version: "0.0.0",
    model: "gpt-5",
    reasoning_effort: null,
    agent_nickname: null,
    agent_role: null,
    memory_mode: "default",
    created_at_ms: null,
    updated_at_ms: updatedAtMs,
  };
}

describe("Codex local state freshness", () => {
  test("accepts fresh bridge timestamps in milliseconds", () => {
    const now = 1_700_000_000_000;
    expect(isCodexBridgeFresh(bridge(now - 30_000), now, 120_000)).toBe(true);
  });

  test("accepts fresh bridge timestamps in seconds", () => {
    const now = 1_700_000_000_000;
    expect(isCodexBridgeFresh(bridge((now - 30_000) / 1000), now, 120_000)).toBe(true);
  });

  test("rejects stale bridge timestamps", () => {
    const now = 1_700_000_000_000;
    expect(isCodexBridgeFresh(bridge(now - 300_000), now, 120_000)).toBe(false);
  });

  test("uses updated_at_ms before updated_at for threads", () => {
    const now = 1_700_000_000_000;
    const staleSeconds = (now - 300_000) / 1000;
    const freshMs = now - 30_000;
    expect(isCodexThreadFresh(thread(staleSeconds, freshMs), now, 120_000)).toBe(true);
  });

  test("rejects stale thread timestamps", () => {
    const now = 1_700_000_000_000;
    expect(isCodexThreadFresh(thread((now - 300_000) / 1000), now, 120_000)).toBe(false);
  });
});
