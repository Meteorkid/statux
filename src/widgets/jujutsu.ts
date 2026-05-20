import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

export const JjBookmarksWidget: Widget = {
  type: "jj-bookmarks",
  category: "jujutsu",
  displayName: "Jj Bookmarks",
  description: "Jujutsu 书签列表",
  defaultColor: "cyan",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const bookmarks = ctx.jujutsuInfo?.bookmarks;
    if (!bookmarks || bookmarks.length === 0) return null;

    return colorize(bookmarks.join(","), item.color || this.defaultColor, item.bold);
  },
};

export const JjWorkspaceWidget: Widget = {
  type: "jj-workspace",
  category: "jujutsu",
  displayName: "Jj Workspace",
  description: "当前 Jujutsu 工作区",
  defaultColor: "blue",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const workspace = ctx.jujutsuInfo?.workspace;
    if (!workspace) return null;
    return colorize(workspace, item.color || this.defaultColor, item.bold);
  },
};

export const JjRootDirWidget: Widget = {
  type: "jj-root-dir",
  category: "jujutsu",
  displayName: "Jj Root Dir",
  description: "Jujutsu 仓库根目录",
  defaultColor: "blue",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const rootDir = ctx.jujutsuInfo?.rootDir;
    if (!rootDir) return null;
    return colorize(rootDir, item.color || this.defaultColor, item.bold);
  },
};

export const JjChangesWidget: Widget = {
  type: "jj-changes",
  category: "jujutsu",
  displayName: "Jj Changes",
  description: "Jujutsu 变更数",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const changes = ctx.jujutsuInfo?.changes;
    if (!changes) return null;
    return colorize(changes, item.color || this.defaultColor, item.bold);
  },
};

export const JjInsertionsWidget: Widget = {
  type: "jj-insertions",
  category: "jujutsu",
  displayName: "Jj Insertions",
  description: "Jujutsu 插入行数",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const insertions = ctx.jujutsuInfo?.insertions ?? 0;
    if (insertions === 0) return null;
    return colorize(`+${insertions}`, item.color || this.defaultColor, item.bold);
  },
};

export const JjDeletionsWidget: Widget = {
  type: "jj-deletions",
  category: "jujutsu",
  displayName: "Jj Deletions",
  description: "Jujutsu 删除行数",
  defaultColor: "red",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const deletions = ctx.jujutsuInfo?.deletions ?? 0;
    if (deletions === 0) return null;
    return colorize(`-${deletions}`, item.color || this.defaultColor, item.bold);
  },
};

export const JjDescriptionWidget: Widget = {
  type: "jj-description",
  category: "jujutsu",
  displayName: "Jj Description",
  description: "当前 revision 描述",
  defaultColor: "white",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const output = ctx.jujutsuInfo?.description;
    if (!output) return null;
    const maxLen = (item.metadata?.maxLength as number) || 40;
    const display = output.length > maxLen ? output.slice(0, maxLen) + "…" : output;
    return colorize(display, item.color || this.defaultColor, item.bold);
  },
};

export const JjRevisionWidget: Widget = {
  type: "jj-revision",
  category: "jujutsu",
  displayName: "Jj Revision",
  description: "当前 revision ID",
  defaultColor: "gray",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const revision = ctx.jujutsuInfo?.revision;
    if (!revision) return null;
    return colorize(revision, item.color || this.defaultColor, item.bold);
  },
};
