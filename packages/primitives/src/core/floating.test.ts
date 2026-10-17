/**
 * The rule `Select` uses to keep its list off its own trigger.
 *
 * The bug it guards: GPUix's `FloatingLayer` is `side="bottom"` and
 * `fit="snap"`, and snap clamps the layer into the window without flipping it
 * (measured, plan 156 §8). A select at the window's bottom edge therefore
 * opened its list over the trigger (plan 066 §1). The side is chosen here.
 */

import { describe, expect, it } from "vitest";
import { decideVerticalSide, type PlacementRequest } from "./floating.js";

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
});
