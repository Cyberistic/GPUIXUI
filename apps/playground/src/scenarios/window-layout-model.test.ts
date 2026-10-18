/**
 * The window breakpoint rule: below `WIDE_MIN` the shell folds, at or above it
 * it shows the sidebar and the full action set.
 *
 * The tests pin each side of the boundary and prove the rule is width-only, so
 * a regression that widens the boundary or makes height matter fails here
 * rather than only in a native run.
 */
import { describe, expect, it } from "@effect/vitest";
import {
  SIDEBAR_WIDTH,
  TOOLBAR_HEIGHT,
  WIDE_MIN,
  layoutFor,
} from "./window-layout-model.js";

const at = (width: number, height = 800) => layoutFor({ width, height });

describe("layoutFor", () => {
  it("pins the published shell metrics", () => {
    expect(WIDE_MIN).toBe(1200);
    expect(SIDEBAR_WIDTH).toBe(240);
    expect(TOOLBAR_HEIGHT).toBe(36);
  });

  it("reports the wide layout at the boundary", () => {
    expect(at(WIDE_MIN).mode).toBe("wide");
  });

  it("reports the compact layout one pixel below the boundary", () => {
    expect(at(WIDE_MIN - 1).mode).toBe("compact");
  });

  it("gives the wide layout its sidebar and folds it away when compact", () => {
    expect(at(WIDE_MIN).sidebar).toBe(SIDEBAR_WIDTH);
    expect(at(WIDE_MIN - 1).sidebar).toBe(0);
  });

  it("shows fewer toolbar actions when compact", () => {
    expect(at(WIDE_MIN).actions).toBe(6);
    expect(at(WIDE_MIN - 1).actions).toBe(3);
  });

  it("breaks on width alone, not on height", () => {
    expect(at(WIDE_MIN, 200).mode).toBe("wide");
    expect(at(WIDE_MIN - 1, 2000).mode).toBe("compact");
  });

  it("treats a zero or negative width as compact", () => {
    expect(at(0).mode).toBe("compact");
    expect(at(-1).mode).toBe("compact");
  });
});
