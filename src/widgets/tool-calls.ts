import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { readFileSync, existsSync, statSync } from "fs";

interface ToolCallEntry {
  tool: string;
  timestamp: string;
}

// mtime 缓存：避免每次渲染都读整个 JSONL
const CACHE_LIMIT = 20;
const callsCache = new Map<string, { mtime: number; calls: ToolCallEntry[] }>();

/** 从 JSONL 中提取最近的工具调用，带 mtime 缓存 */
function getRecentToolCalls(transcriptPath: string, limit: number): ToolCallEntry[] {
  if (!existsSync(transcriptPath)) return [];

  const mtime = statSync(transcriptPath).mtimeMs;
  const cached = callsCache.get(transcriptPath);
  if (cached && cached.mtime === mtime) return cached.calls.slice(0, limit);

  const content = readFileSync(transcriptPath, "utf-8");
  const calls: ToolCallEntry[] = [];

  // 从后往前扫描，找到最近的工具调用
  const lines = content.split("\n").reverse();
  for (const line of lines) {
    if (calls.length >= CACHE_LIMIT) break;
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed);
      if (entry.type === "assistant" && entry.message?.content) {
        for (const block of entry.message.content) {
          if (block.type === "tool_use" && block.name) {
            calls.unshift({ tool: block.name, timestamp: entry.timestamp || "" });
          }
        }
      }
    } catch {
      // skip
    }
  }

  callsCache.set(transcriptPath, { mtime, calls });
  return calls.slice(0, limit);
}

export const ToolCallsWidget: Widget = {
  type: "tool-calls",
  category: "session",
  displayName: "Tool Calls",
  description: "最近的工具调用",
  defaultColor: "gray",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const transcriptPath = ctx.data.transcript_path;
    if (!transcriptPath) return null;

    const limit = (item.metadata?.limit as number) || 3;
    const calls = getRecentToolCalls(transcriptPath, limit);
    if (calls.length === 0) return null;

    const names = calls.map((c) => c.tool);
    return colorize(names.join("→"), item.color || this.defaultColor, item.bold);
  },
};
