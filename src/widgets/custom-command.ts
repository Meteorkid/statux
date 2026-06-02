import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { execSync } from "child_process";

// 命令输出缓存：避免每次渲染都执行 shell 命令
const cmdCache = new Map<string, { output: string | null; expiresAt: number }>();
const DEFAULT_CACHE_TTL_MS = 5000;

export const CustomCommandWidget: Widget = {
  type: "custom-command",
  category: "custom",
  displayName: "Custom Command",
  description: "运行自定义命令并显示输出",
  defaultColor: "white",

  render(item: WidgetItem, _ctx: RenderContext): string | null {
    const command = item.metadata?.command as string;
    if (!command) return null;

    const cacheTtl = (item.metadata?.cacheTtl as number) || DEFAULT_CACHE_TTL_MS;
    const now = Date.now();
    const cached = cmdCache.get(command);

    let output: string | null;
    if (cached && cached.expiresAt > now) {
      output = cached.output;
    } else {
      try {
        output = execSync(command, {
          encoding: "utf-8",
          timeout: (item.metadata?.timeout as number) || 5000,
          stdio: ["pipe", "pipe", "pipe"],
        }).trim() || null;
      } catch {
        output = null;
      }
      cmdCache.set(command, { output, expiresAt: now + cacheTtl });
    }

    if (!output) return null;

    const maxLen = (item.metadata?.maxLength as number) || 50;
    const truncated = output.length > maxLen ? output.slice(0, maxLen) + "…" : output;

    return colorize(truncated, item.color || this.defaultColor, item.bold);
  },
};
