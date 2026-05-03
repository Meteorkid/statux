import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const GitStagedFilesWidget: Widget = {
  type: "git-staged-files",
  category: "git",
  displayName: "Git Staged Files",
  description: "已暂存文件数",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const info = ctx.gitInfo;
    if (!info || info.stagedFiles === 0) return null;
    return colorize(`S:${info.stagedFiles}`, item.color || this.defaultColor, item.bold);
  },
};

export const GitUnstagedFilesWidget: Widget = {
  type: "git-unstaged-files",
  category: "git",
  displayName: "Git Unstaged Files",
  description: "未暂存文件数",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const info = ctx.gitInfo;
    if (!info || info.unstagedFiles === 0) return null;
    return colorize(`U:${info.unstagedFiles}`, item.color || this.defaultColor, item.bold);
  },
};

export const GitUntrackedFilesWidget: Widget = {
  type: "git-untracked-files",
  category: "git",
  displayName: "Git Untracked Files",
  description: "未跟踪文件数",
  defaultColor: "gray",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const info = ctx.gitInfo;
    if (!info || info.untrackedFiles === 0) return null;
    return colorize(`?${info.untrackedFiles}`, item.color || this.defaultColor, item.bold);
  },
};

export const GitCleanStatusWidget: Widget = {
  type: "git-clean-status",
  category: "git",
  displayName: "Git Clean Status",
  description: "工作区清洁状态 (clean/dirty)",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const info = ctx.gitInfo;
    if (!info) return null;
    const text = info.isClean ? "✓ clean" : "✗ dirty";
    return colorize(text, item.color || (info.isClean ? "green" : "red"), item.bold);
  },
};
