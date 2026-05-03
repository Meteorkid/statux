import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { readFileSync, existsSync } from "fs";

interface ToolCallEntry {
  tool: string;
  timestamp: string;
}

/** 从 JSONL 中提取最近的工具调用 */
function getRecentToolCalls(transcriptPath: string, limit: number): ToolCallEntry[] {
  if (!existsSync(transcriptPath)) return [];

  const content = readFileSync(transcriptPath, "utf-8");
  const calls: ToolCallEntry[] = [];

  // 从后往前扫描，找到最近的工具调用
  const lines = content.split("\n").reverse();
  for (const line of lines) {
    if (calls.length >= limit) break;
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

  return calls;
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
