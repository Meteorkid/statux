import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const GitRootDirWidget: Widget = {
  type: "git-root-dir",
  category: "git",
  displayName: "Git Root Dir",
  description: "Git 仓库根目录",
  defaultColor: "blue",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const info = ctx.gitInfo;
    if (!info?.rootDir) return null;
    return colorize(info.rootDir, item.color || this.defaultColor, item.bold);
  },
};

export const GitAheadBehindWidget: Widget = {
  type: "git-ahead-behind",
  category: "git",
  displayName: "Git Ahead/Behind",
  description: "相对 upstream 的 ahead/behind",
  defaultColor: "cyan",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const info = ctx.gitInfo;
    if (!info || (info.ahead === 0 && info.behind === 0)) return null;

    const parts: string[] = [];
    if (info.ahead > 0) parts.push(`↑${info.ahead}`);
    if (info.behind > 0) parts.push(`↓${info.behind}`);
    return colorize(parts.join(" "), item.color || this.defaultColor, item.bold);
  },
};

export const GitConflictsWidget: Widget = {
  type: "git-conflicts",
  category: "git",
  displayName: "Git Conflicts",
  description: "冲突文件数",
  defaultColor: "red",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const info = ctx.gitInfo;
    if (!info || info.conflicts === 0) return null;
    return colorize(`⚡${info.conflicts}`, item.color || this.defaultColor, item.bold);
  },
};

export const GitShaWidget: Widget = {
  type: "git-sha",
  category: "git",
  displayName: "Git SHA",
  description: "当前 commit SHA",
  defaultColor: "gray",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const info = ctx.gitInfo;
    if (!info?.sha) return null;
    return colorize(info.sha, item.color || this.defaultColor, item.bold);
  },
};

export const GitOriginWidget: Widget = {
  type: "git-origin",
  category: "git",
  displayName: "Git Origin",
  description: "origin 远程地址 (owner/repo)",
  defaultColor: "blue",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const info = ctx.gitInfo;
    if (!info?.origin) return null;

    const format = (item.metadata?.format as string) || "owner/repo";
    const parts = info.origin.split("/");
    const owner = parts[0];
    const repo = parts[1];

    let text: string;
    switch (format) {
      case "owner": text = owner!; break;
      case "repo": text = repo!; break;
      default: text = info.origin; break;
    }
    return colorize(text, item.color || this.defaultColor, item.bold);
  },
};

export const GitIsForkWidget: Widget = {
  type: "git-is-fork",
  category: "git",
  displayName: "Git Is Fork",
  description: "是否为 fork 仓库",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (!ctx.gitInfo?.isFork) return null;
    return colorize("fork", item.color || this.defaultColor, item.bold);
  },
};

export const GitWorktreeWidget: Widget = {
  type: "git-worktree",
  category: "git",
  displayName: "Git Worktree",
  description: "当前 worktree 名称",
  defaultColor: "magenta",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const info = ctx.gitInfo;
    if (!info?.worktree) return null;
    return colorize(info.worktree, item.color || this.defaultColor, item.bold);
  },
};

export const GitPrWidget: Widget = {
  type: "git-pr",
  category: "git",
  displayName: "Git PR",
  description: "当前分支的 Pull Request 链接",
  defaultColor: "cyan",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const output = ctx.gitInfo?.pullRequest;
    if (output) return colorize(output, item.color || this.defaultColor, item.bold);

    return null;
  },
};
