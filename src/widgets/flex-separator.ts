import type { Widget, WidgetItem, RenderContext, PreRenderedWidget } from "../types/Widget";
import { getVisibleWidth } from "../render/ansi";

/** flex-separator 需要在渲染管线中特殊处理，这里只返回占位符 */
export const FlexSeparatorWidget: Widget = {
  type: "flex-separator",
  category: "layout",
  displayName: "Flex Separator",
  description: "弹性分隔符，自动填充剩余空间",
  defaultColor: "gray",

  render(_item: WidgetItem, _ctx: RenderContext): string {
    // 返回占位符，实际宽度在管线中计算
    return "";
  },
};

/** 计算 flex-separator 应该填充的宽度 */
export function calculateFlexWidth(
  terminalWidth: number,
  preRendered: PreRenderedWidget[]
): number {
  const totalUsed = preRendered
    .filter((w) => w.item.type !== "flex-separator")
    .reduce((sum, w) => sum + w.width, 0);

  const flexCount = preRendered.filter((w) => w.item.type === "flex-separator").length;
  const remaining = Math.max(0, terminalWidth - totalUsed);
  return flexCount > 0 ? Math.floor(remaining / flexCount) : 0;
}
