import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { ConfigSchema, type Config } from "./types/Config";

const CONFIG_DIR = join(process.env.HOME || "~", ".config", "statux");
const CONFIG_FILE = join(CONFIG_DIR, "settings.json");

/** 默认配置 — 三行布局 */
function getDefaultConfig(): Config {
  return {
    version: 1,
    lines: [
      [
        { id: "model", type: "model", label: "mdl", color: "orange", merge: "no-padding" },
        { id: "s1", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "think", type: "thinking-effort", color: "green", merge: "no-padding" },
        { id: "s2", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "mem", type: "free-memory", color: "yellow", merge: "no-padding" },
        { id: "s3", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "ctxbar", type: "context-bar", merge: "no-padding" },
        { id: "s4", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "ctxlen", type: "context-length", label: "len", color: "cyan", merge: "no-padding" },
      ],
      [
        { id: "cwd", type: "custom-command", label: "dir", color: "cyan", merge: "no-padding", metadata: { command: "pwd | sed \"s|$HOME|~|\"", maxLength: 60 } },
        { id: "s5", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "tok", type: "tokens", label: "tok", color: "magenta", merge: "no-padding" },
        { id: "s6", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "ispeed", type: "input-speed", label: "in-spd", color: "orange", merge: "no-padding" },
        { id: "s7", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "ospeed", type: "output-speed", label: "out-spd", color: "green", merge: "no-padding" },
      ],
      [
        { id: "cost", type: "cost", label: "cost", color: "green", merge: "no-padding" },
        { id: "s8", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "clock", type: "session-clock", label: "time", color: "yellow", merge: "no-padding" },
        { id: "s9", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "tools", type: "tool-calls", label: "tools", color: "blue", merge: "no-padding" },
        { id: "s10", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "wt", type: "git-worktree", label: "wt", color: "red", merge: "no-padding" },
        { id: "s11", type: "separator", color: "white", merge: "no-padding", metadata: { separator: " │ " } },
        { id: "sk", type: "skills", label: "sk", color: "white", merge: "no-padding" },
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
  } catch {
    // 配置文件损坏时使用默认配置
  }
  return getDefaultConfig();
}

export function saveConfig(config: Config, configPath?: string): void {
  const filePath = configPath || CONFIG_FILE;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8");
}

function dirname(p: string): string {
  return p.split("/").slice(0, -1).join("/");
}
