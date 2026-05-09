import { getProcessList, processNameMatches } from "../utils/process";

/** 支持的 AI 工具 */
export type Tool = "claude-code" | "codex";

/** 检测当前活跃的 AI 工具进程 */
export function detectActiveTool(): Tool | null {
  const processes = getProcessList();

  let hasClaude = false;
  let hasCodex = false;

  for (const proc of processes) {
    if (processNameMatches(proc.command, "claude") && !proc.command.includes("brew")) {
      hasClaude = true;
    }
    if (processNameMatches(proc.command, "codex") || proc.command.includes("Codex")) {
      hasCodex = true;
    }
  }

  if (hasClaude && !hasCodex) return "claude-code";
  if (hasCodex && !hasClaude) return "codex";
  if (hasClaude && hasCodex) return "claude-code"; // 优先 Claude Code

  return null;
}

/** 查找指定工具的最新进程 PID */
export function findToolProcess(tool: Tool): number | null {
  const processes = getProcessList();

  for (const proc of processes) {
    if (tool === "claude-code") {
      if (processNameMatches(proc.command, "claude") && !proc.command.includes("brew")) {
        return proc.pid;
      }
    }
    if (tool === "codex") {
      if (processNameMatches(proc.command, "codex") || proc.command.includes("Codex")) {
        return proc.pid;
      }
    }
  }

  return null;
}
