import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

function formatSpeed(tokensPerSec: number): string {
  if (tokensPerSec >= 1000) return (tokensPerSec / 1000).toFixed(1) + "k/s";
  return Math.round(tokensPerSec) + "/s";
}

export const InputSpeedWidget: Widget = {
  type: "input-speed",
  category: "tokens",
  displayName: "Input Speed",
  description: "输入 token 速度 (tok/s)",
  defaultColor: "cyan",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    // 优先用窗口速度，fallback 到会话平均
    const windowSec = (item.metadata?.window as number) || (item.metadata?.windowSeconds as number) || 60;
    let speed: number | null = null;

    if (ctx.windowedSpeedMetrics && windowSec > 0) {
      const windowData = ctx.windowedSpeedMetrics[String(windowSec)];
      if (windowData) speed = windowData.inputTokensPerSecond;
    }
    if (speed == null && ctx.speedMetrics) {
      speed = ctx.speedMetrics.inputTokensPerSecond;
    }
    if (speed == null) return null;
    return colorize(formatSpeed(speed), item.color || this.defaultColor, item.bold);
  },
};
