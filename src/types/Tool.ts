import { getProcessList, processNameMatches } from "../utils/process";

/** 支持的 AI 工具 */
export type Tool = "claude-code" | "codex";

/** 检测当前活跃的 AI 工具进程（同时运行时优先 PID 更大的——更新启动的进程） */
export function detectActiveTool(): Tool | null {
  const processes = getProcessList();

  let maxClaudePid = 0;
  let maxCodexPid = 0;

  for (const proc of processes) {
    if (processNameMatches(proc.command, "claude") && !proc.command.includes("brew")) {
      if (proc.pid > maxClaudePid) maxClaudePid = proc.pid;
    }
    if (processNameMatches(proc.command, "codex") || proc.command.includes("Codex")) {
      if (proc.pid > maxCodexPid) maxCodexPid = proc.pid;
    }
  }

  if (maxClaudePid > 0 && maxCodexPid === 0) return "claude-code";
  if (maxCodexPid > 0 && maxClaudePid === 0) return "codex";
  if (maxClaudePid > 0 && maxCodexPid > 0) {
    // 同时运行时，PID 更大的通常是更晚启动的（更可能是当前活跃的）
    return maxClaudePid > maxCodexPid ? "claude-code" : "codex";
  }

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
