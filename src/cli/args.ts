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
  if (argv.includes("--setup")) return { type: "setup" };
  if (argv.includes("--tui") || argv.includes("-t")) return { type: "tui" };
  if (argv.includes("doctor") || argv.includes("--doctor")) return { type: "doctor" };
  if (argv.includes("widgets") || argv.includes("--widgets")) return { type: "widgets" };

  const historyIdx = argv.indexOf("--history");
  if (historyIdx !== -1) {
    const nextArg = argv[historyIdx + 1];
    const days = nextArg && /^\d+$/.test(nextArg) ? parsePositiveInt(nextArg, 7) : 7;
    return { type: "history", days };
  }

  const watchIdx = argv.indexOf("--watch");
  const watchShort = argv.indexOf("-w");
  const watchFlagIdx = watchIdx !== -1 ? watchIdx : watchShort;
  if (watchFlagIdx !== -1) {
    const nextArg = argv[watchFlagIdx + 1];
    // 只当下一个参数是数字时才解析为 interval，否则用默认值
    const interval = nextArg && /^\d+$/.test(nextArg) ? parsePositiveInt(nextArg, 5) : 5;
    return { type: "watch", intervalSec: interval };
  }

  if (argv.includes("--oneshot") || argv.includes("-1")) return { type: "oneshot" };
  if (argv.includes("--help") || argv.includes("-h")) return { type: "help" };

  const configIdx = argv.indexOf("--config");
  return {
    type: "stdin",
    configPath: configIdx !== -1 ? argv[configIdx + 1] : undefined,
  };
}
