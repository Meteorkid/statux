import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { execSync } from "child_process";

function jjExec(args: string, cwd: string): string | null {
  try {
    return execSync(`jj ${args}`, { encoding: "utf-8", cwd, timeout: 3000 }).trim();
  } catch {
    return null;
  }
}

function isInJjRepo(cwd: string): boolean {
  return jjExec("root", cwd) !== null;
}

export const JjBookmarksWidget: Widget = {
  type: "jj-bookmarks",
  category: "jujutsu",
  displayName: "Jj Bookmarks",
  description: "Jujutsu 书签列表",
  defaultColor: "cyan",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const cwd = ctx.data.cwd || process.cwd();
    if (!isInJjRepo(cwd)) return null;

    const output = jjExec("bookmark list -T 'name ++ \" \"'", cwd);
    if (!output) return null;
    const bookmarks = output.split("\n").filter((b) => b.trim());
    if (bookmarks.length === 0) return null;

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
    const cwd = ctx.data.cwd || process.cwd();
    const output = jjExec("workspace list -T 'name'", cwd);
    if (!output) return null;
    return colorize(output, item.color || this.defaultColor, item.bold);
  },
};

export const JjRootDirWidget: Widget = {
  type: "jj-root-dir",
  category: "jujutsu",
  displayName: "Jj Root Dir",
  description: "Jujutsu 仓库根目录",
  defaultColor: "blue",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const cwd = ctx.data.cwd || process.cwd();
    const root = jjExec("root", cwd);
    if (!root) return null;
    const name = root.split("/").pop() || root;
    return colorize(name, item.color || this.defaultColor, item.bold);
  },
};

export const JjChangesWidget: Widget = {
  type: "jj-changes",
  category: "jujutsu",
  displayName: "Jj Changes",
  description: "Jujutsu 变更数",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const cwd = ctx.data.cwd || process.cwd();
    const output = jjExec("diff --stat | tail -1", cwd);
    if (!output) return null;
    return colorize(output, item.color || this.defaultColor, item.bold);
  },
};

export const JjInsertionsWidget: Widget = {
  type: "jj-insertions",
  category: "jujutsu",
  displayName: "Jj Insertions",
  description: "Jujutsu 插入行数",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const cwd = ctx.data.cwd || process.cwd();
    const output = jjExec("diff --stat", cwd);
    if (!output) return null;
    const match = output.match(/(\d+) insertion/);
    if (!match) return null;
    return colorize(`+${match[1]}`, item.color || this.defaultColor, item.bold);
  },
};

export const JjDeletionsWidget: Widget = {
  type: "jj-deletions",
  category: "jujutsu",
  displayName: "Jj Deletions",
  description: "Jujutsu 删除行数",
  defaultColor: "red",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const cwd = ctx.data.cwd || process.cwd();
    const output = jjExec("diff --stat", cwd);
    if (!output) return null;
    const match = output.match(/(\d+) deletion/);
    if (!match) return null;
    return colorize(`-${match[1]}`, item.color || this.defaultColor, item.bold);
  },
};

export const JjDescriptionWidget: Widget = {
  type: "jj-description",
  category: "jujutsu",
  displayName: "Jj Description",
  description: "当前 revision 描述",
  defaultColor: "white",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const cwd = ctx.data.cwd || process.cwd();
    const output = jjExec("log -r @ -T 'description.first_line()'", cwd);
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
    const cwd = ctx.data.cwd || process.cwd();
    const output = jjExec("log -r @ -T 'change_id.shortest(8)'", cwd);
    if (!output) return null;
    return colorize(output, item.color || this.defaultColor, item.bold);
  },
};
