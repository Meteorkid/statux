import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const GitBranchWidget: Widget = {
  type: "git-branch",
  category: "git",
  displayName: "Git Branch",
  description: "当前 Git 分支名",
  defaultColor: "magenta",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const info = ctx.gitInfo;
    if (!info?.branch) return null;

    // 如果有 worktree 信息，优先使用
    const wt = ctx.data.worktree;
    const displayBranch = wt?.branch || info.branch;

    return colorize(displayBranch, item.color || this.defaultColor, item.bold);
  },
};
