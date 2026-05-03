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

      // label 处理：null 时显示 label:none，有值时前置 label:
      if (item.label) {
        const color = item.color || widget.defaultColor;
        if (text === null) {
          text = colorize(`${item.label}:none`, color, item.bold);
        } else {
          const plain = getVisibleText(text);
          if (!plain.startsWith(item.label + ":")) {
            text = `${colorize(item.label + ":", color, item.bold)}${text}`;
          }
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

  // 组装各 widget 文本
  const parts: string[] = [];

  for (const widget of preRendered) {
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

/** 从预渲染结果推断终端宽度 */
function inferTerminalWidth(preRendered: PreRenderedWidget[]): number {
  // 如果有 flex-separator，无法推断，使用默认值
  const hasFlex = preRendered.some((w) => w.item.type === "flex-separator");
  if (hasFlex) return DEFAULT_TERMINAL_WIDTH;
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
