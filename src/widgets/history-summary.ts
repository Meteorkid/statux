/**
 * 会话历史汇总 Widget
 *
 * 显示今日和本周的 token 用量和费用汇总，
 * 数据来自本地 SQLite 历史记录。
 */

import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { getTodaySummary, getWeekSummary } from "../data/history";

export const HistoryTodayWidget: Widget = {
  type: "history-today",
  category: "history",
  displayName: "History Today",
  description: "今日 token 用量和费用汇总（来自本地历史记录）",
  defaultColor: "cyan",

  render(item: WidgetItem, _ctx: RenderContext): string | null {
    const summary = getTodaySummary();
    if (summary.sessionCount === 0) return null;

    const cost = summary.totalCostUsd < 0.01
      ? "<$0.01"
      : `$${summary.totalCostUsd.toFixed(2)}`;
    const tokens = formatTokenCount(summary.totalTokens);

    const display = `today: ${cost} (${tokens}, ${summary.sessionCount} sess)`;
    return colorize(display, item.color || this.defaultColor, item.bold);
  },
};

export const HistoryWeekWidget: Widget = {
  type: "history-week",
  category: "history",
  displayName: "History Week",
  description: "本周 token 用量和费用汇总（来自本地历史记录）",
  defaultColor: "magenta",

  render(item: WidgetItem, _ctx: RenderContext): string | null {
    const summary = getWeekSummary();
    if (summary.sessionCount === 0) return null;

    const cost = summary.totalCostUsd < 0.01
      ? "<$0.01"
      : `$${summary.totalCostUsd.toFixed(2)}`;
    const tokens = formatTokenCount(summary.totalTokens);

    const display = `week: ${cost} (${tokens}, ${summary.sessionCount} sess)`;
    return colorize(display, item.color || this.defaultColor, item.bold);
  },
};

export const HistoryCostWidget: Widget = {
  type: "history-cost",
  category: "history",
  displayName: "History Cost",
  description: "今日费用汇总（仅显示金额）",
  defaultColor: "green",

  render(item: WidgetItem, _ctx: RenderContext): string | null {
    const summary = getTodaySummary();
    if (summary.sessionCount === 0) return null;

    const cost = summary.totalCostUsd < 0.01
      ? "<$0.01"
      : `$${summary.totalCostUsd.toFixed(2)}`;

    return colorize(`hist: ${cost}`, item.color || this.defaultColor, item.bold);
  },
};

/** 格式化 token 数量（如 1234567 → "1.2M"） */
function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}
