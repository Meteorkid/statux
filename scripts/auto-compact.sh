#!/bin/bash
# 自动压缩监控脚本
# 当上下文使用率超过阈值时，发送通知提醒用户压缩

THRESHOLD=${1:-85}  # 默认 85%
CHECK_INTERVAL=${2:-30}  # 默认 30 秒检查一次
DEBUG_DIR="$HOME/.cache/statux"
LOCK_FILE="$DEBUG_DIR/auto-compact.lock"

# 防止重复运行
if [ -f "$LOCK_FILE" ]; then
  lock_pid=$(cat "$LOCK_FILE" 2>/dev/null)
  if kill -0 "$lock_pid" 2>/dev/null; then
    echo "❌ 另一个实例正在运行 (PID $lock_pid)"
    exit 1
  fi
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

echo "🔍 启动上下文监控 (阈值: ${THRESHOLD}%, 间隔: ${CHECK_INTERVAL}s)"

while true; do
  # 找到最新的调试文件（按修改时间）
  latest_debug=$(ls -t "$DEBUG_DIR"/ctx-debug-*.json 2>/dev/null | head -1)

  if [ -n "$latest_debug" ] && [ -f "$latest_debug" ]; then
    used_pct=$(python3 -c "
import json
try:
    with open('$latest_debug') as f:
        d = json.load(f)
        reported = d.get('used_percentage', 0) or 0
        print(int(reported))
except:
    print(0)
" 2>/dev/null)

    if [ "$used_pct" -ge "$THRESHOLD" ] 2>/dev/null; then
      echo "⚠️  上下文使用率 ${used_pct}% 超过阈值 ${THRESHOLD}%"

      # 发送 macOS 通知
      osascript -e "display notification \"上下文使用率 ${used_pct}%，建议执行 /compact 压缩\" with title \"Statux\" sound name \"Glass\"" 2>/dev/null

      # 尝试自动压缩
      auto_compacted=false

      # 方法1: 通过 tmux 发送命令
      if command -v tmux &> /dev/null; then
        for session in $(tmux list-sessions -F "#{session_name}" 2>/dev/null); do
          if tmux list-panes -t "$session" -F "#{pane_current_command}" 2>/dev/null | grep -q "claude"; then
            tmux send-keys -t "$session" "/compact" Enter 2>/dev/null && {
              echo "✅ 已自动发送 /compact 到 tmux session: $session"
              auto_compacted=true
              break
            }
          fi
        done
      fi

      # 方法2: 通过 iTerm2 发送命令（不检查 TERM_PROGRAM，LaunchAgent 没有这个变量）
      if [ "$auto_compacted" = false ]; then
        osascript -e '
          tell application "iTerm"
            tell current session of current window
              write text "/compact"
            end tell
          end tell
        ' 2>/dev/null && {
          echo "✅ 已自动发送 /compact 到 iTerm2"
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
