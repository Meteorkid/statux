import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

const TOOL_LABELS: Record<string, { label: string; color: string }> = {
  "claude-code": { label: "CC", color: "orange" },
  codex: { label: "CX", color: "green" },
};

export const ToolIndicatorWidget: Widget = {
  type: "tool-indicator",
  category: "session",
  displayName: "Tool Indicator",
  description: "显示当前 AI 工具 (CC=Claude Code, CX=Codex)",
  defaultColor: "white",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (!ctx.tool) return null;
    const info = TOOL_LABELS[ctx.tool];
    if (!info) return null;
    return colorize(`[${info.label}]`, info.color, item.bold);
  },
};
