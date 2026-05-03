import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { readFileSync, existsSync } from "fs";

interface SkillsMetrics {
  lastSkill: string | null;
  totalInvocations: number;
  uniqueSkills: string[];
}

function getSkillsMetrics(transcriptPath: string): SkillsMetrics {
  const result: SkillsMetrics = { lastSkill: null, totalInvocations: 0, uniqueSkills: [] };
  if (!existsSync(transcriptPath)) return result;

  try {
    const content = readFileSync(transcriptPath, "utf-8");
    const lines = content.split("\n").reverse();
    const seen = new Set<string>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed);
        if (entry.type === "assistant" && entry.message?.content) {
          for (const block of entry.message.content) {
            if (block.type === "tool_use" && block.name === "Skill") {
              const skillName = block.input?.skill as string;
              if (skillName) {
                if (!result.lastSkill) result.lastSkill = skillName;
                result.totalInvocations++;
                seen.add(skillName);
              }
            }
          }
        }
      } catch { /* skip */ }
    }

    result.uniqueSkills = Array.from(seen);
  } catch { /* skip */ }

  return result;
}

export const SkillsWidget: Widget = {
  type: "skills",
  category: "session",
  displayName: "Skills",
  description: "已调用的 Skills",
  defaultColor: "magenta",

  render(item: WidgetItem, ctx: RenderContext): string | null {
    const transcriptPath = ctx.data.transcript_path;
    if (!transcriptPath) return null;

    const metrics = getSkillsMetrics(transcriptPath);
    const mode = (item.metadata?.mode as string) || "count";

    switch (mode) {
      case "current":
      case "last":
        if (!metrics.lastSkill) return null;
        return colorize(metrics.lastSkill, item.color || this.defaultColor, item.bold);

      case "list": {
        if (metrics.uniqueSkills.length === 0) return null;
        const limit = (item.metadata?.limit as number) || 5;
        const list = metrics.uniqueSkills.slice(0, limit).join(",");
        return colorize(list, item.color || this.defaultColor, item.bold);
      }

      case "count":
      default: {
        if (metrics.totalInvocations === 0) return null;
        const hide = item.metadata?.hideWhenZero;
        if (hide && metrics.totalInvocations === 0) return null;
        return colorize(
          `${metrics.totalInvocations} skill${metrics.totalInvocations > 1 ? "s" : ""}`,
          item.color || this.defaultColor,
          item.bold
        );
      }
    }
  },
};
