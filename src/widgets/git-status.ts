import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const GitStatusWidget: Widget = {
  type: "git-status",
  category: "git",
  displayName: "Git Status",
  description: "Git 文件变更统计",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const info = ctx.gitInfo;
    if (!info) return null;

    const parts: string[] = [];
    if (info.staged > 0) parts.push(colorize(`+${info.staged}`, "green"));
    if (info.unstaged > 0) parts.push(colorize(`~${info.unstaged}`, "yellow"));
    if (info.untracked > 0) parts.push(colorize(`?${info.untracked}`, "gray"));
    if (info.ahead > 0) parts.push(colorize(`↑${info.ahead}`, "cyan"));
    if (info.behind > 0) parts.push(colorize(`↓${info.behind}`, "red"));

    if (parts.length === 0) return null;
    return parts.join(" ");
  },
};
