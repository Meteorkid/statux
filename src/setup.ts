import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const ITERM2_SCRIPTS_DIR = join(
  process.env.HOME || "~",
  "Library",
  "Application Support",
  "iTerm2",
  "Scripts",
  "AutoLaunch"
);

const PYTHON_PLUGIN_CONTENT = `#!/usr/bin/env python3
"""statux — iTerm2 status bar plugin for AI agent status display."""

import iterm2
import json
import os

STATUS_FILE = os.path.expanduser("~/.cache/statux/status.json")

async def main(connection):
    # Status bar component
    component = iterm2.StatusBarComponent(
        short_description="Agent Status",
        detailed_description="AI agent status from statux",
        knobs=[],
        exemplar="Claude: opus-4.7 | ctx: 42% | $0.35",
        update_cadence=2,
        identifier="com.statux.agent-status",
    )

    @iterm2.StatusBarRPC
    async def status_callback(knobs):
        try:
            if os.path.exists(STATUS_FILE):
                with open(STATUS_FILE, "r") as f:
                    data = json.load(f)
                parts = []
                if data.get("model"):
                    parts.append(data["model"])
                if data.get("ctxPct") is not None:
                    parts.append(f"ctx:{data['ctxPct']}%")
                if data.get("cost"):
                    parts.append(f"${data['cost']}")
                if data.get("rateLimit") is not None:
                    parts.append(f"rl:{data['rateLimit']}%")
                return " | ".join(parts) if parts else ""
        except (json.JSONDecodeError, OSError):
            pass
        return ""

    await component.async_register(connection, status_callback)

    # Monitor custom control sequences from statux CLI
    async with iterm2.CustomControlSequenceMonitor(
        connection,
        "statux",
        r".*",
        session_id=None,
    ) as mon:
        app = await iterm2.async_get_app(connection)
        while True:
            match = await mon.async_get()
            payload = match.group(0)
            try:
                data = json.loads(payload)
                # Update status file for status bar
                os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
                with open(STATUS_FILE, "w") as f:
                    json.dump(data, f)

                # Update tab color based on state
                window = app.current_terminal_window
                if window:
                    session = window.current_tab.current_session
                    if session:
                        change = iterm2.LocalWriteOnlyProfile()
                        if data.get("rateLimit") and data["rateLimit"] > 80:
                            change.set_tab_color(iterm2.Color(255, 80, 80))
                            change.set_use_tab_color(True)
                        elif data.get("ctxPct") and data["ctxPct"] > 80:
                            change.set_tab_color(iterm2.Color(255, 200, 80))
                            change.set_use_tab_color(True)
                        else:
                            change.set_tab_color(iterm2.Color(80, 200, 120))
                            change.set_use_tab_color(True)
                        await session.async_set_profile_properties(change)
            except (json.JSONDecodeError, Exception):
                pass

iterm2.run_forever(main)
`;

export function setupIterm2(): void {
  console.log("Setting up iTerm2 plugin...");

  // 检查 iTerm2 Scripts 目录
  const scriptsBase = join(
    process.env.HOME || "~",
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
  const cacheDir = join(process.env.HOME || "~", ".cache", "statux");
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
