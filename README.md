# statux

AI Agent status display for Claude Code and iTerm2.

Display model info, context usage, git branch, token counts, cost, and rate limits in your terminal — works as both a Claude Code statusLine command and an iTerm2 status bar plugin.

## Quick Start

```bash
# Install
bun install

# Test with mock data
echo '{"model":"claude-opus-4-7","context_window":{"used_percentage":42},"cost":{"total_cost_usd":0.35}}' | bun src/cli.ts

# Install iTerm2 plugin
bun src/cli.ts --setup
```

## Claude Code Integration

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "bun /path/to/statux/src/cli.ts",
    "refreshInterval": 10
  }
}
```

## iTerm2 Integration

1. Install the plugin: `bun src/cli.ts --setup`
2. Restart iTerm2
3. Go to Preferences > Profiles > Session > Status bar
4. Drag "Agent Status" into the active components

The plugin communicates via OSC 1337 custom control sequences — the CLI emits status on every render, and the iTerm2 daemon picks it up automatically.

## Widgets

| Widget | Description | Example |
|--------|-------------|---------|
| `model` | Current model name | `opus-4.7` |
| `context-bar` | Context usage progress bar | `[████████░░] 82%` |
| `context-pct` | Context usage percentage | `ctx:42%` |
| `tokens` | Input/output token counts | `in:45k out:12k` |
| `git-branch` | Current git branch | `main` |
| `git-status` | File change summary | `+3 ~1 ?2` |
| `session-clock` | Session duration | `25m` |
| `cost` | Session cost (USD) | `$0.35` |
| `rate-limit` | Rate limit usage | `rl:42%` |
| `separator` | Static separator | ` │ ` |
| `flex-separator` | Auto-filling spacer | (fills remaining width) |

## Configuration

Config file: `~/.config/statux/settings.json`

```json
{
  "version": 1,
  "lines": [
    [
      { "id": "model", "type": "model" },
      { "id": "sep", "type": "separator" },
      { "id": "ctx", "type": "context-bar" },
      { "id": "flex", "type": "flex-separator" },
      { "id": "cost", "type": "cost" }
    ]
  ],
  "renderMode": "normal",
  "colorLevel": 3
}
```

## Architecture

```
Claude Code → stdin(StatusJSON) → statux CLI → stdout(ANSI)
                                     ↓
                              OSC 1337 sequence
                                     ↓
                              iTerm2 Python daemon → status bar + tab color
```

## License

MIT
