import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { execSync } from "child_process";
import { totalmem } from "os";

const CACHE_TTL_MS = 3000; // 3 秒缓存，内存变化慢

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return gb.toFixed(1) + "G";
}

let memCache: { data: { used: number; total: number } | null; expiresAt: number } | null = null;

function getMemoryInfo(): { used: number; total: number } | null {
  const now = Date.now();
  if (memCache && memCache.expiresAt > now) return memCache.data;

  let data: { used: number; total: number } | null = null;
  try {
    if (process.platform === "darwin") {
      const vmStat = execSync("vm_stat", { encoding: "utf-8", timeout: 2000 });
      const pageSize = parseInt(vmStat.match(/page size of (\d+)/)?.[1] || "16384");

      const parse = (label: string): number => {
        const match = vmStat.match(new RegExp(`${label}:?\\s+(\\d+)`));
        return match ? parseInt(match[1]!) * pageSize : 0;
      };

      const wired = parse("Pages wired down");
      const purgeable = parse("Pages purgeable");
      const compressor = parse("Pages occupied by compressor");
      const anonymous = parse("Anonymous pages");

      const appMemory = anonymous - purgeable;
      const used = appMemory + wired + compressor;
      const total = totalmem();
      data = { used: Math.max(0, used), total };
    } else {
      const total = totalmem();
      const { freemem } = require("os");
      data = { used: total - freemem(), total };
    }
  } catch {
    data = null;
  }

  memCache = { data, expiresAt: now + CACHE_TTL_MS };
  return data;
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
