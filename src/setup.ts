import { mkdirSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import PYTHON_PLUGIN_CONTENT from "../iterm2/statux.py" with { type: "text" };

const HOME = process.env.HOME || homedir();

const ITERM2_SCRIPTS_DIR = join(
  HOME,
  "Library",
  "Application Support",
  "iTerm2",
  "Scripts",
  "AutoLaunch"
);

export function setupIterm2(): void {
  console.log("Setting up iTerm2 plugin...");

  // 检查 iTerm2 Scripts 目录
  const scriptsBase = join(
    HOME,
    "Library",
    "Application Support",
    "iTerm2",
    "Scripts"
  );

  if (!existsSync(scriptsBase)) {
    console.log("iTerm2 Scripts directory not found.");
    console.log("Please enable Python API in iTerm2: Scripts > Manage > Install Python Runtime");
    console.log(`Then run: mkdir -p "${ITERM2_SCRIPTS_DIR}"`);
    return;
  }

  // 创建 AutoLaunch 目录
  mkdirSync(ITERM2_SCRIPTS_DIR, { recursive: true });

  // 写入 Python 插件
  const pluginPath = join(ITERM2_SCRIPTS_DIR, "statux.py");
  writeFileSync(pluginPath, PYTHON_PLUGIN_CONTENT, { mode: 0o755 });

  // 创建缓存目录
  const cacheDir = join(HOME, ".cache", "statux");
  mkdirSync(cacheDir, { recursive: true });

  console.log(`iTerm2 plugin installed: ${pluginPath}`);
  console.log(`Cache directory: ${cacheDir}`);
  console.log("");
  console.log("Next steps:");
  console.log("1. Restart iTerm2 (or Scripts > Reload)");
  console.log("2. In iTerm2 Preferences > Profiles > Session > Status bar,");
  console.log("   drag 'Agent Status' into the active components");
  console.log("3. Configure Claude Code statusLine:");
  console.log('   Add to ~/.claude/settings.json:');
  console.log('   "statusLine": { "type": "command", "command": "statux" }');
}
