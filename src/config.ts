import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { ConfigSchema, type Config } from "./types/Config";

const HOME = process.env.HOME || homedir();
const CONFIG_DIR = join(HOME, ".config", "statux");
const CONFIG_FILE = join(CONFIG_DIR, "settings.json");

/** 默认配置 — 紧凑双行布局 */
function getDefaultConfig(): Config {
  return {
    version: 1,
    lines: [
      [
        { id: "tool", type: "tool-indicator", merge: "no-padding" },
        { id: "s0", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " " } },
        { id: "model", type: "model", label: "mdl", color: "orange", merge: "no-padding" },
        { id: "s1", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "ctxbar", type: "context-bar", merge: "no-padding" },
        { id: "s2", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "tok", type: "tokens", label: "tok", color: "magenta", merge: "no-padding" },
        { id: "s3", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "cost", type: "cost", label: "cost", color: "green", merge: "no-padding" },
        { id: "s4", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "clock", type: "session-clock", label: "time", color: "yellow", merge: "no-padding" },
      ],
      [
        { id: "branch", type: "git-branch", label: "git", color: "cyan", merge: "no-padding" },
        { id: "s5", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "changes", type: "git-changes", color: "yellow", merge: "no-padding" },
        { id: "s6", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "crate", type: "cost-rate", label: "$/min", color: "cyan", merge: "no-padding" },
        { id: "s7", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "rl", type: "rate-limit", color: "yellow", merge: "no-padding" },
        { id: "s8", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "tools", type: "tool-calls", label: "tools", color: "blue", merge: "no-padding" },
      ],
    ],
    renderMode: "normal",
    colorLevel: 3,
    globalBold: true,
    minimalistMode: false,
  };
}

export function loadConfig(configPath?: string): Config {
  const filePath = configPath || CONFIG_FILE;
  try {
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      return ConfigSchema.parse(parsed);
    }
  } catch (err) {
    console.error(`\x1b[33mstatux: 配置文件解析失败 (${filePath})，使用默认配置\x1b[0m`);
    if (err instanceof Error && err.message) {
      console.error(`\x1b[90m  ${err.message}\x1b[0m`);
    }
  }
  // 首次运行提示（只在配置文件不存在时输出到 stderr）
  if (!configPath && !existsSync(CONFIG_FILE)) {
    console.error(`\x1b[90mstatux: 首次运行，使用默认配置。运行 \`statux --tui\` 自定义，或 \`statux doctor\` 检查配置\x1b[0m`);
  }
  return getDefaultConfig();
}

export function saveConfig(config: Config, configPath?: string): void {
  const filePath = configPath || CONFIG_FILE;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8");
}
