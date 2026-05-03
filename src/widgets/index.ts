import { registerWidget } from "./registry";
import { ModelWidget } from "./model";
import { ContextBarWidget } from "./context-bar";
import { ContextPctWidget } from "./context-pct";
import { TokensWidget } from "./tokens";
import { GitBranchWidget } from "./git-branch";
import { GitStatusWidget } from "./git-status";
import { SessionClockWidget } from "./session-clock";
import { CostWidget } from "./cost";
import { RateLimitWidget } from "./rate-limit";
import { SeparatorWidget } from "./separator";
import { FlexSeparatorWidget } from "./flex-separator";
import { ThinkingEffortWidget } from "./thinking-effort";
import { CompactionWidget } from "./compaction";
import { OutputSpeedWidget, TotalSpeedWidget } from "./speed";
import { ToolCallsWidget } from "./tool-calls";
import { CustomCommandWidget } from "./custom-command";
import { SessionNameWidget } from "./session-name";

/** 注册所有内置 widget */
export function registerAllWidgets(): void {
  // Core
  registerWidget(ModelWidget);
  // Context
  registerWidget(ContextBarWidget);
  registerWidget(ContextPctWidget);
  // Tokens
  registerWidget(TokensWidget);
  registerWidget(OutputSpeedWidget);
  registerWidget(TotalSpeedWidget);
  // Git
  registerWidget(GitBranchWidget);
  registerWidget(GitStatusWidget);
  // Session
  registerWidget(SessionClockWidget);
  registerWidget(SessionNameWidget);
  registerWidget(CostWidget);
  registerWidget(RateLimitWidget);
  registerWidget(CompactionWidget);
  registerWidget(ToolCallsWidget);
  // Claude
  registerWidget(ThinkingEffortWidget);
  // Custom
  registerWidget(CustomCommandWidget);
  // Layout
  registerWidget(SeparatorWidget);
  registerWidget(FlexSeparatorWidget);
}

export { getWidget, getAllWidgets } from "./registry";
