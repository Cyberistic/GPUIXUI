import { describe, expect, it } from "vitest";
import { enabledEntries, highlightAfter, menuEntries } from "./menu-preview";

const ids = enabledEntries.map((entry) => entry.id);

describe("the dropdown-menu preview", () => {
  it("has one row that cannot answer a key", () => {
    expect(menuEntries.length - enabledEntries.length).toBe(1);
    expect(menuEntries.filter((entry) => entry.disabled === true)).toHaveLength(
      1,
    );
  });

  it("skips the disabled row in both directions", () => {
    expect(highlightAfter("rename", 1)).toBe("hidden");
    expect(highlightAfter("hidden", -1)).toBe("rename");
  });

  it("wraps at both ends", () => {
    expect(highlightAfter("delete", 1)).toBe("rename");
    expect(highlightAfter("rename", -1)).toBe("delete");
  });

  it("starts at the first row for ArrowDown and the last for ArrowUp", () => {
    expect(highlightAfter(null, 1)).toBe(ids[0]);
    expect(highlightAfter(null, -1)).toBe(ids[ids.length - 1]);
  });

  it("never targets the disabled row from any position", () => {
    const unreachable = menuEntries.flatMap((entry) =>
      ([1, -1] as const).flatMap((delta) => {
        const next = highlightAfter(entry.id, delta);
        return next === null || ids.includes(next)
          ? []
          : [`${entry.id} ${delta} -> ${next}`];
      }),
    );

    expect(unreachable).toEqual([]);
  });
});
