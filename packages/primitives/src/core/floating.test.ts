/**
 * The rules `Select` and `Tooltip` use to keep a floating layer readable.
 *
 * The bugs they guard, both measured on this host (plans 066, 095, 098):
 * GPUix's `FloatingLayer` is `side="bottom"` and `fit="snap"`, and snap clamps
 * the layer into the window without flipping it, so a select at the bottom edge
 * opened over its trigger; and its `align="center"` puts the layer's end on the
 * anchor's centre line, half a layer off **on whichever axis the side uses** — so
 * the correction must take the difference on that axis (widths above/below,
 * heights beside).
 */

import { describe, expect, it } from "vitest";
import {
  availableOn,
  decideHorizontalSide,
  decideVerticalSide,
  type HorizontalPlacementRequest,
  type LayerSide,
  type PlacementRequest,
  resolveAlign,
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

  it("bounds a layer beside the trigger by the window, not the trigger", () => {
    // The bug guarded (plan 098): a left/right list was never capped because
    // only the vertical sides had a space rule; 30 options painted 908 px from
    // y 8 in an 800 px window and the last row was unreachable. The runtime's
    // `align="start"` puts the layer's top edge on the trigger's, so the free
    // space is the window below that edge, inside the margin.
    expect(
      availableOn(room({ triggerTop: 12, triggerBottom: 44 }), "left"),
    ).toBe(780);
    expect(
      availableOn(room({ triggerTop: 12, triggerBottom: 44 }), "right"),
    ).toBe(780);
    expect(availableOn(room(), "left")).toBe(392);
  });
});

describe("decideHorizontalSide", () => {
  const across = (
    overrides: Partial<HorizontalPlacementRequest> = {},
  ): HorizontalPlacementRequest => ({
    triggerLeft: 400,
    triggerRight: 432,
    layerWidth: 68,
    viewportWidth: 800,
    margin: 8,
    ...overrides,
  });

  it("opens right when the layer fits", () => {
    // after = 800 - 8 - 432 = 360; before = 400 - 8 = 392.
    expect(decideHorizontalSide(across())).toBe("right");
  });

  it("opens left when it does not fit right but fits left", () => {
    // The bug guarded (plan 335): a requested horizontal side was handed to the
    // runtime, whose `fit="snap"` clamps instead of flipping, so a side that
    // could not fit painted the layer over its trigger. after = 60, before = 692.
    expect(
      decideHorizontalSide(across({ triggerLeft: 700, triggerRight: 732 })),
    ).toBe("left");
  });

  it("keeps the margin out of the available space", () => {
    // after = 68 with the margin: the margin is what decides.
    expect(decideHorizontalSide(across({ triggerRight: 724 }))).toBe("right");
    expect(decideHorizontalSide(across({ triggerRight: 725 }))).toBe("left");
  });

  it("treats an exact fit as fitting", () => {
    // before = 76 - 8 = 68 on the preferred side.
    expect(
      decideHorizontalSide(across({ triggerLeft: 76, preferred: "left" })),
    ).toBe("left");
    expect(
      decideHorizontalSide(across({ triggerLeft: 75, preferred: "left" })),
    ).toBe("right");
  });

  it("picks the side with more room when neither fits", () => {
    const wide = { layerWidth: 600 } as const;
    // after = 460, before = 292.
    expect(
      decideHorizontalSide(
        across({ ...wide, triggerLeft: 300, triggerRight: 332 }),
      ),
    ).toBe("right");
    // after = 160, before = 592.
    expect(
      decideHorizontalSide(
        across({ ...wide, triggerLeft: 600, triggerRight: 632 }),
      ),
    ).toBe("left");
  });

  it("keeps a preferred left when it has room", () => {
    // Both sides fit; the request is what decides.
    expect(decideHorizontalSide(across({ preferred: "left" }))).toBe("left");
  });

  it("falls back from a preferred left when only right has room", () => {
    // before = 4, after = 360.
    expect(
      decideHorizontalSide(
        across({ triggerLeft: 12, triggerRight: 44, preferred: "left" }),
      ),
    ).toBe("right");
  });
});

describe("resolveAlign", () => {
  const request = (side: LayerSide, align: "start" | "center" | "end") => ({
    side,
    align,
    triggerWidth: 400,
    triggerHeight: 100,
    layerWidth: 42,
    layerHeight: 26,
  });

  it.each(["top", "right", "bottom", "left"] as const)(
    "leaves start and end alone on %s",
    (side) => {
      expect(resolveAlign(request(side, "start"))).toStrictEqual({
        align: "start",
        offset: 0,
      });
      expect(resolveAlign(request(side, "end"))).toStrictEqual({
        align: "end",
        offset: 0,
      });
    },
  );

  it("centres a layer above/below by width", () => {
    // The bug guarded (plan 095): the runtime's centre puts a 42-wide tip's end
    // on a 400-wide trigger's centre line, 179 px left of true centre.
    expect(resolveAlign(request("bottom", "center"))).toStrictEqual({
      align: "start",
      offset: 179,
    });
  });

  it("centres a layer beside the trigger by height", () => {
    // The bug guarded (plan 098): a width difference was handed to the runtime
    // as a vertical offset, so a `center` tip painted 90 px below its trigger.
    expect(resolveAlign(request("left", "center"))).toStrictEqual({
      align: "start",
      offset: 37,
    });
    expect(resolveAlign(request("right", "center"))).toStrictEqual({
      align: "start",
      offset: 37,
    });
  });

  it("shifts the other way when the layer is larger than its trigger", () => {
    expect(
      resolveAlign({
        ...request("bottom", "center"),
        triggerWidth: 100,
        layerWidth: 140,
      }),
    ).toStrictEqual({ align: "start", offset: -20 });
    expect(
      resolveAlign({
        ...request("left", "center"),
        triggerHeight: 20,
        layerHeight: 60,
      }),
    ).toStrictEqual({ align: "start", offset: -20 });
  });
});
