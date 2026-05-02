import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { ConfigSchema, type Config } from "./types/Config";

const CONFIG_DIR = join(process.env.HOME || "~", ".config", "statux");
const CONFIG_FILE = join(CONFIG_DIR, "settings.json");

/** 默认配置 — 单行，包含常用 widget */
function getDefaultConfig(): Config {
  return {
    version: 1,
    lines: [
      [
        { id: "model", type: "model" },
        { id: "sep1", type: "separator" },
        { id: "ctx", type: "context-bar" },
        { id: "sep2", type: "separator" },
        { id: "git", type: "git-branch" },
        { id: "sep3", type: "separator" },
        { id: "clock", type: "session-clock" },
        { id: "sep4", type: "separator" },
        { id: "cost", type: "cost" },
        { id: "sep5", type: "separator" },
        { id: "rl", type: "rate-limit" },
        { id: "flex", type: "flex-separator" },
        { id: "tokens", type: "tokens" },
      ],
    ],
    renderMode: "normal",
    colorLevel: 3,
    globalBold: false,
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
