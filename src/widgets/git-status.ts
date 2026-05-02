import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { getGitStatus } from "../data/git";

export const GitStatusWidget: Widget = {
  type: "git-status",
  category: "git",
  displayName: "Git Status",
  description: "Git 文件变更统计",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const cwd = ctx.data.cwd || ctx.data.workspace?.current_dir;
    const status = getGitStatus(cwd);
    if (!status) return null;

    const parts: string[] = [];
    if (status.staged > 0) parts.push(colorize(`+${status.staged}`, "green"));
    if (status.unstaged > 0) parts.push(colorize(`~${status.unstaged}`, "yellow"));
    if (status.untracked > 0) parts.push(colorize(`?${status.untracked}`, "gray"));
    if (status.ahead > 0) parts.push(colorize(`↑${status.ahead}`, "cyan"));
    if (status.behind > 0) parts.push(colorize(`↓${status.behind}`, "red"));

    if (parts.length === 0) return null;
    return parts.join(" ");
  },
};
