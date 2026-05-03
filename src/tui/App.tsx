import React, { useState, useEffect, useCallback } from "react";
import { Box, Text, useApp, useInput, useStdin } from "ink";
import type { Key } from "ink";
import type { Config } from "../types/Config";
import type { WidgetItem } from "../types/Widget";
import { loadConfig, saveConfig } from "../config";
import { getAllWidgets } from "../widgets/registry";

type FocusArea = "lines" | "widgets" | "catalog";

interface WidgetEntry {
  type: string;
  displayName: string;
  category: string;
  description: string;
}

export function App() {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();

  const [config, setConfig] = useState<Config>(() => loadConfig());
  const [currentLine, setCurrentLine] = useState<number>(0);
  const [widgetCursor, setWidgetCursor] = useState<number>(0);
  const [catalogCursor, setCatalogCursor] = useState<number>(0);
  const [focus, setFocus] = useState<FocusArea>("widgets");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const allWidgets: WidgetEntry[] = getAllWidgets().map((w) => ({
    type: w.type,
    displayName: w.displayName,
    category: w.category,
    description: w.description,
  }));

  const filteredCatalog = allWidgets.filter((w: WidgetEntry) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      w.type.includes(q) ||
      w.displayName.toLowerCase().includes(q) ||
      w.category.includes(q)
    );
  });

  const lines: WidgetItem[][] = config.lines.length > 0 ? config.lines : [[]];
  const currentWidgets: WidgetItem[] = lines[currentLine] || [];

  useEffect(() => {
    if (widgetCursor >= currentWidgets.length) {
      setWidgetCursor(Math.max(0, currentWidgets.length - 1));
    }
  }, [currentWidgets.length, widgetCursor]);

  useEffect(() => {
    if (catalogCursor >= filteredCatalog.length) {
      setCatalogCursor(Math.max(0, filteredCatalog.length - 1));
    }
  }, [filteredCatalog.length, catalogCursor]);

  const showStatus = useCallback((msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 2000);
  }, []);

  const updateConfig = useCallback(
    (updater: (prev: Config) => Config) => {
      setConfig((prev: Config) => updater(prev));
    },
    []
  );

  useInput(
    (input: string, key: Key) => {
      if (input === "?") {
        setShowHelp((v: boolean) => !v);
        return;
      }
      if (showHelp) {
        setShowHelp(false);
        return;
      }

      if (key.ctrl && input === "s") {
        try {
          saveConfig(config);
          showStatus("配置已保存!");
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          showStatus(`保存失败: ${msg}`);
        }
        return;
      }

      if (key.ctrl && input === "c") {
        exit();
        return;
      }

      if (input === "q") {
        exit();
        return;
      }

      if (key.tab && !key.shift) {
        const next = currentLine + 1;
        if (next < lines.length) {
          setCurrentLine(next);
        } else {
          setCurrentLine(0);
        }
        setWidgetCursor(0);
        return;
      }

      if (key.tab && key.shift) {
        const prevLine = currentLine - 1;
        setCurrentLine(prevLine >= 0 ? prevLine : lines.length - 1);
        setWidgetCursor(0);
        return;
      }

      if (input === "A" && key.shift) {
        updateConfig((prev: Config) => ({
          ...prev,
          lines: [...prev.lines, []],
        }));
        setCurrentLine(lines.length);
        setWidgetCursor(0);
        showStatus("已添加新行");
        return;
      }

      if (input === "D" && key.shift) {
        if (lines.length <= 1) {
          showStatus("至少需要一行");
          return;
        }
        updateConfig((prev: Config) => ({
          ...prev,
          lines: prev.lines.filter((_: WidgetItem[], i: number) => i !== currentLine),
        }));
        setCurrentLine(Math.max(0, currentLine - 1));
        setWidgetCursor(0);
        showStatus("已删除行");
        return;
      }

      if (input === "m") {
        updateConfig((prev: Config) => ({
          ...prev,
          renderMode: prev.renderMode === "powerline" ? "normal" : "powerline",
        }));
        showStatus(
          config.renderMode === "powerline"
            ? "切换到普通模式"
            : "切换到 Powerline 模式"
        );
        return;
      }

      if (key.leftArrow && focus === "catalog") {
        setFocus("widgets");
        return;
      }
      if (key.rightArrow && focus === "widgets" && !key.ctrl) {
        setFocus("catalog");
        return;
      }

      if (focus === "catalog") {
        if (key.backspace || key.delete) {
          setSearchQuery((q: string) => q.slice(0, -1));
          setCatalogCursor(0);
          return;
        }
        if (input && !key.ctrl && !key.meta && input.length === 1) {
          setSearchQuery((q: string) => q + input);
          setCatalogCursor(0);
          return;
        }
      }

      if (key.upArrow || input === "k") {
        if (focus === "widgets") {
          setWidgetCursor((c: number) => Math.max(0, c - 1));
        } else if (focus === "catalog") {
          setCatalogCursor((c: number) => Math.max(0, c - 1));
        }
        return;
      }

      if (key.downArrow || input === "j") {
        if (focus === "widgets") {
          setWidgetCursor((c: number) => Math.min(currentWidgets.length - 1, c + 1));
        } else if (focus === "catalog") {
          setCatalogCursor((c: number) =>
            Math.min(filteredCatalog.length - 1, c + 1)
          );
        }
        return;
      }

      if (key.return && focus === "catalog") {
        const selected = filteredCatalog[catalogCursor];
        if (!selected) return;

        const newItem: WidgetItem = {
          id: `${selected.type}-${Date.now()}`,
          type: selected.type,
        };

        updateConfig((prev: Config) => {
          const newLines = [...prev.lines];
          const line = [...(newLines[currentLine] || [])];
          line.push(newItem);
          newLines[currentLine] = line;
          return { ...prev, lines: newLines };
        });

        setWidgetCursor(currentWidgets.length);
        showStatus(`已添加 ${selected.displayName}`);
        return;
      }

      if ((input === "d" || input === "x") && focus === "widgets") {
        if (currentWidgets.length === 0) return;
        const removed = currentWidgets[widgetCursor];
        updateConfig((prev: Config) => {
          const newLines = [...prev.lines];
          const line = [...(newLines[currentLine] || [])];
          line.splice(widgetCursor, 1);
          newLines[currentLine] = line;
          return { ...prev, lines: newLines };
        });
        showStatus(`已删除 ${removed?.type || "widget"}`);
        return;
      }

      if ((key.ctrl && key.leftArrow) || (input === "h" && focus === "widgets")) {
        if (widgetCursor <= 0) return;
        updateConfig((prev: Config) => {
          const newLines = [...prev.lines];
          const line = [...(newLines[currentLine] || [])];
          const a = line[widgetCursor - 1]!;
          const b = line[widgetCursor]!;
          line[widgetCursor - 1] = b;
          line[widgetCursor] = a;
          newLines[currentLine] = line;
          return { ...prev, lines: newLines };
        });
        setWidgetCursor((c: number) => c - 1);
        return;
      }

      if ((key.ctrl && key.rightArrow) || (input === "l" && focus === "widgets")) {
        if (widgetCursor >= currentWidgets.length - 1) return;
        updateConfig((prev: Config) => {
          const newLines = [...prev.lines];
          const line = [...(newLines[currentLine] || [])];
          const a = line[widgetCursor]!;
          const b = line[widgetCursor + 1]!;
          line[widgetCursor] = b;
          line[widgetCursor + 1] = a;
          newLines[currentLine] = line;
          return { ...prev, lines: newLines };
        });
        setWidgetCursor((c: number) => c + 1);
        return;
      }

      if (input === "b" && focus === "widgets") {
        if (currentWidgets.length === 0) return;
        updateConfig((prev: Config) => {
          const newLines = [...prev.lines];
          const line = [...(newLines[currentLine]!)];
          const item = { ...line[widgetCursor]! };
          item.bold = !item.bold;
          line[widgetCursor] = item;
          newLines[currentLine] = line;
          return { ...prev, lines: newLines };
        });
        return;
      }

      if (input === "H" && key.shift && focus === "widgets") {
        if (currentWidgets.length === 0) return;
        updateConfig((prev: Config) => {
          const newLines = [...prev.lines];
          const line = [...(newLines[currentLine]!)];
          const item = { ...line[widgetCursor]! };
          item.hide = !item.hide;
          line[widgetCursor] = item;
          newLines[currentLine] = line;
          return { ...prev, lines: newLines };
        });
        return;
      }

      const COLORS = [
        "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white", "gray",
      ];
      if (input === "c" && focus === "widgets") {
        if (currentWidgets.length === 0) return;
        updateConfig((prev: Config) => {
          const newLines = [...prev.lines];
          const line = [...(newLines[currentLine]!)];
          const item = { ...line[widgetCursor]! };
          const idx = COLORS.indexOf(item.color || "");
          item.color = COLORS[(idx + 1) % COLORS.length]!;
          line[widgetCursor] = item;
          newLines[currentLine] = line;
          return { ...prev, lines: newLines };
        });
        return;
      }
    },
    { isActive: isRawModeSupported }
  );

  return (
    <Box flexDirection="column" width="100%">
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={1}
        justifyContent="space-between"
      >
        <Text bold color="cyan">
          statux 配置
        </Text>
        <Text color="gray">
          {config.renderMode === "powerline" ? "⚡ Powerline" : "━ Normal"} │ ?
          帮助 │ Ctrl+S 保存 │ q 退出
        </Text>
      </Box>

      {showHelp ? (
        <HelpPanel />
      ) : (
        <Box flexDirection="row" flexGrow={1}>
          <Box flexDirection="column" width="50%" borderStyle="single" borderColor="gray">
            <Box paddingX={1}>
              <Text bold>行: </Text>
              {lines.map((_: WidgetItem[], i: number) => (
                <Text
                  key={i}
                  color={i === currentLine ? "cyan" : "gray"}
                  bold={i === currentLine}
                >
                  {i === currentLine ? `[${i + 1}]` : ` ${i + 1} `}
                </Text>
              ))}
              <Text color="gray"> │ Shift+A 添加行 │ Shift+D 删除行</Text>
            </Box>

            <Box flexDirection="column" paddingX={1} flexGrow={1}>
              <Text bold color={focus === "widgets" ? "green" : "white"}>
                {focus === "widgets" ? "▸ " : "  "}当前行 Widgets
              </Text>
              {currentWidgets.length === 0 ? (
                <Text color="gray" dimColor>
                  {"  (空 — 按 → 从目录添加)"}
                </Text>
              ) : (
                currentWidgets.map((w: WidgetItem, i: number) => (
                  <WidgetRow
                    key={w.id}
                    item={w}
                    selected={i === widgetCursor && focus === "widgets"}
                  />
                ))
              )}
            </Box>
          </Box>

          <Box flexDirection="column" width="50%" borderStyle="single" borderColor="gray">
            <Box paddingX={1}>
              <Text bold color={focus === "catalog" ? "green" : "white"}>
                {focus === "catalog" ? "▸ " : "  "}Widget 目录
              </Text>
              {focus === "catalog" && (
                <Text color="yellow"> │ 搜索: {searchQuery || "..."}</Text>
              )}
            </Box>
            <Box flexDirection="column" paddingX={1} flexGrow={1}>
              {filteredCatalog.length === 0 ? (
                <Text color="gray" dimColor>
                  {"  无匹配结果"}
                </Text>
              ) : (
                filteredCatalog.map((w: WidgetEntry, i: number) => (
                  <CatalogRow
                    key={w.type}
                    entry={w}
                    selected={i === catalogCursor && focus === "catalog"}
                  />
                ))
              )}
            </Box>
          </Box>
        </Box>
      )}

      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        {statusMsg ? (
          <Text color="green">{statusMsg}</Text>
        ) : (
          <Text color="gray">
            {focus === "widgets"
              ? "↑↓ 导航 │ d 删除 │ h/l 移动 │ b 粗体 │ c 颜色 │ → 目录"
              : "↑↓ 导航 │ Enter 添加 │ 输入搜索 │ ← 返回"}
          </Text>
        )}
      </Box>
    </Box>
  );
}

