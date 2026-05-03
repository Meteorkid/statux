import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { execSync } from "child_process";

function countOutput(cmd: string, cwd: string): number {
  try {
    const output = execSync(cmd, { encoding: "utf-8", cwd, timeout: 3000 }).trim();
    if (!output) return 0;
    return output.split("\n").filter((l) => l.trim()).length;
  } catch {
    return 0;
  }
}

export const GitStagedFilesWidget: Widget = {
  type: "git-staged-files",
  category: "git",
  displayName: "Git Staged Files",
  description: "已暂存文件数",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const count = countOutput("git diff --cached --name-only", ctx.data.cwd || process.cwd());
    if (count === 0) return null;
    return colorize(`S:${count}`, item.color || this.defaultColor, item.bold);
  },
};

export const GitUnstagedFilesWidget: Widget = {
  type: "git-unstaged-files",
  category: "git",
  displayName: "Git Unstaged Files",
  description: "未暂存文件数",
  defaultColor: "yellow",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const count = countOutput("git diff --name-only", ctx.data.cwd || process.cwd());
    if (count === 0) return null;
    return colorize(`U:${count}`, item.color || this.defaultColor, item.bold);
  },
};

export const GitUntrackedFilesWidget: Widget = {
  type: "git-untracked-files",
  category: "git",
  displayName: "Git Untracked Files",
  description: "未跟踪文件数",
  defaultColor: "gray",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const count = countOutput("git ls-files --others --exclude-standard", ctx.data.cwd || process.cwd());
    if (count === 0) return null;
    return colorize(`?${count}`, item.color || this.defaultColor, item.bold);
  },
};

export const GitCleanStatusWidget: Widget = {
  type: "git-clean-status",
  category: "git",
  displayName: "Git Clean Status",
  description: "工作区清洁状态 (clean/dirty)",
  defaultColor: "green",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const cwd = ctx.data.cwd || process.cwd();
    try {
      const status = execSync("git status --porcelain", { encoding: "utf-8", cwd, timeout: 3000 }).trim();
      const isClean = status.length === 0;
      const text = isClean ? "✓ clean" : "✗ dirty";
      return colorize(text, item.color || (isClean ? "green" : "red"), item.bold);
    } catch {
      return null;
    }
  },
};
