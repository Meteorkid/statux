import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const CompactionWidget: Widget = {
  type: "compaction",
  category: "context",
  displayName: "Compaction Count",
  description: "上下文压缩次数",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    // compaction 数据来自 JSONL 分析（上下文百分比突降）
    // 这里简化：从 metadata 或未来扩展中获取
    const count = (item.metadata?.count as number) ?? 0;
    if (count === 0 && item.metadata?.hideWhenZero !== false) return null;

    return colorize(`compact:${count}`, item.color || this.defaultColor, item.bold);
  },
};
