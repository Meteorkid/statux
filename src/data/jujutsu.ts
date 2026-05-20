import { execSync } from "child_process";
import type { JujutsuInfo } from "../types/Widget";

function jjExec(args: string, cwd?: string): string | null {
  try {
    return execSync(`jj ${args}`, {
      encoding: "utf-8",
      cwd,
      timeout: 800,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function parseStatNumber(output: string | null, kind: "insertion" | "deletion"): number {
  if (!output) return 0;
  const match = output.match(new RegExp(`(\\d+) ${kind}`));
  return match ? parseInt(match[1]!, 10) : 0;
}

export function collectJujutsuInfo(cwd?: string): JujutsuInfo | null {
  const root = jjExec("root", cwd);
  if (!root) return null;

  const bookmarkOutput = jjExec("bookmark list -T 'name ++ \" \"'", cwd);
  const diffStat = jjExec("diff --stat", cwd);
  const description = jjExec("log -r @ -T 'description.first_line()'", cwd);

  return {
    bookmarks: bookmarkOutput ? bookmarkOutput.split("\n").map((b) => b.trim()).filter(Boolean) : [],
    workspace: jjExec("workspace list -T 'name'", cwd),
    rootDir: root.split("/").pop() || root,
    changes: diffStat ? diffStat.split("\n").at(-1) || null : null,
    insertions: parseStatNumber(diffStat, "insertion"),
    deletions: parseStatNumber(diffStat, "deletion"),
    description,
    revision: jjExec("log -r @ -T 'change_id.shortest(8)'", cwd),
  };
}
