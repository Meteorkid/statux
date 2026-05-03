import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { execSync } from "child_process";
import { totalmem, freemem } from "os";

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return gb.toFixed(1) + "G";
}

function getMemoryInfo(): { used: number; total: number } | null {
  try {
    // macOS: 用 vm_stat 获取更准确的内存使用（Active + Wired）
    if (process.platform === "darwin") {
      const vmStat = execSync("vm_stat", { encoding: "utf-8", timeout: 2000 });
      const pageSize = 16384; // Apple Silicon page size
      const parse = (label: string): number => {
        const match = vmStat.match(new RegExp(`${label}:?\\s+(\\d+)`));
        return match ? parseInt(match[1]!) * pageSize : 0;
      };
      const active = parse("Pages active");
      const wired = parse("Pages wired down");
      const total = totalmem();
      return { used: active + wired, total };
    }

    // Linux/其他
    const total = totalmem();
    const free = freemem();
    return { used: total - free, total };
  } catch {
    return null;
  }
}

export const FreeMemoryWidget: Widget = {
  type: "free-memory",
  category: "core",
  displayName: "Free Memory",
  description: "内存使用 (已用/总量)",
  defaultColor: "yellow",

  render(item: WidgetItem, _ctx: RenderContext): string | null {
    const info = getMemoryInfo();
    if (!info) return null;

    const text = `Mem:${formatBytes(info.used)}/${formatBytes(info.total)}`;
    return colorize(text, item.color || this.defaultColor, item.bold);
  },
};
