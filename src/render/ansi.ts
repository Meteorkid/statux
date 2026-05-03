import stripAnsi from "strip-ansi";

/** 基础 ANSI 颜色码 */
const FG = {
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  orange: "\x1b[38;5;208m",
  pink: "\x1b[38;5;213m",
} as const;

const BG = {
  black: "\x1b[40m",
  red: "\x1b[41m",
  green: "\x1b[42m",
  yellow: "\x1b[43m",
  blue: "\x1b[44m",
  magenta: "\x1b[45m",
  cyan: "\x1b[46m",
  white: "\x1b[47m",
  orange: "\x1b[48;5;208m",
  pink: "\x1b[48;5;213m",
} as const;

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

/** 命名颜色 → ANSI 码映射 */
const COLOR_MAP: Record<string, string> = {
  black: FG.black,
  red: FG.red,
  green: FG.green,
  yellow: FG.yellow,
  blue: FG.blue,
  magenta: FG.magenta,
  cyan: FG.cyan,
  white: FG.white,
  gray: FG.gray,
  grey: FG.gray,
  orange: FG.orange,
  pink: FG.pink,
};

const BG_COLOR_MAP: Record<string, string> = {
  black: BG.black,
  red: BG.red,
  green: BG.green,
  yellow: BG.yellow,
  blue: BG.blue,
  magenta: BG.magenta,
  cyan: BG.cyan,
  white: BG.white,
  orange: BG.orange,
  pink: BG.pink,
};

/** 将文本包裹在颜色中 */
export function colorize(text: string, color?: string, bold?: boolean): string {
  if (!color && !bold) return text;

  let prefix = "";
  if (color) {
    prefix += COLOR_MAP[color.toLowerCase()] || "";
  }
  if (bold) {
    prefix += BOLD;
  }

  return prefix ? `${prefix}${text}${RESET}` : text;
}

/** 背景色 */
export function bgColorize(text: string, bgColor?: string): string {
  if (!bgColor) return text;
  const code = BG_COLOR_MAP[bgColor.toLowerCase()];
  return code ? `${code}${text}${RESET}` : text;
}

/** 获取去除 ANSI 码后的可见文本 */
export function getVisibleText(text: string): string {
  return stripAnsi(text);
}

/** 获取文本的可见宽度（去除 ANSI 码后） */
export function getVisibleWidth(text: string): number {
  return getVisibleText(text).length;
}

/** 用空格填充到指定宽度 */
export function padToWidth(text: string, width: number): string {
  const visible = getVisibleWidth(text);
  if (visible >= width) return text;
  return text + " ".repeat(width - visible);
}

/** 截断文本到指定宽度 */
export function truncateToWidth(text: string, maxWidth: number): string {
  const visible = getVisibleWidth(text);
  if (visible <= maxWidth) return text;
  // 简单截断
  return getVisibleText(text).slice(0, maxWidth);
}

/** 输出重置码 */
export function reset(): string {
  return RESET;
}

/** 输出粗体码 */
export function bold(): string {
  return BOLD;
}

/** 输出暗淡码 */
export function dim(): string {
  return DIM;
}

/** 非替换空格，防止终端修剪 */
export const NBSP = " ";
