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

/** 注册所有内置 widget */
export function registerAllWidgets(): void {
  registerWidget(ModelWidget);
  registerWidget(ContextBarWidget);
  registerWidget(ContextPctWidget);
  registerWidget(TokensWidget);
  registerWidget(GitBranchWidget);
  registerWidget(GitStatusWidget);
  registerWidget(SessionClockWidget);
  registerWidget(CostWidget);
  registerWidget(RateLimitWidget);
  registerWidget(SeparatorWidget);
  registerWidget(FlexSeparatorWidget);
}

export { getWidget, getAllWidgets } from "./registry";
