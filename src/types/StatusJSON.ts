import { z } from "zod";

// 数值字段可能以字符串形式到达，统一转为 number
const CoercedNumber = z.preprocess((val) => {
  if (typeof val === "string") {
    const trimmed = val.trim();
    const num = Number(trimmed);
    if (!Number.isNaN(num)) return num;
  }
  return val;
}, z.number());

const OptionalCoercedNumber = z.preprocess((val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    const num = Number(trimmed);
    if (!Number.isNaN(num)) return num;
  }
  return val;
}, z.number().nullable());

// model 可以是字符串或对象
const ModelSchema = z.union([
  z.string(),
  z.object({
    id: z.string().optional(),
    display_name: z.string().optional(),
  }),
]);

const ContextWindowSchema = z.object({
  context_window_size: OptionalCoercedNumber.optional(),
  total_input_tokens: OptionalCoercedNumber.optional(),
  total_output_tokens: OptionalCoercedNumber.optional(),
  current_usage: z
    .union([
      CoercedNumber,
      z.object({
        input_tokens: z.number().optional(),
        output_tokens: z.number().optional(),
        cache_creation_input_tokens: z.number().optional(),
        cache_read_input_tokens: z.number().optional(),
      }),
    ])
    .nullable()
    .optional(),
  used_percentage: OptionalCoercedNumber.optional(),
  remaining_percentage: OptionalCoercedNumber.optional(),
});

const CostSchema = z.object({
  total_cost_usd: z.number().optional(),
  total_duration_ms: z.number().optional(),
  total_api_duration_ms: z.number().optional(),
  total_lines_added: z.number().optional(),
  total_lines_removed: z.number().optional(),
});

const RateLimitInfoSchema = z.object({
  used_percentage: OptionalCoercedNumber.optional(),
  resets_at: OptionalCoercedNumber.optional(),
});

const RateLimitsSchema = z.object({
  five_hour: RateLimitInfoSchema.optional(),
  seven_day: RateLimitInfoSchema.optional(),
});

const EffortSchema = z
  .object({
    level: z.string().nullable().optional(),
  })
  .nullable();

const VimSchema = z
  .object({
    mode: z.string().optional(),
  })
  .nullable();

const WorktreeSchema = z
  .object({
    name: z.string().optional(),
    path: z.string().optional(),
    branch: z.string().optional(),
    original_cwd: z.string().optional(),
    original_branch: z.string().optional(),
  })
  .nullable();

const OutputStyleSchema = z.object({
  name: z.string().optional(),
});

const WorkspaceSchema = z.object({
  current_dir: z.string().optional(),
  project_dir: z.string().optional(),
});

// 完整的 StatusJSON schema — 使用 looseObject 允许额外字段
export const StatusJSONSchema = z.looseObject({
  hook_event_name: z.string().optional(),
  session_id: z.string().optional(),
  transcript_path: z.string().optional(),
  cwd: z.string().optional(),
  model: ModelSchema.optional(),
  workspace: WorkspaceSchema.optional(),
  version: z.string().optional(),
  output_style: OutputStyleSchema.optional(),
  effort: EffortSchema.optional(),
  cost: CostSchema.optional(),
  context_window: ContextWindowSchema.nullable().optional(),
  vim: VimSchema.optional(),
  worktree: WorktreeSchema.optional(),
  rate_limits: RateLimitsSchema.nullable().optional(),
});

export type StatusJSON = z.infer<typeof StatusJSONSchema>;
