import type { WidgetItem } from "../types/Widget";

const GIT_WIDGET_TYPES = new Set([
  "git-branch",
  "git-status",
  "git-changes",
  "git-insertions",
  "git-deletions",
  "git-staged-files",
  "git-unstaged-files",
  "git-untracked-files",
  "git-clean-status",
  "git-root-dir",
  "git-ahead-behind",
  "git-conflicts",
  "git-sha",
  "git-origin",
  "git-is-fork",
  "git-worktree",
  "git-pr",
]);

export interface WidgetRequirements {
  widgetTypes: Set<string>;
  needsGit: boolean;
  needsGitFork: boolean;
  needsGitPullRequest: boolean;
  needsJujutsu: boolean;
}

export function getWidgetTypes(lines: WidgetItem[][]): Set<string> {
  const types = new Set<string>();
  for (const line of lines) {
    for (const item of line) {
      if (!item.hide) types.add(item.type);
    }
  }
  return types;
}

export function getWidgetRequirements(lines: WidgetItem[][]): WidgetRequirements {
  const widgetTypes = getWidgetTypes(lines);
  const needsGit = Array.from(widgetTypes).some((type) => GIT_WIDGET_TYPES.has(type));
  const needsJujutsu = Array.from(widgetTypes).some((type) => type.startsWith("jj-"));

  return {
    widgetTypes,
    needsGit,
    needsGitFork: widgetTypes.has("git-is-fork"),
    needsGitPullRequest: widgetTypes.has("git-pr"),
    needsJujutsu,
  };
}
