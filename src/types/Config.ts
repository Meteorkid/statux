import { z } from "zod";

const WidgetItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  color: z.string().optional(),
  backgroundColor: z.string().optional(),
  bold: z.boolean().optional(),
  rawValue: z.boolean().optional(),
  hide: z.boolean().optional(),
  maxWidth: z.number().optional(),
  merge: z.union([z.boolean(), z.literal("no-padding")]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const PowerlineConfigSchema = z.object({
  separator: z.string().default(""),
  thinSeparator: z.string().default(""),
  capStart: z.string().optional(),
  capEnd: z.string().optional(),
});

export const ConfigSchema = z.object({
  version: z.number().default(1),
  lines: z.array(z.array(WidgetItemSchema)).default([]),
  renderMode: z.enum(["normal", "powerline"]).default("normal"),
  powerline: PowerlineConfigSchema.optional(),
  colorLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).default(3),
  globalBold: z.boolean().default(false),
  minimalistMode: z.boolean().default(false),
});

export type Config = z.infer<typeof ConfigSchema>;
export type WidgetItemConfig = z.infer<typeof WidgetItemSchema>;
