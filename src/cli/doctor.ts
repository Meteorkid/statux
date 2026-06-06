import { existsSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { execSync } from "child_process";
import { ConfigSchema } from "../types/Config";
import {
  isCodexBridgeFresh,
  isCodexThreadFresh,
  readCodexBridgeData,
  readLatestCodexThread,
} from "../data/codex";

const HOME = process.env.HOME || homedir();

type CheckStatus = "ok" | "warn" | "fail";

interface DoctorCheck {
  status: CheckStatus;
  name: string;
  detail: string;
}

function checkConfig(): DoctorCheck {
  const path = join(HOME, ".config", "statux", "settings.json");
  if (!existsSync(path)) {
    return { status: "warn", name: "statux config", detail: "未找到配置文件，将使用默认配置" };
  }

  try {
    ConfigSchema.parse(JSON.parse(readFileSync(path, "utf-8")));
    return { status: "ok", name: "statux config", detail: path };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { status: "fail", name: "statux config", detail };
  }
}

function checkClaudeStatusLine(): DoctorCheck {
  // settings.local.json 会覆盖 settings.json，优先检查
  const localPath = join(HOME, ".claude", "settings.local.json");
  const globalPath = join(HOME, ".claude", "settings.json");

  for (const path of [localPath, globalPath]) {
    if (!existsSync(path)) continue;
    try {
      const settings = JSON.parse(readFileSync(path, "utf-8"));
      const command = settings?.statusLine?.command;
      const refreshInterval = settings?.statusLine?.refreshInterval;
      if (typeof command === "string" && command.includes("statux")) {
        const parts = [`command: ${command}`];
        if (!refreshInterval) parts.push("⚠ 缺少 refreshInterval（状态栏不会自动刷新）");
        else parts.push(`refreshInterval: ${refreshInterval}s`);
        return { status: refreshInterval ? "ok" : "warn", name: "Claude Code statusLine", detail: parts.join(" | ") };
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return { status: "fail", name: "Claude Code statusLine", detail: `${path}: ${detail}` };
    }
  }

  return { status: "warn", name: "Claude Code statusLine", detail: "statusLine 未指向 statux（检查了 settings.json 和 settings.local.json）" };
}

function checkBun(): DoctorCheck {
  try {
    const version = execSync("bun --version", { encoding: "utf-8", timeout: 3000 }).trim();
    const [major] = version.split(".").map(Number);
    if (major != null && major < 1) {
      return { status: "warn", name: "Bun runtime", detail: `v${version} (需要 >= 1.0)` };
    }
    return { status: "ok", name: "Bun runtime", detail: `v${version}` };
  } catch {
    // 尝试常见路径
    const commonPaths = ["/Users/meteor/.bun/bin/bun", "/usr/local/bin/bun", "/opt/homebrew/bin/bun"];
    for (const p of commonPaths) {
      if (existsSync(p)) {
        return { status: "ok", name: "Bun runtime", detail: `found at ${p} (不在 PATH 中)` };
      }
    }
    return { status: "fail", name: "Bun runtime", detail: "未找到 bun，请安装: curl -fsSL https://bun.sh/install | bash" };
  }
}

function checkCodexState(): DoctorCheck {
  const thread = readLatestCodexThread();
  const bridge = readCodexBridgeData();

  if (!thread && !bridge) {
    return { status: "warn", name: "Codex local state", detail: "未找到 Codex SQLite 线程或 statux bridge 数据" };
  }

  const freshParts: string[] = [];
  if (thread) freshParts.push(isCodexThreadFresh(thread) ? "SQLite fresh" : "SQLite stale");
  if (bridge) freshParts.push(isCodexBridgeFresh(bridge) ? "bridge fresh" : "bridge stale");

  const hasFresh = (thread && isCodexThreadFresh(thread)) || (bridge && isCodexBridgeFresh(bridge));
  return {
    status: hasFresh ? "ok" : "warn",
    name: "Codex local state",
    detail: freshParts.join(", "),
  };
}

function checkIterm2Plugin(): DoctorCheck {
  const path = join(
    HOME,
    "Library",
    "Application Support",
    "iTerm2",
    "Scripts",
    "AutoLaunch",
    "statux.py"
  );

  return existsSync(path)
    ? { status: "ok", name: "iTerm2 plugin", detail: path }
    : { status: "warn", name: "iTerm2 plugin", detail: "未安装 AutoLaunch/statux.py，可运行 statux --setup" };
}

function checkUsageCredentials(): DoctorCheck {
  const configDir = process.env.CLAUDE_CONFIG_DIR || join(HOME, ".claude");
  const path = join(configDir, ".credentials.json");
  return existsSync(path)
    ? { status: "ok", name: "Usage credentials", detail: path }
    : { status: "warn", name: "Usage credentials", detail: "未找到 Claude credentials 文件，Usage API 可能只能使用 statusLine rate_limits" };
}

function checkPricingCache(): DoctorCheck {
  const cachePath = join(HOME, ".config", "statux", "pricing-cache.json");
  if (!existsSync(cachePath)) {
    return { status: "warn", name: "LiteLLM pricing", detail: "缓存未创建（首次运行时自动下载）" };
  }
  try {
    const { mtimeMs } = statSync(cachePath);
    const ageHours = Math.round((Date.now() - mtimeMs) / (1000 * 60 * 60));
    if (ageHours > 48) {
      return { status: "warn", name: "LiteLLM pricing", detail: `缓存已 ${ageHours}h 未更新（建议 < 24h）` };
    }
    return { status: "ok", name: "LiteLLM pricing", detail: `缓存 ${ageHours}h 前更新` };
  } catch {
    return { status: "warn", name: "LiteLLM pricing", detail: "无法读取缓存状态" };
  }
}

function formatStatus(status: CheckStatus): string {
  if (status === "ok") return "[ok]";
  if (status === "warn") return "[warn]";
  return "[fail]";
}

export function runDoctor(): number {
  const checks = [
    checkBun(),
    checkConfig(),
    checkClaudeStatusLine(),
    checkCodexState(),
    checkIterm2Plugin(),
    checkUsageCredentials(),
    checkPricingCache(),
  ];

  console.log("statux doctor\n");
  for (const check of checks) {
    console.log(`${formatStatus(check.status)} ${check.name}: ${check.detail}`);
  }

  return checks.some((check) => check.status === "fail") ? 1 : 0;
}
