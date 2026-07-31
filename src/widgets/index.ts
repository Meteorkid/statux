import { registerWidget } from "./registry";
import { ModelWidget } from "./model";
import { ContextBarWidget } from "./context-bar";
import { ContextPctWidget } from "./context-pct";
import { ContextLengthWidget, ContextWindowWidget, ContextPctUsableWidget } from "./context-detail";
import { TokensWidget } from "./tokens";
import { TokensInputWidget, TokensOutputWidget, TokensCachedWidget, TokensTotalWidget } from "./tokens-detail";
import { OutputSpeedWidget, TotalSpeedWidget } from "./speed";
import { InputSpeedWidget } from "./input-speed";
import { GitBranchWidget } from "./git-branch";
import { GitStatusWidget } from "./git-status";
import { GitChangesWidget, GitInsertionsWidget, GitDeletionsWidget } from "./git-changes";
import { GitStagedFilesWidget, GitUnstagedFilesWidget, GitUntrackedFilesWidget, GitCleanStatusWidget } from "./git-file-counts";
import { GitRootDirWidget, GitAheadBehindWidget, GitConflictsWidget, GitShaWidget, GitOriginWidget, GitIsForkWidget, GitWorktreeWidget, GitPrWidget } from "./git-advanced";
import { SessionClockWidget } from "./session-clock";
import { SessionNameWidget } from "./session-name";
import { CostWidget } from "./cost";
import { RateLimitWidget } from "./rate-limit";
import { RateLimitTimerWidget, BlockTimerWidget } from "./usage";
import { SessionUsageWidget } from "./session-usage";
import { WeeklyUsageWidget } from "./weekly-usage";
import { WeeklyResetTimerWidget } from "./weekly-reset-timer";
import { SeparatorWidget } from "./separator";
import { FlexSeparatorWidget } from "./flex-separator";
import { ThinkingEffortWidget } from "./thinking-effort";
import { CompactionWidget } from "./compaction";
import { ToolCallsWidget } from "./tool-calls";
import { CustomCommandWidget } from "./custom-command";
import { OutputStyleWidget } from "./output-style";
import { VersionWidget } from "./version";
import { SessionIdWidget } from "./session-id";
import { VimModeWidget } from "./vim-mode";
import { TerminalWidthWidget } from "./terminal-width";
import { FreeMemoryWidget } from "./free-memory";
import { AccountEmailWidget } from "./account-email";
import { SkillsWidget } from "./skills";
import { LinkWidget } from "./link";
import { CustomTextWidget, CustomSymbolWidget } from "./custom-text";
import { ToolIndicatorWidget } from "./tool-indicator";
import { JjBookmarksWidget, JjWorkspaceWidget, JjRootDirWidget, JjChangesWidget, JjInsertionsWidget, JjDeletionsWidget, JjDescriptionWidget, JjRevisionWidget } from "./jujutsu";
import { HistoryTodayWidget, HistoryWeekWidget, HistoryCostWidget } from "./history-summary";
import { CostRateWidget, TokenRateWidget, SessionEfficiencyWidget } from "./efficiency";

/** 注册所有内置 widget（72 个：Core 9 + Context 6 + Tokens 8 + Git 17 + Session 7 + Usage 5 + Custom 4 + Jujutsu 8 + History 3 + Efficiency 3 + Layout 2） */
export function registerAllWidgets(): void {
  // === Core (9) ===
  registerWidget(ModelWidget);
  registerWidget(ToolIndicatorWidget);
  registerWidget(OutputStyleWidget);
  registerWidget(VersionWidget);
  registerWidget(SessionIdWidget);
  registerWidget(ThinkingEffortWidget);
  registerWidget(VimModeWidget);
  registerWidget(TerminalWidthWidget);
  registerWidget(FreeMemoryWidget);

  // === Context (6) ===
  registerWidget(ContextBarWidget);
  registerWidget(ContextPctWidget);
  registerWidget(ContextLengthWidget);
  registerWidget(ContextWindowWidget);
  registerWidget(ContextPctUsableWidget);
  registerWidget(CompactionWidget);

  // === Tokens & Speed (8) ===
  registerWidget(TokensWidget);
  registerWidget(TokensInputWidget);
  registerWidget(TokensOutputWidget);
  registerWidget(TokensCachedWidget);
  registerWidget(TokensTotalWidget);
  registerWidget(OutputSpeedWidget);
  registerWidget(TotalSpeedWidget);
  registerWidget(InputSpeedWidget);

  // === Git (17) ===
  registerWidget(GitBranchWidget);
  registerWidget(GitStatusWidget);
  registerWidget(GitChangesWidget);
  registerWidget(GitInsertionsWidget);
  registerWidget(GitDeletionsWidget);
  registerWidget(GitStagedFilesWidget);
  registerWidget(GitUnstagedFilesWidget);
  registerWidget(GitUntrackedFilesWidget);
  registerWidget(GitCleanStatusWidget);
  registerWidget(GitRootDirWidget);
  registerWidget(GitAheadBehindWidget);
  registerWidget(GitConflictsWidget);
  registerWidget(GitShaWidget);
  registerWidget(GitOriginWidget);
  registerWidget(GitIsForkWidget);
  registerWidget(GitWorktreeWidget);
  registerWidget(GitPrWidget);

  // === Session (7) ===
  registerWidget(SessionClockWidget);
  registerWidget(SessionNameWidget);
  registerWidget(CostWidget);
  registerWidget(RateLimitWidget);
  registerWidget(ToolCallsWidget);
  registerWidget(AccountEmailWidget);
  registerWidget(SkillsWidget);

  // === Usage (5) ===
  registerWidget(BlockTimerWidget);
  registerWidget(RateLimitTimerWidget);
  registerWidget(SessionUsageWidget);
  registerWidget(WeeklyUsageWidget);
  registerWidget(WeeklyResetTimerWidget);

  // === Custom (4) ===
  registerWidget(CustomCommandWidget);
  registerWidget(CustomTextWidget);
  registerWidget(CustomSymbolWidget);
  registerWidget(LinkWidget);

  // === Jujutsu (8) ===
  registerWidget(JjBookmarksWidget);
  registerWidget(JjWorkspaceWidget);
  registerWidget(JjRootDirWidget);
  registerWidget(JjChangesWidget);
  registerWidget(JjInsertionsWidget);
  registerWidget(JjDeletionsWidget);
  registerWidget(JjDescriptionWidget);
  registerWidget(JjRevisionWidget);

  // === History (3) ===
  registerWidget(HistoryTodayWidget);
  registerWidget(HistoryWeekWidget);
  registerWidget(HistoryCostWidget);

  // === Efficiency (3) ===
  registerWidget(CostRateWidget);
  registerWidget(TokenRateWidget);
  registerWidget(SessionEfficiencyWidget);

  // === Layout (2) ===
  registerWidget(SeparatorWidget);
  registerWidget(FlexSeparatorWidget);
}

export { getWidget, getAllWidgets } from "./registry";
