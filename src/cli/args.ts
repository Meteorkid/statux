export type CliCommand =
  | { type: "setup" }
  | { type: "tui" }
  | { type: "history"; days: number }
  | { type: "watch"; intervalSec: number }
  | { type: "oneshot" }
  | { type: "doctor" }
  | { type: "widgets" }
  | { type: "help" }
  | { type: "stdin"; configPath?: string };

export const HELP_TEXT = `statux — AI Agent status display

Usage:
  echo '<json>' | statux          # Claude Code statusLine mode (stdin)
  statux --oneshot | -1           # Auto-detect tool, output once
  statux --watch [seconds] | -w   # Polling daemon mode (default 5s)
  statux --tui | -t               # Interactive config editor
  statux --history [days]         # Show usage history (default 7 days)
  statux widgets                  # List all available widgets
  statux doctor                   # Check local statux integrations
  statux --setup                  # Install iTerm2 plugin
  statux --config <path>          # Use custom config file
  statux --help | -h              # Show this help

Supported tools: Claude Code, Codex (OpenAI)`;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function parseCliCommand(argv: string[]): CliCommand {
  // 跳过 node/bun 和脚本路径
  const args = argv.slice(2);

  let configPath: string | undefined;

  // 位置参数解析：按顺序扫描，遇到 command 就返回
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;

    // 独立命令（无 flag 前缀，第一个出现的）
    if (arg === "doctor" || arg === "--doctor") return { type: "doctor" };
    if (arg === "widgets" || arg === "--widgets") return { type: "widgets" };
    if (arg === "--setup") return { type: "setup" };
    if (arg === "--tui" || arg === "-t") return { type: "tui" };
    if (arg === "--oneshot" || arg === "-1") return { type: "oneshot" };
    if (arg === "--help" || arg === "-h") return { type: "help" };

    // 带参数的 flag
    if (arg === "--history") {
      const nextArg = args[i + 1];
      const days = nextArg && /^\d+$/.test(nextArg) ? parsePositiveInt(nextArg, 7) : 7;
      return { type: "history", days };
    }
    if (arg === "--watch" || arg === "-w") {
      const nextArg = args[i + 1];
      const interval = nextArg && /^\d+$/.test(nextArg) ? parsePositiveInt(nextArg, 5) : 5;
      return { type: "watch", intervalSec: interval };
    }
    if (arg === "--config") {
      configPath = args[i + 1];
      i++; // 跳过 config path 值
      continue;
    }
  }

  return { type: "stdin", configPath };
}
