import { mkdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { StatusJSON } from "../types/StatusJSON";
import type { TokenMetrics } from "../types/Widget";
import { buildIterm2StatusPayload } from "../data/iterm2-status";

const HOME = process.env.HOME || homedir();
const STATUS_DIR = join(HOME, ".cache", "statux");
const STATUS_FILE = join(STATUS_DIR, "status.json");

export function emitIterm2Osc(data: StatusJSON, tokenMetrics: TokenMetrics | null): void {
  if (!process.env.TERM_PROGRAM?.includes("iTerm")) return;

  const payload = JSON.stringify(buildIterm2StatusPayload(data, tokenMetrics));
  process.stdout.write(`\x1b]1337;Custom=id=statux:${payload}\x07`);
}

export function writeStatusJson(data: StatusJSON, tokenMetrics: TokenMetrics | null): void {
  try {
    const payload = buildIterm2StatusPayload(data, tokenMetrics);
    mkdirSync(STATUS_DIR, { recursive: true });
    writeFileSync(STATUS_FILE, JSON.stringify(payload, null, 2));
  } catch {
    // 写入失败不影响主流程
  }
}
