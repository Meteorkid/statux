import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const GitChangesWidget: Widget = {
  type: "git-changes",
  category: "git",
  displayName: "Git Changes",
  description: "总变更行数 (+/-)",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const info = ctx.gitInfo;
    if (!info) return null;
    const total = info.insertions + info.deletions;
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
    const info = ctx.gitInfo;
    if (!info || info.insertions === 0) return null;
    return colorize(`+${info.insertions}`, item.color || this.defaultColor, item.bold);
  },
};

export const GitDeletionsWidget: Widget = {
  type: "git-deletions",
  category: "git",
  displayName: "Git Deletions",
  description: "删除行数 (-)",
  defaultColor: "red",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const info = ctx.gitInfo;
    if (!info || info.deletions === 0) return null;
    return colorize(`-${info.deletions}`, item.color || this.defaultColor, item.bold);
  },
};
