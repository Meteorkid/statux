import { describe, expect, test } from "bun:test";
import { parseCliCommand } from "./args";

describe("parseCliCommand", () => {
  test("parses doctor command", () => {
    expect(parseCliCommand(["bun", "src/cli.ts", "doctor"])).toEqual({ type: "doctor" });
    expect(parseCliCommand(["bun", "src/cli.ts", "--doctor"])).toEqual({ type: "doctor" });
  });
});
