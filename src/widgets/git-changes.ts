import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { execSync } from "child_process";

function getDiffStats(cwd: string): { insertions: number; deletions: number } | null {
  try {
    const output = execSync("git diff --shortstat HEAD", { encoding: "utf-8", cwd, timeout: 3000 }).trim();
    if (!output) return { insertions: 0, deletions: 0 };

    const insertMatch = output.match(/(\d+) insertion/);
    const deleteMatch = output.match(/(\d+) deletion/);
    return {
      insertions: insertMatch ? parseInt(insertMatch[1]!) : 0,
      deletions: deleteMatch ? parseInt(deleteMatch[1]!) : 0,
    };
  } catch {
    return null;
  }
}

export const GitChangesWidget: Widget = {
  type: "git-changes",
  category: "git",
  displayName: "Git Changes",
  description: "总变更行数 (+/-)",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const stats = getDiffStats(ctx.data.cwd || process.cwd());
    if (!stats) return null;
    const total = stats.insertions + stats.deletions;
    if (total === 0) return null;
    return colorize(`±${total}`, item.color || this.defaultColor, item.bold);
  },
};

export const GitInsertionsWidget: Widget = {
  type: "git-insertions",
  category: "git",
  displayName: "Git Insertions",
  description: "插入行数 (+)",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const stats = getDiffStats(ctx.data.cwd || process.cwd());
    if (!stats || stats.insertions === 0) return null;
    return colorize(`+${stats.insertions}`, item.color || this.defaultColor, item.bold);
  },
};

export const GitDeletionsWidget: Widget = {
  type: "git-deletions",
  category: "git",
  displayName: "Git Deletions",
  description: "删除行数 (-)",
  defaultColor: "red",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const stats = getDiffStats(ctx.data.cwd || process.cwd());
    if (!stats || stats.deletions === 0) return null;
    return colorize(`-${stats.deletions}`, item.color || this.defaultColor, item.bold);
  },
};
