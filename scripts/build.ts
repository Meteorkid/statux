#!/usr/bin/env bun
import { mkdirSync, rmSync, cpSync, existsSync } from "fs";
import { join } from "path";

const TARGETS = [
  { name: "statux-darwin-arm64", target: "bun-darwin-arm64" },
  { name: "statux-darwin-x64", target: "bun-darwin-x64" },
  { name: "statux-linux-x64", target: "bun-linux-x64" },
  { name: "statux-linux-arm64", target: "bun-linux-arm64" },
  { name: "statux-windows-x64", target: "bun-windows-x64" },
] as const;

const distDir = join(import.meta.dir, "..", "dist");

// 清理 dist
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true });
}
mkdirSync(distDir, { recursive: true });

console.log("Building statux for all platforms...\n");

for (const t of TARGETS) {
  const outPath = join(distDir, t.name);
  console.log(`  Building ${t.name}...`);

  const proc = Bun.spawnSync(
    ["bun", "build", "--compile", "--target", t.target, "--outfile", outPath, "src/cli.ts"],
    { cwd: join(import.meta.dir, ".."), stdout: "inherit", stderr: "inherit" }
  );

  if (proc.exitCode !== 0) {
    console.error(`  Failed to build ${t.name}`);
    process.exit(1);
  }

  console.log(`  ✓ ${t.name}`);
}

console.log("\nAll builds complete! Binaries in dist/");
