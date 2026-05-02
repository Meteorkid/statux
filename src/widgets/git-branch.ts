import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { getGitBranch } from "../data/git";

export const GitBranchWidget: Widget = {
  type: "git-branch",
  category: "git",
  displayName: "Git Branch",
  description: "当前 Git 分支名",
  defaultColor: "magenta",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const cwd = ctx.data.cwd || ctx.data.workspace?.current_dir;
    const branch = getGitBranch(cwd);
    if (!branch) return null;

    // 如果有 worktree 信息，优先使用
    const wt = ctx.data.worktree;
    const displayBranch = wt?.branch || branch;

    return colorize(displayBranch, item.color || this.defaultColor, item.bold);
  },
};
