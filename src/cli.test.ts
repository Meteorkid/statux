import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("CLI stdin mode", () => {
  test("renders a minimal status JSON with a custom config", async () => {
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

    const proc = Bun.spawn({
      cmd: ["bun", "src/cli.ts", "--config", configPath],
      cwd: process.cwd(),
      env: { ...process.env, HOME: home, TERM_PROGRAM: "" },
      stdin: Bun.file(inputPath),
      stdout: "pipe",
      stderr: "pipe",
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => { proc.kill(); reject(new Error("timeout")); }, 15000)
    );

    const exitCode = await Promise.race([proc.exited, timeout]);
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    expect(exitCode).toBe(0);
    expect(stdout).toContain("opus-test");
    expect(stderr).toBe("");
  });
});
