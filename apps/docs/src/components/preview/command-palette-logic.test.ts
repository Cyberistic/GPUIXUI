import { describe, expect, it } from "vitest";
import { uniqueProjectName } from "../../../preview/patterns/command-palette-logic";

/**
 * The bug this guards: a duplicate action whose copy name is reused (or whose
 * second copy silently equals the first) makes the palette's visible result
 * contradict its promise — two rows named `atlas copy`, or a "duplicate" that
 * is the original name. The rule must skip every taken name.
 */
describe("command palette copy names", () => {
  it("names the first copy and then counts", () => {
    expect(uniqueProjectName("atlas", ["atlas"])).toBe("atlas copy");
    expect(uniqueProjectName("atlas", ["atlas", "atlas copy"])).toBe(
      "atlas copy 2",
    );
    expect(
      uniqueProjectName("atlas", ["atlas", "atlas copy", "atlas copy 2"]),
    ).toBe("atlas copy 3");
  });

  it("skips a copy name taken out of order", () => {
    expect(uniqueProjectName("atlas", ["atlas copy"])).toBe("atlas copy 2");
  });

  it("never returns the base name as the copy", () => {
    expect(uniqueProjectName("atlas", ["atlas"])).not.toBe("atlas");
  });

  it("keeps unrelated projects out of the sequence", () => {
    expect(uniqueProjectName("atlas", ["orbit", "atlas copy 2"])).toBe(
      "atlas copy",
    );
  });
});
