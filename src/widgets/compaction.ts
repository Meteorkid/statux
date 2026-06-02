import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { readFileSync, existsSync, statSync } from "fs";

// mtime 缓存：避免每次渲染都扫描 JSONL
const compactionCache = new Map<string, { mtime: number; count: number }>();

/** 检测压缩次数：扫描 JSONL 中上下文突降 >50% 的事件 */
function detectCompactionCount(transcriptPath: string): number {
  if (!existsSync(transcriptPath)) return 0;

  const mtime = statSync(transcriptPath).mtimeMs;
  const cached = compactionCache.get(transcriptPath);
  if (cached && cached.mtime === mtime) return cached.count;

  let count = 0;
  let prevCtx = 0;

  try {
    const content = readFileSync(transcriptPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed);
        if (entry.type === "assistant" && entry.message?.usage && entry.message?.stop_reason) {
          const u = entry.message.usage;
          const ctx = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
          // 上下文突降 >50% 视为压缩
          if (prevCtx > 0 && ctx < prevCtx * 0.5) {
            count++;
          }
          if (ctx > 0) prevCtx = ctx;
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  compactionCache.set(transcriptPath, { mtime, count });
  return count;
}

export const CompactionWidget: Widget = {
  type: "compaction",
  category: "context",
  displayName: "Compaction Count",
  description: "上下文压缩次数（通过 JSONL 上下文突降检测）",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const transcriptPath = ctx.data.transcript_path;
    if (!transcriptPath) return null;

    const count = detectCompactionCount(transcriptPath);
    if (count === 0 && item.metadata?.hideWhenZero !== false) return null;

    return colorize(`compact:${count}`, item.color || this.defaultColor, item.bold);
  },
};
