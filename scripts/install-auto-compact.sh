#!/bin/bash
# 安装自动压缩监控 LaunchAgent

PLIST_NAME="com.statux.auto-compact"
PLIST_SRC="$(dirname "$0")/$PLIST_NAME.plist"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

case "${1:-install}" in
  install)
    echo "📦 安装自动压缩监控..."
    cp "$PLIST_SRC" "$PLIST_DST"
    launchctl load "$PLIST_DST"
    echo "✅ 已安装并启动"
    echo "📋 查看日志: tail -f /tmp/statux-auto-compact.log"
    ;;
  uninstall)
    echo "🗑️  卸载自动压缩监控..."
    launchctl unload "$PLIST_DST" 2>/dev/null
    rm -f "$PLIST_DST"
    echo "✅ 已卸载"
    ;;
  status)
    if launchctl list | grep -q "$PLIST_NAME"; then
      echo "✅ 运行中"
    else
      echo "❌ 未运行"
    fi
    ;;
  *)
    echo "用法: $0 [install|uninstall|status]"
    ;;
esac
