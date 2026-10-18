/**
 * The rule `Select` uses to keep its list off its own trigger.
 *
 * The bug it guards: GPUix's `FloatingLayer` is `side="bottom"` and
 * `fit="snap"`, and snap clamps the layer into the window without flipping it
 * (measured, plan 156 §8). A select at the window's bottom edge therefore
 * opened its list over the trigger (plan 066 §1). The side is chosen here.
 */

import { describe, expect, it } from "vitest";
import {
  availableOn,
  decideVerticalSide,
  type PlacementRequest,
  resolveHorizontalAlign,
} from "./floating.js";

const room = (overrides: Partial<PlacementRequest> = {}): PlacementRequest => ({
  triggerTop: 400,
  triggerBottom: 432,
  layerHeight: 68,
  viewportHeight: 800,
  margin: 8,
  ...overrides,
});

describe("decideVerticalSide", () => {
  it("opens below when the layer fits", () => {
    expect(decideVerticalSide(room())).toBe("bottom");
  });

  it("opens above when it does not fit below but fits above", () => {
    // below = 800 - 8 - 772 = 20, above = 740 - 8 = 732.
    expect(
      decideVerticalSide(room({ triggerTop: 740, triggerBottom: 772 })),
    ).toBe("top");
  });

  it("keeps the margin out of the available space", () => {
    // below = 60 with the margin, 68 without it: the margin is what decides.
    expect(
      decideVerticalSide(room({ triggerTop: 700, triggerBottom: 732 })),
    ).toBe("top");
  });

  it("treats an exact fit as fitting", () => {
    // below = 800 - 8 - 724 = 68 = the layer height.
    expect(
      decideVerticalSide(room({ triggerTop: 692, triggerBottom: 724 })),
    ).toBe("bottom");
  });

  it("picks the side with more room when neither fits", () => {
    const tall = { layerHeight: 600, margin: 8 } as const;
    // below = 460, above = 292.
    expect(
      decideVerticalSide(
        room({ ...tall, triggerTop: 300, triggerBottom: 332 }),
      ),
    ).toBe("bottom");
    // below = 160, above = 592.
    expect(
      decideVerticalSide(
        room({ ...tall, triggerTop: 600, triggerBottom: 632 }),
      ),
    ).toBe("top");
  });

  it("keeps a preferred top when it has room", () => {
    // A tooltip prefers above even though the layer would also fit below.
    expect(decideVerticalSide(room({ preferred: "top" }))).toBe("top");
  });

  it("falls back from a preferred top when only below has room", () => {
    expect(
      decideVerticalSide(
        room({ preferred: "top", triggerTop: 8, triggerBottom: 40 }),
      ),
    ).toBe("bottom");
  });

  it("reports the space on each side, inside the margin", () => {
    // below = 800 - 8 - 432 = 360; above = 400 - 8 = 392.
    expect(availableOn(room(), "bottom")).toBe(360);
    expect(availableOn(room(), "top")).toBe(392);
  });
});

describe("resolveHorizontalAlign", () => {
  it("leaves start and end alone", () => {
    expect(
      resolveHorizontalAlign({
        align: "start",
        triggerWidth: 400,
        layerWidth: 42,
      }),
    ).toStrictEqual({ align: "start", offset: 0 });
    expect(
      resolveHorizontalAlign({
        align: "end",
        triggerWidth: 400,
        layerWidth: 42,
      }),
    ).toStrictEqual({ align: "end", offset: 0 });
  });

  it("turns center into start plus half the difference", () => {
    // The bug guarded (plan 095): the runtime's centre puts a 42-wide tip's end
    // on a 400-wide trigger's centre line, 179 px left of true centre.
    expect(
      resolveHorizontalAlign({
        align: "center",
        triggerWidth: 400,
        layerWidth: 42,
      }),
    ).toStrictEqual({ align: "start", offset: 179 });
  });

  it("shifts left when the layer is wider than its trigger", () => {
    expect(
      resolveHorizontalAlign({
        align: "center",
        triggerWidth: 100,
        layerWidth: 140,
      }),
    ).toStrictEqual({ align: "start", offset: -20 });
  });
});
