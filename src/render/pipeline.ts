import type { Config } from "../types/Config";
import type { RenderContext, PreRenderedWidget, WidgetItem } from "../types/Widget";
import { getWidget } from "../widgets/registry";
import { getVisibleWidth, getVisibleText, padToWidth, colorize, reset } from "./ansi";
import { calculateFlexWidth } from "../widgets/flex-separator";
import { renderPowerlineLine } from "./powerline";

const DEFAULT_TERMINAL_WIDTH = 120;

/** Phase 1: 预渲染所有 widget */
export function preRenderAllWidgets(
  lines: WidgetItem[][],
  ctx: RenderContext
): PreRenderedWidget[][] {
  return lines.map((lineItems) =>
    lineItems.map((item) => {
      if (item.hide) {
        return { item, text: null, visibleText: "", width: 0 };
      }

      const widget = getWidget(item.type);
      if (!widget) {
        return { item, text: null, visibleText: "", width: 0 };
      }

      let text = widget.render(item, ctx);

      // label 处理：有值时前置 label:，无值时隐藏（不显示 label:none）
      if (item.label) {
        if (text === null) {
          return { item, text: null, visibleText: "", width: 0 };
        }
        const color = item.color || widget.defaultColor;
        const plain = getVisibleText(text);
        if (!plain.startsWith(item.label + ":")) {
          text = `${colorize(item.label + ":", color, item.bold)}${text}`;
        }
      }

      if (text === null) {
        return { item, text: null, visibleText: "", width: 0 };
      }

      const visibleText = getVisibleText(text);
      const width = getVisibleWidth(text);

      return { item, text, visibleText, width };
    })
  );
}

/** Phase 2: 组装最终输出 */
export function assembleStatusLine(
  preRendered: PreRenderedWidget[],
  _config: Config,
  terminalWidth?: number
): string {
  const width = terminalWidth || inferTerminalWidth(preRendered) || DEFAULT_TERMINAL_WIDTH;

  // 计算 flex-separator 宽度
  const flexWidth = calculateFlexWidth(width, preRendered);

  // 预处理：移除相邻隐藏 widget 旁边的孤立分隔符
  const visible = preRendered.filter((w, i) => {
    if (w.text !== null) return true;
    // widget 被隐藏，标记相邻分隔符也跳过
    return false;
  });

  // 移除孤立分隔符（前后都是 null 或分隔符的分隔符）
  const cleaned = visible.filter((w, i) => {
    if (w.item.type !== "separator") return true;
    const prev = i > 0 ? visible[i - 1] : null;
    const next = i < visible.length - 1 ? visible[i + 1] : null;
    // 如果前后都是分隔符或边界，这个分隔符是孤立的
    const prevIsSep = !prev || prev.item.type === "separator";
    const nextIsSep = !next || next.item.type === "separator";
    if (prevIsSep && nextIsSep) return false;
    return true;
  });

  // 组装各 widget 文本
  const parts: string[] = [];

  for (const widget of cleaned) {
    if (widget.text === null) continue;

    if (widget.item.type === "flex-separator") {
      // flex-separator 填充空格
      if (flexWidth > 0) {
        parts.push(" ".repeat(flexWidth));
      }
      continue;
    }

    let text = widget.text;

    // 处理 merge 模式
    if (widget.item.merge === "no-padding") {
      parts.push(text);
    } else if (widget.item.merge) {
      parts.push(text);
    } else {
      // 非 merge 模式，加空格分隔
      parts.push(` ${text} `);
    }
  }

  // 合并连续的 merge widget
  let result = parts.join("");

  // 添加重置码，防止 Claude Code 的 dim 设置影响
  return `\x1b[0m${result}${reset()}`;
}

/** 推断终端宽度：优先使用实际检测值 */
function inferTerminalWidth(preRendered: PreRenderedWidget[]): number {
  // 尝试从终端获取实际宽度
  try {
    const cols = process.stdout.columns;
    if (cols && cols > 0) return cols;
  } catch {
    // stdout 不是 TTY
  }
  return DEFAULT_TERMINAL_WIDTH;
}

/** 完整渲染流程 */
export function renderStatusLines(
  lines: WidgetItem[][],
  config: Config,
  ctx: RenderContext
): string[] {
  const preRendered = preRenderAllWidgets(lines, ctx);

  return preRendered
    .map((lineWidgets, i) => {
      if (lineWidgets.length === 0) return "";
      if (config.renderMode === "powerline") {
        return renderPowerlineLine(lineWidgets, config, ctx.terminalWidth);
      }
      return assembleStatusLine(lineWidgets, config, ctx.terminalWidth);
    })
    .filter((line) => getVisibleText(line).trim().length > 0);
}
