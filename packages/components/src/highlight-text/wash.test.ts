/**
 * The wash a find surface hands the runtime.
 *
 * The bugs these guard: a search marking its matches with the `selection` role,
 * which is a reading aid rather than a find wash and was never measured for the
 * active share; a caller's colour losing to the theme's; a corner the runtime
 * defaults to 2px because no theme step reached it; and an active index applied
 * to a mark the sweep has not painted, which paints the wrong match.
 */

import { findHighlight, themes } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { activeMarkOf, washFor } from "./wash.js";

describe("activeMarkOf", () => {
  it("addresses a mark the sweep has painted", () => {
    expect(activeMarkOf(1, 3)).toBe(1);
    expect(activeMarkOf(0, 1)).toBe(0);
  });

  it("refuses an index past the marks on screen", () => {
    expect(activeMarkOf(2, 2)).toBeUndefined();
    expect(activeMarkOf(1, 1)).toBeUndefined();
    expect(activeMarkOf(0, 0)).toBeUndefined();
  });

  it("refuses an index that is not a mark", () => {
    expect(activeMarkOf(-1, 3)).toBeUndefined();
    expect(activeMarkOf(1.5, 3)).toBeUndefined();
    expect(activeMarkOf(Number.NaN, 3)).toBeUndefined();
    expect(activeMarkOf(undefined, 3)).toBeUndefined();
  });
});

describe("washFor", () => {
  it("paints the theme's find wash rather than the selection role", () => {
    const derived = findHighlight(themes.light);

    expect(washFor(themes.light, {}, 2).color).toBe(derived.color);
    expect(washFor(themes.light, {}, 2).activeColor).toBe(derived.activeColor);
    expect(washFor(themes.light, {}, 2).color).not.toBe(
      themes.light.colors.selection,
    );
  });

  it("takes the caller's colours over the theme's", () => {
    const wash = washFor(
      themes.dark,
      { color: "#123456", activeColor: "#abcdef" },
      1,
    );

    expect(wash.color).toBe("#123456");
    expect(wash.activeColor).toBe("#abcdef");
  });

  it("carries the theme's tightest corner, not the runtime's 2px", () => {
    expect(washFor(themes.dark, {}, 1).radius).toBe(
      findHighlight(themes.dark).radius,
    );
    expect(washFor(themes.dark, {}, 1).radius).toBe(themes.dark.radius.sm);
  });

  it("hands the host only an active mark it can paint", () => {
    expect(washFor(themes.light, { activeIndex: 1 }, 2).activeIndex).toBe(1);
    expect(washFor(themes.light, { activeIndex: 2 }, 2).activeIndex).toBe(
      undefined,
    );
  });
});
