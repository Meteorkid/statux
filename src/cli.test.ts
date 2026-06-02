import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("CLI stdin mode", () => {
  test("renders a minimal status JSON with a custom config", { timeout: 15000 }, () => {
    const home = mkdtempSync(join(tmpdir(), "statux-home-"));
    const configPath = join(home, "settings.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        version: 1,
        renderMode: "normal",
        colorLevel: 0,
        globalBold: false,
        minimalistMode: false,
        lines: [[{ id: "model", type: "model", merge: "no-padding" }]],
      }),
      "utf-8"
    );
    const inputPath = join(home, "status.json");
    writeFileSync(inputPath, JSON.stringify({ model: { display_name: "opus-test" } }), "utf-8");

    const result = Bun.spawnSync({
      cmd: ["bun", "src/cli.ts", "--config", configPath],
      cwd: process.cwd(),
      env: { ...process.env, HOME: home, TERM_PROGRAM: "" },
      stdin: Bun.file(inputPath),
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("opus-test");
    expect(result.stderr.toString()).toBe("");
  });
});