function WidgetRow({ item, selected }: { item: WidgetItem; selected: boolean }) {
  const widget = getAllWidgets().find((w) => w.type === item.type);
  const name = widget?.displayName || item.type;
  const color = selected ? "green" : "white";
  const dim = item.hide;

  return (
    <Text color={color} dimColor={dim}>
      {selected ? "  ▸ " : "    "}
      {item.bold ? <Text bold>{name}</Text> : name}
      {item.color ? <Text color="gray"> [{item.color}]</Text> : null}
      {item.hide ? <Text color="red"> (隐藏)</Text> : null}
    </Text>
  );
}

function CatalogRow({ entry, selected }: { entry: WidgetEntry; selected: boolean }) {
  return (
    <Text color={selected ? "green" : "white"}>
      {selected ? "  ▸ " : "    "}
      <Text bold>{entry.displayName}</Text>
      <Text color="gray">
        {" "}
        ({entry.type}) — {entry.description}
      </Text>
    </Text>
  );
}

function HelpPanel() {
  return (
    <Box flexDirection="column" padding={1} borderStyle="double" borderColor="yellow">
      <Text bold color="yellow">
        快捷键
      </Text>
      <Text>  Tab / Shift+Tab   切换行</Text>
      <Text>  Shift+A           添加新行</Text>
      <Text>  Shift+D           删除当前行</Text>
      <Text>  ↑↓ / j/k          上下导航</Text>
      <Text>  ←/→               切换焦点(Widget列表/目录)</Text>
      <Text>  Enter             从目录添加 Widget</Text>
      <Text>  d / x             删除选中的 Widget</Text>
      <Text>  h/l / Ctrl+←/→   左右移动 Widget 顺序</Text>
      <Text>  b                 切换粗体</Text>
      <Text>  c                 循环颜色</Text>
      <Text>  Shift+H           切换隐藏</Text>
      <Text>  m                 切换 Normal/Powerline 模式</Text>
      <Text>  Ctrl+S            保存配置</Text>
      <Text>  q / Ctrl+C        退出</Text>
      <Text>  ?                 显示/隐藏帮助</Text>
    </Box>
  );
}
