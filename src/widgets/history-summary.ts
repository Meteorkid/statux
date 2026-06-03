/**
 * 会话历史汇总 Widget
 *
 * 显示今日和本周的 token 用量和费用汇总，
 * 数据来自本地 SQLite 历史记录。
 */

import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { getTodaySummary, getWeekSummary } from "../data/history";
import { formatTokens } from "./format-utils";
import type { SessionSummary } from "../data/history";

// TTL 缓存：避免每次 render 都查 SQLite
const CACHE_TTL_MS = 10_000;
let todayCache: { data: SessionSummary; expiresAt: number } | null = null;
let weekCache: { data: SessionSummary; expiresAt: number } | null = null;

function cachedTodaySummary(): SessionSummary {
  const now = Date.now();
  if (todayCache && todayCache.expiresAt > now) return todayCache.data;
  const data = getTodaySummary();
  todayCache = { data, expiresAt: now + CACHE_TTL_MS };
  return data;
}

function cachedWeekSummary(): SessionSummary {
  const now = Date.now();
  if (weekCache && weekCache.expiresAt > now) return weekCache.data;
  const data = getWeekSummary();
  weekCache = { data, expiresAt: now + CACHE_TTL_MS };
  return data;
}

export const HistoryTodayWidget: Widget = {
  type: "history-today",
  category: "history",
  displayName: "History Today",
  description: "今日 token 用量和费用汇总（来自本地历史记录）",
  defaultColor: "cyan",

  render(item: WidgetItem, _ctx: RenderContext): string | null {
    const summary = cachedTodaySummary();
    if (summary.sessionCount === 0) return null;

    const cost = summary.totalCostUsd < 0.01
      ? "<$0.01"
      : `$${summary.totalCostUsd.toFixed(2)}`;
    const tokens = formatTokens(summary.totalTokens);

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
    const summary = cachedWeekSummary();
    if (summary.sessionCount === 0) return null;

    const cost = summary.totalCostUsd < 0.01
      ? "<$0.01"
      : `$${summary.totalCostUsd.toFixed(2)}`;
    const tokens = formatTokens(summary.totalTokens);

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
    const summary = cachedTodaySummary();
    if (summary.sessionCount === 0) return null;

    const cost = summary.totalCostUsd < 0.01
      ? "<$0.01"
      : `$${summary.totalCostUsd.toFixed(2)}`;

    return colorize(`hist: ${cost}`, item.color || this.defaultColor, item.bold);
  },
};

// 使用共享的 formatTokens 代替本地 formatTokenCount
