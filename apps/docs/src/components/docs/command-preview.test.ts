import { describe, expect, it } from "vitest";
import {
  commandActions,
  commandMatches,
  firstEnabled,
  fuzzyScore,
  nextEnabled,
} from "./command-preview";

describe("the command-palette preview", () => {
  it("matches characters in order, not necessarily together", () => {
    expect(fuzzyScore("opfl", "Open file")).toBeTypeOf("number");
    expect(fuzzyScore("flie", "Open file")).toBeUndefined();
  });

  it("scores a word start above a run inside a word", () => {
    const scores = commandMatches("open").map((action) => action.id);

    expect(scores).toEqual(["open-file", "reopen-file"]);
  });

  it("keeps the caller's groups when a later group scores higher", () => {
    const rows = commandMatches("e");
    const ids = rows.map((action) => action.id);

    expect(fuzzyScore("e", "Split editor")).toBeGreaterThan(
      fuzzyScore("e", "New file") ?? 0,
    );
    expect(ids.indexOf("new-file")).toBeLessThan(ids.indexOf("split"));

    expect(ids[0]).not.toBe("split");
  });

  it("shows every action in declaration order for an empty query", () => {
    expect(commandMatches("  ").map((action) => action.id)).toEqual(
      commandActions.map((action) => action.id),
    );
  });

  it("shows nothing for a query no label contains in order", () => {
    expect(commandMatches("zzz")).toEqual([]);
  });

  it("never highlights a disabled row and wraps at both ends", () => {
    expect(firstEnabled(commandMatches("restore"))).toBeUndefined();
    expect(nextEnabled(commandMatches("restore"), null, 1)).toBeUndefined();

    const enabled = commandMatches("");
    expect(nextEnabled(enabled, null, 1)).toBe("new-file");
    expect(nextEnabled(enabled, "new-file", -1)).toBe("symbol");
    expect(nextEnabled(enabled, "symbol", 1)).toBe("new-file");
  });
});
