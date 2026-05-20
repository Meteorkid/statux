import { recordSession, getRecentSessions, getDailySummaries, getSummaryByModel } from "../data/history";
import type { RenderContext } from "../types/Widget";
import type { Tool } from "../types/Tool";

function getModelId(ctx: RenderContext): string | undefined {
  return typeof ctx.data.model === "string" ? ctx.data.model : ctx.data.model?.id;
}

export function recordRenderContextSession(
  ctx: RenderContext,
  fallbackId: string,
  fallbackTool: Tool
): void {
  try {
    recordSession({
      id: ctx.data.session_id || fallbackId,
      tool: ctx.tool || fallbackTool,
      model: getModelId(ctx),
      project: ctx.data.cwd || ctx.data.workspace?.current_dir,
      tokenMetrics: ctx.tokenMetrics,
      endedAt: Date.now(),
    });
  } catch {
    // 记录失败不影响主流程
  }
}

function formatTokenCount(totalTokens: number): string {
  if (totalTokens >= 1_000_000) return `${(totalTokens / 1_000_000).toFixed(1)}M`;
  if (totalTokens >= 1_000) return `${(totalTokens / 1_000).toFixed(1)}K`;
  return String(totalTokens);
}

function formatCost(costUsd: number): string {
  return costUsd < 0.01 ? "<$0.01" : `$${costUsd.toFixed(2)}`;
}

/** 打印会话历史 */
export function printHistory(days: number): void {
  console.log(`\n📊 statux — 最近 ${days} 天用量统计\n`);

  const daily = getDailySummaries(days);
  if (daily.length > 0) {
    console.log("日期         会话数   Token        费用");
    console.log("─".repeat(50));
    for (const d of daily) {
      console.log(
        `${d.date}    ${String(d.sessionCount).padStart(4)}    ${formatTokenCount(d.totalTokens).padStart(10)}    ${formatCost(d.totalCostUsd).padStart(8)}`
      );
    }
    console.log("");
  } else {
    console.log("  暂无历史记录\n");
  }

  const byModel = getSummaryByModel(days);
  if (byModel.length > 0) {
    console.log("模型                          会话数     费用");
    console.log("─".repeat(50));
    for (const m of byModel.slice(0, 10)) {
      const name = m.model.length > 28 ? m.model.slice(0, 25) + "..." : m.model;
      console.log(`${name.padEnd(28)} ${String(m.sessionCount).padStart(5)}    ${formatCost(m.totalCostUsd).padStart(8)}`);
    }
    console.log("");
  }

  const recent = getRecentSessions(10);
  if (recent.length > 0) {
    console.log("最近会话:");
    console.log("工具          模型                          Token      费用");
    console.log("─".repeat(65));
    for (const s of recent) {
      const model = (s.model ?? "unknown").slice(0, 28);
      console.log(
        `${s.tool.padEnd(12)} ${model.padEnd(28)} ${formatTokenCount(s.tokenMetrics?.totalTokens ?? 0).padStart(10)} ${formatCost(s.costUsd ?? 0).padStart(8)}`
      );
    }
  }
}
