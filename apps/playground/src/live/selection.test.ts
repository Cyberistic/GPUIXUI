/**
 * Guards the live selection geometry.
 *
 * The bug in this class: a drag that starts on a box's edge or stops inside its
 * last glyph selects nothing or truncates the final word. The headless host
 * learned this from a real drag (plan `163` §8); the live host must use the same
 * points or its "selection contains the text" checks can pass on a partial copy.
 */
import { describe, expect, it } from "@effect/vitest";
import { selectionDrag } from "./selection.js";

const first = { x: 20, y: 40, width: 120, height: 20 };
const second = { x: 20, y: 64, width: 180, height: 20 };

describe("selectionDrag", () => {
  it("starts just inside the first box", () => {
    expect(selectionDrag(first, second).start).toEqual({ x: 22, y: 42 });
  });

  it("ends past the last box's right edge and near its bottom", () => {
    expect(selectionDrag(first, second).end).toEqual({ x: 200, y: 82 });
  });

  it("keeps the end past the right edge, not two pixels inside glyphs", () => {
    const { end } = selectionDrag(first, first);
    expect(end.x > first.x + first.width - 1).toBe(true);
  });
});
