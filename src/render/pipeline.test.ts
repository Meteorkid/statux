import { describe, expect, test } from "bun:test";
import { renderStatusLines } from "./pipeline";
import { registerWidget } from "../widgets/registry";
import type { RenderContext, Widget } from "../types/Widget";

const NullWidget: Widget = {
  type: "test-null-widget",
  category: "test",
  displayName: "Test Null Widget",
  description: "Test widget returning null",
  defaultColor: "cyan",
  render: () => null,
};

const ValueWidget: Widget = {
  type: "test-value-widget",
  category: "test",
  displayName: "Test Value Widget",
  description: "Test widget returning a value",
  defaultColor: "green",
  render: () => "value",
};

function context(): RenderContext {
  return {
    data: {},
    tokenMetrics: null,
    speedMetrics: null,
    windowedSpeedMetrics: null,
    sessionDuration: null,
    terminalWidth: 80,
    usageData: null,
    gitInfo: null,
    jujutsuInfo: null,
    tool: null,
  };
}

describe("renderStatusLines", () => {
  registerWidget(NullWidget);
  registerWidget(ValueWidget);

  test("renders label:none when a labeled widget has no data", () => {
    const lines = renderStatusLines(
      [[{ id: "x", type: "test-null-widget", label: "missing", merge: "no-padding" }]],
      { version: 1, lines: [], renderMode: "normal", colorLevel: 3, globalBold: false, minimalistMode: false },
      context()
    );

    expect(lines.join("\n")).toContain("missing:none");
  });

  test("prepends label to unlabeled widget output", () => {
    const lines = renderStatusLines(
      [[{ id: "x", type: "test-value-widget", label: "ok", merge: "no-padding" }]],
      { version: 1, lines: [], renderMode: "normal", colorLevel: 3, globalBold: false, minimalistMode: false },
      context()
    );

    expect(lines.join("\n")).toContain("ok:");
    expect(lines.join("\n")).toContain("value");
  });
});
