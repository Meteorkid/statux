import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";

function formatSpeed(tokensPerSec: number): string {
  if (tokensPerSec >= 1000) return `${(tokensPerSec / 1000).toFixed(1)}k/s`;
  return `${Math.round(tokensPerSec)}/s`;
}

export const OutputSpeedWidget: Widget = {
  type: "output-speed",
  category: "tokens",
  displayName: "Output Speed",
  description: "输出 token 速度",
  defaultColor: "cyan",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const sm = ctx.speedMetrics;
    if (!sm) return null;

    // 检查是否有窗口速度
    const window = item.metadata?.window as number | undefined;
    let speed = sm.tokensPerSecond;
    if (window && ctx.windowedSpeedMetrics?.[String(window)]) {
      speed = ctx.windowedSpeedMetrics[String(window)]!.tokensPerSecond;
    }

    if (speed === 0) return null;
    const label = item.rawValue ? "" : "out-spd:";
    return colorize(`${label}${formatSpeed(speed)}`, item.color || this.defaultColor, item.bold);
  },
};

export const TotalSpeedWidget: Widget = {
  type: "total-speed",
  category: "tokens",
  displayName: "Total Speed",
  description: "总 token 速度",
  defaultColor: "cyan",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const sm = ctx.speedMetrics;
    if (!sm) return null;

    const window = item.metadata?.window as number | undefined;
    let speed = sm.tokensPerSecond;
    if (window && ctx.windowedSpeedMetrics?.[String(window)]) {
      speed = ctx.windowedSpeedMetrics[String(window)]!.tokensPerSecond;
    }

    if (speed === 0) return null;
    return colorize(formatSpeed(speed), item.color || this.defaultColor, item.bold);
  },
};
