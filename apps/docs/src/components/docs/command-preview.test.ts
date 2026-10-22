import { describe, expect, it } from "vitest";
import {
  commandActions,
  commandMatches,
  firstEnabled,
  fuzzyScore,
  nextEnabled,
} from "./command-preview";

/**
 * The command-palette preview's arithmetic.
 *
 * The browser demo's whole claim is that it ranks and filters the way the
 * component does, and a reader cannot verify a score by looking at a palette.
 * These cases pin the three rules the native matcher (`menu/fuzzy.ts`) states —
 * non-contiguous matching, word starts beating a run inside a word, groups
 * keeping their order — plus the highlight never landing on a disabled row.
 */

describe("the command-palette preview", () => {
  it("matches characters in order, not necessarily together", () => {
    // `opfl` is the documented initials query for "Open file".
    expect(fuzzyScore("opfl", "Open file")).toBeTypeOf("number");
    expect(fuzzyScore("flie", "Open file")).toBeUndefined();
  });

  it("scores a word start above a run inside a word", () => {
    // `open` starts "Open file" at a word; in "Reopen closed tab" it starts
    // mid-word, so the same query ranks the first above the second.
    const scores = commandMatches("open").map((action) => action.id);

    expect(scores).toEqual(["open-file", "reopen-file"]);
  });

  it("keeps the caller's groups when a later group scores higher", () => {
    // `e` scores a word start in "Split editor" and only a mid-word run in
    // "New file", so the View row outscores the File row — and must still come
    // after it, because groups never reorder.
    const rows = commandMatches("e");
    const ids = rows.map((action) => action.id);

    expect(fuzzyScore("e", "Split editor")).toBeGreaterThan(
      fuzzyScore("e", "New file") ?? 0,
    );
    expect(ids.indexOf("new-file")).toBeLessThan(ids.indexOf("split"));
    // The pin: the higher score did not jump the group.
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
    // The only match for `restore` is the disabled action.
    expect(firstEnabled(commandMatches("restore"))).toBeUndefined();
    expect(nextEnabled(commandMatches("restore"), null, 1)).toBeUndefined();

    const enabled = commandMatches("");
    expect(nextEnabled(enabled, null, 1)).toBe("new-file");
    expect(nextEnabled(enabled, "new-file", -1)).toBe("symbol");
    expect(nextEnabled(enabled, "symbol", 1)).toBe("new-file");
  });
});
