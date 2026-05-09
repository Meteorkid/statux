import { execSync } from "child_process";

/** 支持的 AI 工具 */
export type Tool = "claude-code" | "codex";

/** 检测当前活跃的 AI 工具进程 */
export function detectActiveTool(): Tool | null {
  try {
    const ps = execSync("ps aux", { encoding: "utf-8", timeout: 3000 });

    const hasClaude = /\bclaude\b(?!.*brew)/.test(ps);
    const hasCodex = /\/Codex\.app\/Contents\/MacOS\/Codex\b/.test(ps);

    if (hasClaude && !hasCodex) return "claude-code";
    if (hasCodex && !hasClaude) return "codex";
    if (hasClaude && hasCodex) return "claude-code"; // 优先 Claude Code

    return null;
  } catch {
    return null;
  }
}

/** 查找指定工具的最新进程 PID */
export function findToolProcess(tool: Tool): number | null {
  try {
    const ps = execSync("ps aux", { encoding: "utf-8", timeout: 3000 });
    const lines = ps.split("\n");

    const patterns: Record<Tool, RegExp> = {
      "claude-code": /\bclaude\b(?!.*brew)/,
      codex: /\/Codex\.app\/Contents\/MacOS\/Codex\b/,
    };

    for (const line of lines) {
      const match = patterns[tool];
      if (match.test(line)) {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[1] || "", 10);
        if (!isNaN(pid)) return pid;
      }
    }
  } catch {}

  return null;
}
