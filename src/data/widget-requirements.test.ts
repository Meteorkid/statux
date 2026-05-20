import { describe, expect, test } from "bun:test";
import { getWidgetRequirements } from "./widget-requirements";

describe("getWidgetRequirements", () => {
  test("detects expensive Git widgets independently", () => {
    const req = getWidgetRequirements([
      [
        { id: "branch", type: "git-branch" },
        { id: "fork", type: "git-is-fork" },
      ],
    ]);

    expect(req.needsGit).toBe(true);
    expect(req.needsGitFork).toBe(true);
    expect(req.needsGitPullRequest).toBe(false);
    expect(req.needsJujutsu).toBe(false);
  });

  test("ignores hidden widgets", () => {
    const req = getWidgetRequirements([
      [
        { id: "pr", type: "git-pr", hide: true },
        { id: "jj", type: "jj-bookmarks", hide: true },
      ],
    ]);

    expect(req.needsGit).toBe(false);
    expect(req.needsGitPullRequest).toBe(false);
    expect(req.needsJujutsu).toBe(false);
  });
});
