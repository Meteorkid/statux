import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { execSync } from "child_process";
import { totalmem } from "os";

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return gb.toFixed(1) + "G";
}

function getMemoryInfo(): { used: number; total: number } | null {
  try {
    if (process.platform === "darwin") {
      const vmStat = execSync("vm_stat", { encoding: "utf-8", timeout: 2000 });
      const pageSize = parseInt(vmStat.match(/page size of (\d+)/)?.[1] || "16384");

      const parse = (label: string): number => {
        const match = vmStat.match(new RegExp(`${label}:?\\s+(\\d+)`));
        return match ? parseInt(match[1]!) * pageSize : 0;
      };

      // 对齐 macOS 活动监视器的计算方式
      // App Memory  = Anonymous - Purgeable
      // Memory Used = App Memory + Wired + Compressor
      const wired = parse("Pages wired down");
      const purgeable = parse("Pages purgeable");
      const compressor = parse("Pages occupied by compressor");
      const anonymous = parse("Anonymous pages");

      const appMemory = anonymous - purgeable;
      const used = appMemory + wired + compressor;
      const total = totalmem();

      return { used: Math.max(0, used), total };
    }

    // Linux/其他
    const total = totalmem();
    const { freemem } = require("os");
    return { used: total - freem(), total };
  } catch {
    return null;
  }
}

export const FreeMemoryWidget: Widget = {
  type: "free-memory",
  category: "core",
  displayName: "Free Memory",
  description: "内存使用 (已用/总量，对齐活动监视器)",
  defaultColor: "yellow",

  render(item: WidgetItem, _ctx: RenderContext): string | null {
    const info = getMemoryInfo();
    if (!info) return null;

    const text = `Mem:${formatBytes(info.used)}/${formatBytes(info.total)}`;
    return colorize(text, item.color || this.defaultColor, item.bold);
  },
};
