#!/bin/bash
# 自动压缩监控脚本
# 当上下文使用率超过阈值时，发送通知提醒用户压缩

THRESHOLD=${1:-85}  # 默认 85%
CHECK_INTERVAL=${2:-30}  # 默认 30 秒检查一次
DEBUG_FILE="$HOME/.cache/statux/ctx-debug.json"

echo "🔍 启动上下文监控 (阈值: ${THRESHOLD}%, 间隔: ${CHECK_INTERVAL}s)"

while true; do
  if [ -f "$DEBUG_FILE" ]; then
    # 读取调试数据
    used_pct=$(python3 -c "
import json
try:
    with open('$DEBUG_FILE') as f:
        d = json.load(f)
        # 优先用计算值，其次用 reported 值
        total = d.get('total_input_tokens', 0) or 0
        window = d.get('context_window_size', 200000) or 200000
        reported = d.get('used_percentage', 0) or 0

        if total > 0 and window > 0:
            computed = (total / window) * 100
            print(int(max(computed, reported)))
        else:
            print(int(reported))
except:
    print(0)
" 2>/dev/null)

    # 检查是否超过阈值
    if [ "$used_pct" -ge "$THRESHOLD" ] 2>/dev/null; then
      echo "⚠️  上下文使用率 ${used_pct}% 超过阈值 ${THRESHOLD}%"

      # 发送 macOS 通知
      osascript -e "display notification \"上下文使用率 ${used_pct}%，建议执行 /compact 压缩\" with title \"Statux\" sound name \"Glass\"" 2>/dev/null

      # 尝试自动压缩
      auto_compacted=false

      # 方法1: 通过 tmux 发送命令
      if command -v tmux &> /dev/null && tmux list-sessions 2>/dev/null | grep -q "claude"; then
        tmux send-keys -t claude "/compact" Enter 2>/dev/null && {
          echo "✅ 已自动发送 /compact 命令到 tmux"
          auto_compacted=true
        }
      fi

      # 方法2: 通过 iTerm2 发送命令
      if [ "$auto_compacted" = false ] && [ "$TERM_PROGRAM" = "iTerm.app" ]; then
        osascript -e '
          tell application "iTerm"
            tell current session of current window
              write text "/compact"
            end tell
          end tell
        ' 2>/dev/null && {
          echo "✅ 已自动发送 /compact 命令到 iTerm2"
          auto_compacted=true
        }
      fi

      # 方法3: 通过 AppleScript 发送到当前终端
      if [ "$auto_compacted" = false ]; then
        osascript -e '
          tell application "System Events"
            tell process "Terminal"
              keystroke "/compact"
              keystroke return
            end tell
          end tell
        ' 2>/dev/null && {
          echo "✅ 已自动发送 /compact 命令到终端"
          auto_compacted=true
        }
      fi

      if [ "$auto_compacted" = false ]; then
        echo "⚠️  无法自动压缩，请手动执行 /compact"
      fi

      # 等待一段时间再检查（避免重复通知）
      sleep 120
    fi
  fi

  sleep "$CHECK_INTERVAL"
done
