import type { Widget, WidgetItem, RenderContext } from "../types/Widget";
import { colorize } from "../render/ansi";
import { readFileSync, existsSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const HOME = process.env.HOME || homedir();

// mtime 缓存：邮箱几乎不会变
let emailCache: { mtime: number; email: string | null } | null = null;

function getClaudeAccountEmail(): string | null {
  try {
    const configDir = process.env.CLAUDE_CONFIG_DIR || join(HOME, ".claude");
    const configPath = join(configDir, ".claude.json");
    if (!existsSync(configPath)) return null;

    const mtime = statSync(configPath).mtimeMs;
    if (emailCache && emailCache.mtime === mtime) return emailCache.email;

    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    const email = config?.oauthAccount?.emailAddress || null;
    emailCache = { mtime, email };
    return email;
  } catch {
    return null;
  }
}

export const AccountEmailWidget: Widget = {
  type: "account-email",
  category: "session",
  displayName: "Account Email",
  description: "Claude 账户邮箱",
  defaultColor: "gray",

  render(item: WidgetItem, _ctx: RenderContext): string | null {
    const email = getClaudeAccountEmail();
    if (!email) return null;
    const maxLen = (item.metadata?.maxLength as number) || 30;
    const display = email.length > maxLen ? email.slice(0, maxLen) + "…" : email;
    return colorize(display, item.color || this.defaultColor, item.bold);
  },
};
