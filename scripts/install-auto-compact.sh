#!/bin/bash
# 安装自动压缩监控 LaunchAgent

PLIST_NAME="com.statux.auto-compact"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="$HOME/.local/share/statux"
PLIST_SRC="$SCRIPT_DIR/$PLIST_NAME.plist"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

case "${1:-install}" in
  install)
    echo "📦 安装自动压缩监控..."

    # 复制脚本到用户目录
    mkdir -p "$INSTALL_DIR"
    cp "$SCRIPT_DIR/auto-compact.sh" "$INSTALL_DIR/"
    chmod +x "$INSTALL_DIR/auto-compact.sh"

    # 生成 plist（使用安装后的路径）
    cat > "$PLIST_DST" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$PLIST_NAME</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$INSTALL_DIR/auto-compact.sh</string>
        <string>85</string>
        <string>30</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/statux-auto-compact.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/statux-auto-compact.log</string>
</dict>
</plist>
EOF

    # 加载 LaunchAgent
    launchctl unload "$PLIST_DST" 2>/dev/null
    launchctl load "$PLIST_DST"
    echo "✅ 已安装并启动"
    echo "📋 查看日志: tail -f /tmp/statux-auto-compact.log"
    echo "📁 脚本位置: $INSTALL_DIR/auto-compact.sh"
    ;;
  uninstall)
    echo "🗑️  卸载自动压缩监控..."
    launchctl unload "$PLIST_DST" 2>/dev/null
    rm -f "$PLIST_DST"
    rm -f "$INSTALL_DIR/auto-compact.sh"
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
