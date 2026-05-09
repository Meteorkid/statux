import { execSync } from "child_process";

export interface ProcessInfo {
  pid: number;
  command: string;
}

/** 跨平台获取进程列表 */
export function getProcessList(): ProcessInfo[] {
  try {
    if (process.platform === "win32") {
      return getWindowsProcessList();
    }
    return getUnixProcessList();
  } catch {
    return [];
  }
}

/** 匹配进程名（跨平台） */
export function processNameMatches(command: string, name: string): boolean {
  const lower = command.toLowerCase();
  const target = name.toLowerCase();
  // Windows 上可能有 .exe 后缀
  return lower.includes(target) || lower.includes(`${target}.exe`);
}

function getUnixProcessList(): ProcessInfo[] {
  const output = execSync("ps aux", { encoding: "utf-8", timeout: 3000 });
  const result: ProcessInfo[] = [];

  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    // ps aux: USER PID %CPU %MEM ... COMMAND
    // parts[1] is PID, rest is command
    const pid = parseInt(parts[1] || "", 10);
    if (isNaN(pid)) continue;
    result.push({ pid, command: trimmed });
  }

  return result;
}

function getWindowsProcessList(): ProcessInfo[] {
  const output = execSync(
    'powershell -NoProfile -Command "Get-CimInstance Win32_Process | Select-Object ProcessId, CommandLine | ForEach-Object { $pid = $_.ProcessId; $cmd = $_.CommandLine ?? \\\"\\\"; Write-Output \\\"$pid|$cmd\\\" }"',
    { encoding: "utf-8", timeout: 5000 }
  );
  const result: ProcessInfo[] = [];

  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const pipeIdx = trimmed.indexOf("|");
    if (pipeIdx === -1) continue;
    const pid = parseInt(trimmed.slice(0, pipeIdx).trim(), 10);
    const command = trimmed.slice(pipeIdx + 1).trim();
    if (!isNaN(pid) && command) {
      result.push({ pid, command });
    }
  }

  return result;
}
