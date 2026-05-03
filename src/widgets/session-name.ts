import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { readFileSync, existsSync } from "fs";

/** 从 JSONL 中提取会话名称（ai-title 条目） */
function getSessionName(transcriptPath: string): string | null {
  if (!existsSync(transcriptPath)) return null;

  const content = readFileSync(transcriptPath, "utf-8");
  const lines = content.split("\n").reverse();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed);
      if (entry.type === "ai-title" && entry.title) {
        return entry.title;
      }
    } catch {
      // skip
    }
  }
  return null;
}

export const SessionNameWidget: Widget = {
  type: "session-name",
  category: "session",
  displayName: "Session Name",
  description: "会话名称（通过 /rename 设置）",
  defaultColor: "magenta",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const transcriptPath = ctx.data.transcript_path;
    if (!transcriptPath) return null;

    const name = getSessionName(transcriptPath);
    if (!name) return null;

    const maxLen = (item.metadata?.maxLength as number) || 30;
    const truncated = name.length > maxLen ? name.slice(0, maxLen) + "…" : name;

    return colorize(truncated, item.color || this.defaultColor, item.bold);
  },
};
