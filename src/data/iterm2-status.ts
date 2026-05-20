import type { StatusJSON } from "../types/StatusJSON";
import type { TokenMetrics } from "../types/Widget";

export interface Iterm2StatusPayload {
  model: string;
  ctxPct: number | null;
  cost: string | null;
  rateLimit: number | null;
  tokens: { in: number; out: number } | null;
}

function getModelName(data: StatusJSON): string {
  if (typeof data.model === "string") return data.model;
  return data.model?.display_name || data.model?.id || "";
}

function getContextPct(data: StatusJSON): number | null {
  const cw = data.context_window;
  if (!cw) return null;
  const pct = cw.used_percentage ?? (cw.remaining_percentage != null ? 100 - cw.remaining_percentage : null);
  return pct != null ? Math.round(pct) : null;
}

export function buildIterm2StatusPayload(
  data: StatusJSON,
  tokenMetrics: TokenMetrics | null
): Iterm2StatusPayload {
  const cost = data.cost?.total_cost_usd ?? null;
  const rateLimit = data.rate_limits?.five_hour?.used_percentage ?? null;

  return {
    model: getModelName(data),
    ctxPct: getContextPct(data),
    cost: cost != null ? cost.toFixed(2) : null,
    rateLimit: rateLimit != null ? Math.round(rateLimit) : null,
    tokens: tokenMetrics ? { in: tokenMetrics.inputTokens, out: tokenMetrics.outputTokens } : null,
  };
}
