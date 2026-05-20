import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  test("falls back to default config when JSON is invalid", () => {
    const dir = mkdtempSync(join(tmpdir(), "statux-config-"));
    const file = join(dir, "settings.json");
    writeFileSync(file, "{ invalid json", "utf-8");

    const config = loadConfig(file);

    expect(config.version).toBe(1);
    expect(config.lines.length).toBeGreaterThan(0);
    expect(config.renderMode).toBe("normal");
  });
});
