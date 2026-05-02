import type { Widget } from "../types/Widget";

const widgets = new Map<string, Widget>();

export function registerWidget(widget: Widget): void {
  widgets.set(widget.type, widget);
}

export function getWidget(type: string): Widget | undefined {
  return widgets.get(type);
}

export function getAllWidgets(): Widget[] {
  return Array.from(widgets.values());
}

export function getWidgetTypes(): string[] {
  return Array.from(widgets.keys());
}
