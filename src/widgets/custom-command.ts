import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { execSync } from "child_process";

export const CustomCommandWidget: Widget = {
  type: "custom-command",
  category: "custom",
  displayName: "Custom Command",
  description: "运行自定义命令并显示输出",
  defaultColor: "white",

  render(item: WidgetItem, _ctx: RenderContext): string | null {
    const command = item.metadata?.command as string;
    if (!command) return null;

    try {
      const output = execSync(command, {
        encoding: "utf-8",
        timeout: (item.metadata?.timeout as number) || 5000,
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();

      if (!output) return null;

      const maxLen = (item.metadata?.maxLength as number) || 50;
      const truncated = output.length > maxLen ? output.slice(0, maxLen) + "…" : output;

      return colorize(truncated, item.color || this.defaultColor, item.bold);
    } catch {
      return null;
    }
  },
};
