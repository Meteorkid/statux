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
import { JjBookmarksWidget, JjWorkspaceWidget, JjRootDirWidget, JjChangesWidget, JjInsertionsWidget, JjDeletionsWidget, JjDescriptionWidget, JjRevisionWidget } from "./jujutsu";

/** 注册所有内置 widget */
export function registerAllWidgets(): void {
  // Core
  registerWidget(ModelWidget);
  registerWidget(OutputStyleWidget);
  registerWidget(VersionWidget);
  registerWidget(SessionIdWidget);
  registerWidget(ThinkingEffortWidget);
  registerWidget(VimModeWidget);
  registerWidget(TerminalWidthWidget);
  registerWidget(FreeMemoryWidget);

  // Context
  registerWidget(ContextBarWidget);
  registerWidget(ContextPctWidget);
  registerWidget(ContextLengthWidget);
  registerWidget(ContextWindowWidget);
  registerWidget(ContextPctUsableWidget);
  registerWidget(CompactionWidget);

  // Tokens
  registerWidget(TokensWidget);
  registerWidget(TokensInputWidget);
  registerWidget(TokensOutputWidget);
  registerWidget(TokensCachedWidget);
  registerWidget(TokensTotalWidget);
  registerWidget(OutputSpeedWidget);
  registerWidget(TotalSpeedWidget);
  registerWidget(InputSpeedWidget);

  // Git
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

  // Session
  registerWidget(SessionClockWidget);
  registerWidget(SessionNameWidget);
  registerWidget(CostWidget);
  registerWidget(RateLimitWidget);
  registerWidget(ToolCallsWidget);
  registerWidget(AccountEmailWidget);
  registerWidget(SkillsWidget);

  // Usage
  registerWidget(BlockTimerWidget);
  registerWidget(RateLimitTimerWidget);
  registerWidget(SessionUsageWidget);
  registerWidget(WeeklyUsageWidget);
  registerWidget(WeeklyResetTimerWidget);

  // Custom
  registerWidget(CustomCommandWidget);
  registerWidget(CustomTextWidget);
  registerWidget(CustomSymbolWidget);
  registerWidget(LinkWidget);

  // Jujutsu
  registerWidget(JjBookmarksWidget);
  registerWidget(JjWorkspaceWidget);
  registerWidget(JjRootDirWidget);
  registerWidget(JjChangesWidget);
  registerWidget(JjInsertionsWidget);
  registerWidget(JjDeletionsWidget);
  registerWidget(JjDescriptionWidget);
  registerWidget(JjRevisionWidget);

  // Layout
  registerWidget(SeparatorWidget);
  registerWidget(FlexSeparatorWidget);
}

export { getWidget, getAllWidgets } from "./registry";
