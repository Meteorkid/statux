import type { PreRenderedWidget } from "../types/Widget";
import type { Config } from "../types/Config";
import { getVisibleText } from "./ansi";

// Powerline 字符（需要 Nerd Font 或 Powerline 字体才能正确显示）
const RIGHT_ARROW = "";
const RIGHT_THIN = "";
const LEFT_ARROW = "";
const LEFT_THIN = "";

// 默认颜色映射
const DEFAULT_BG = "\x1b[40m"; // black
const DEFAULT_FG = "\x1b[37m"; // white
const RESET = "\x1b[0m";

/** 内置 Powerline 主题 */
export interface PowerlineTheme {
  name: string;
  colors: Array<{ bg: string; fg: string }>;
}

const THEMES: Record<string, PowerlineTheme> = {
  dark: {
    name: "dark",
    colors: [
      { bg: "\x1b[44m", fg: "\x1b[37m" }, // blue bg, white fg
      { bg: "\x1b[42m", fg: "\x1b[30m" }, // green bg, black fg
      { bg: "\x1b[43m", fg: "\x1b[30m" }, // yellow bg, black fg
      { bg: "\x1b[45m", fg: "\x1b[37m" }, // magenta bg, white fg
      { bg: "\x1b[46m", fg: "\x1b[30m" }, // cyan bg, black fg
      { bg: "\x1b[41m", fg: "\x1b[37m" }, // red bg, white fg
    ],
  },
  ocean: {
    name: "ocean",
    colors: [
      { bg: "\x1b[44m", fg: "\x1b[37m" },
      { bg: "\x1b[46m", fg: "\x1b[30m" },
      { bg: "\x1b[44m", fg: "\x1b[37m" },
      { bg: "\x1b[46m", fg: "\x1b[30m" },
    ],
  },
  warm: {
    name: "warm",
    colors: [
      { bg: "\x1b[41m", fg: "\x1b[37m" },
      { bg: "\x1b[43m", fg: "\x1b[30m" },
      { bg: "\x1b[41m", fg: "\x1b[37m" },
      { bg: "\x1b[43m", fg: "\x1b[30m" },
    ],
  },
  mono: {
    name: "mono",
    colors: [
      { bg: "\x1b[47m", fg: "\x1b[30m" },
      { bg: "\x1b[100m", fg: "\x1b[37m" },
      { bg: "\x1b[47m", fg: "\x1b[30m" },
      { bg: "\x1b[100m", fg: "\x1b[37m" },
    ],
  },
};

export function getTheme(name: string): PowerlineTheme {
  return THEMES[name] || THEMES["dark"]!;
}

export function listThemes(): string[] {
  return Object.keys(THEMES);
}

/** 将 widget 的命名颜色映射到 ANSI 码 */
const COLOR_TO_ANSI: Record<string, string> = {
  black: "\x1b[40m",
  red: "\x1b[41m",
  green: "\x1b[42m",
  yellow: "\x1b[43m",
  blue: "\x1b[44m",
  magenta: "\x1b[45m",
  cyan: "\x1b[46m",
  white: "\x1b[47m",
  gray: "\x1b[100m",
  grey: "\x1b[100m",
};

const FG_COLOR_TO_ANSI: Record<string, string> = {
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  grey: "\x1b[90m",
};

function widgetBgColor(item: PreRenderedWidget, themeIndex: number, theme: PowerlineTheme): string {
  // 如果 widget 有自定义背景色，使用它
  if (item.item.backgroundColor) {
    return COLOR_TO_ANSI[item.item.backgroundColor.toLowerCase()] || DEFAULT_BG;
  }
  // 否则从主题中循环取色
  return theme.colors[themeIndex % theme.colors.length]?.bg || DEFAULT_BG;
}

function widgetFgColor(item: PreRenderedWidget, themeIndex: number, theme: PowerlineTheme): string {
  // 如果 widget 有自定义前景色
  if (item.item.color) {
    return FG_COLOR_TO_ANSI[item.item.color.toLowerCase()] || DEFAULT_FG;
  }
  return theme.colors[themeIndex % theme.colors.length]?.fg || DEFAULT_FG;
}

/** Powerline 模式渲染一行 */
export function renderPowerlineLine(
  preRendered: PreRenderedWidget[],
  config: Config,
  _terminalWidth: number
): string {
  const theme = getTheme(config.powerline?.theme || "dark");
  const separator = config.powerline?.separator || RIGHT_ARROW;
  const parts: string[] = [];
  let themeIndex = 0;

  // 过滤掉隐藏的 widget
  const visible = preRendered.filter((w) => w.text !== null);
  if (visible.length === 0) return "";

  for (let i = 0; i < visible.length; i++) {
    const widget = visible[i]!;
    const nextWidget = visible[i + 1];

    // flex-separator 在 powerline 模式中作为空间填充
    if (widget.item.type === "flex-separator") {
      // 计算剩余空间
      const totalUsed = visible.reduce((sum, w) => {
        if (w.item.type === "flex-separator") return sum;
        return sum + w.visibleText.length + 4; // 4 for padding
      }, 0);
      const remaining = Math.max(0, _terminalWidth - totalUsed);
      if (remaining > 0) {
        const bg = widgetBgColor(widget, themeIndex, theme);
        parts.push(`${bg}${" ".repeat(remaining)}${RESET}`);
      }
      continue;
    }

    // 跳过普通 separator（powerline 用箭头分隔）
    if (widget.item.type === "separator") {
      themeIndex++;
      continue;
    }

    const bg = widgetBgColor(widget, themeIndex, theme);
    const fg = widgetFgColor(widget, themeIndex, theme);
    const bold = widget.item.bold ? "\x1b[1m" : "";
    const text = ` ${widget.visibleText} `;

    // 当前段背景色 + 文字
    parts.push(`${bg}${fg}${bold}${text}`);

    // 箭头分隔符：当前段 bg → 下一段 bg
    if (nextWidget && nextWidget.item.type !== "flex-separator") {
      const nextBg = widgetBgColor(nextWidget, themeIndex + 1, theme);
      // 箭头颜色：前景=当前段背景，背景=下一段背景
      parts.push(`${bg}${nextBg}${separator}${RESET}`);
    } else {
      // 最后一个段：箭头颜色：前景=当前段背景，背景=默认
      parts.push(`${bg}${DEFAULT_BG}${separator}${RESET}`);
    }

    themeIndex++;
  }

  return parts.join("");
}
