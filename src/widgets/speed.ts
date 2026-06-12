import type { Widget, WidgetItem, RenderContext, SpeedMetrics } from "../types/Widget";
import { colorize } from "../render/ansi";

function formatSpeed(tokensPerSec: number): string {
  if (tokensPerSec >= 1000) return `${(tokensPerSec / 1000).toFixed(1)}k/s`;
  return `${Math.round(tokensPerSec)}/s`;
}

function resolveSpeed(sm: SpeedMetrics, windowed: Record<string, SpeedMetrics> | null, window: number | undefined, windowSeconds: number | undefined, direction: "total" | "input" | "output"): number {
  const w = window || windowSeconds;
  const src = w && windowed?.[String(w)] ? windowed[String(w)]! : sm;
  switch (direction) {
    case "input": return src.inputTokensPerSecond;
    case "output": return src.outputTokensPerSecond;
    default: return src.tokensPerSecond;
  }
}

export const OutputSpeedWidget: Widget = {
  type: "output-speed",
  category: "tokens",
  displayName: "Output Speed",
  description: "输出 token 速度",
  defaultColor: "cyan",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    if (!ctx.speedMetrics) return null;
    const window = item.metadata?.window as number | undefined;
    const windowSeconds = item.metadata?.windowSeconds as number | undefined;
    const speed = resolveSpeed(ctx.speedMetrics, ctx.windowedSpeedMetrics, window, windowSeconds, "output");
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
    if (!ctx.speedMetrics) return null;
    const window = item.metadata?.window as number | undefined;
    const windowSeconds = item.metadata?.windowSeconds as number | undefined;
    const speed = resolveSpeed(ctx.speedMetrics, ctx.windowedSpeedMetrics, window, windowSeconds, "total");
    return colorize(formatSpeed(speed), item.color || this.defaultColor, item.bold);
  },
};
