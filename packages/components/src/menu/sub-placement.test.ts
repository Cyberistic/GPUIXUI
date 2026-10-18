/**
 * Submenu placement.
 *
 * The bug these guard (plan 382): the submenu was always placed at the row's
 * right edge and left to `fit="snap"`, so at the window edge the runtime clamped
 * it back over the row and the parent menu. The rule also decides the vertical
 * side, because a tall submenu below a low row would otherwise be moved up over
 * its trigger.
 */

import { describe, expect, it } from "vitest";
import {
  resolveSubmenuPoint,
  type SubmenuPlacementInput,
} from "./sub-placement.js";

const window = { width: 1280, height: 800 } as const;

const input = (
  overrides: Partial<SubmenuPlacementInput>,
): SubmenuPlacementInput => ({
  row: { x: 100, y: 100, width: 100, height: 28 },
  surface: { x: 0, y: 0, width: 180, height: 38 },
  window,
  gap: 4,
  margin: 8,
  ...overrides,
});

describe("resolveSubmenuPoint", () => {
  it("opens at the row's right edge when the surface fits", () => {
    expect(resolveSubmenuPoint(input({}))).toEqual({ x: 204, y: 100 });
  });

  it("opens at the row's left edge when the right side has no room", () => {
    const point = resolveSubmenuPoint(
      input({ row: { x: 1005, y: 141, width: 170, height: 28 } }),
    );

    expect(point.x).toBe(821);
    expect(point.x + 180).toBeLessThanOrEqual(1005);
    expect(point.y).toBe(141);
  });

  it("names the roomier side when neither side fits", () => {
    const point = resolveSubmenuPoint(
      input({
        window: { width: 400, height: 800 },
        row: { x: 250, y: 100, width: 60, height: 28 },
        surface: { x: 0, y: 0, width: 300, height: 38 },
      }),
    );

    // The runtime snaps the overflow; the rule must name the left side because
    // it has more room (238 px against 78 px).
    expect(point.x).toBe(250 - 4 - 300);
  });

  it("prefers the right side when both sides have the same room", () => {
    const point = resolveSubmenuPoint(
      input({
        window: { width: 400, height: 800 },
        row: { x: 150, y: 100, width: 100, height: 28 },
      }),
    );

    expect(point.x).toBe(254);
  });

  it("keeps the row's top when the surface fits below it", () => {
    expect(
      resolveSubmenuPoint(
        input({ surface: { x: 0, y: 0, width: 180, height: 200 } }),
      ).y,
    ).toBe(100);
  });

  it("bottom-aligns a surface that would leave the window", () => {
    expect(
      resolveSubmenuPoint(
        input({
          row: { x: 100, y: 700, width: 100, height: 28 },
          surface: { x: 0, y: 0, width: 180, height: 200 },
        }),
      ).y,
    ).toBe(528);
  });

  it("starts at the margin when the surface is taller than the window", () => {
    expect(
      resolveSubmenuPoint(
        input({
          row: { x: 100, y: 700, width: 100, height: 28 },
          surface: { x: 0, y: 0, width: 180, height: 900 },
        }),
      ).y,
    ).toBe(8);
  });
});
