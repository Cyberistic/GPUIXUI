/**
 * Guards the window-backdrop fixture and its arithmetic.
 *
 * The probe asserts only two numbers: the fill at the box's centre and the
 * alpha in a corner the app leaves empty. Both are computed here from the
 * fixture, and a run costs a window — so a mistake in this module would be
 * reported as a runtime defect (`expected rgba(...), got rgba(...)`) rather
 * than as the stale constant it is. The three bugs these cases catch:
 *
 * 1. a mode whose expected surface alpha is wrong, so `transparent` passes on an
 *    opaque window (the claim the probe exists to make);
 * 2. a capture-scale rule that divides a frame which is not the window's box,
 *    which would sample a pixel outside the window and read it as paint;
 * 3. a fixture point that falls outside a window size the runner can open, so
 *    the check reads "outside the capture" for a reason unrelated to the mode.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import {
  BACKDROP_BOX,
  BACKDROP_FILL,
  BACKDROP_FILL_RGBA,
  backdropPoint,
  contentPoint,
  decodeWindowBackground,
  splitWindowBackground,
  surfaceAlpha,
  windowBackgrounds,
} from "./backdrop.js";
import { captureScale, describeColour, framePoint } from "./frame.js";

const size = { width: 900, height: 520 } as const;

describe("the backdrop expectation", () => {
  it("leaves an opaque window filled and a translucent one empty", () => {
    expect(
      Arr.map(windowBackgrounds, (mode) => [mode, surfaceAlpha(mode)]),
    ).toEqual([
      ["opaque", 255],
      ["transparent", 0],
      ["blurred", 0],
    ]);
  });

  it("holds the fixture's css fill to the rgba the frame is asserted against", () => {
    expect(
      Option.getOrNull(Option.fromNullishOr(Pixels.hexToRgba(BACKDROP_FILL))),
    ).toEqual(BACKDROP_FILL_RGBA);
    expect(describeColour(BACKDROP_FILL_RGBA)).toBe("rgba(217, 67, 43, 255)");
  });

  it("reads the mode a probe's readout paints and rejects anything else", () => {
    expect(Option.getOrNull(decodeWindowBackground("transparent"))).toBe(
      "transparent",
    );
    expect(Option.getOrNull(decodeWindowBackground(" blurred \n"))).toBe(
      "blurred",
    );
    expect(Option.isNone(decodeWindowBackground("glassy"))).toBe(true);
    expect(Option.isNone(decodeWindowBackground(""))).toBe(true);
  });
});

describe("the capture's geometry", () => {
  it("derives the device scale the display reports", () => {
    expect(
      Option.getOrNull(captureScale({ width: 1800, height: 1040 }, size)),
    ).toBe(2);
    expect(
      Option.getOrNull(captureScale({ width: 900, height: 520 }, size)),
    ).toBe(1);
  });

  it("refuses a frame that is not the window's box", () => {
    // A window captured at a different scale on each axis, a frame smaller than
    // the layout, and a fractional ratio are all "not this window": sampling a
    // logical point in them would read paint the probe never placed.
    expect(
      Option.isNone(captureScale({ width: 900, height: 1040 }, size)),
    ).toBe(true);
    expect(Option.isNone(captureScale({ width: 450, height: 260 }, size))).toBe(
      true,
    );
    expect(
      Option.isNone(captureScale({ width: 1801, height: 1040 }, size)),
    ).toBe(true);
    expect(Option.isNone(captureScale({ width: 0, height: 0 }, size))).toBe(
      true,
    );
  });

  it("converts a logical point into the capture", () => {
    expect(framePoint({ x: 100, y: 80 }, 2)).toEqual({ x: 200, y: 160 });
    expect(framePoint({ x: 100.4, y: 80.6 }, 1)).toEqual({ x: 100, y: 81 });
  });

  it("keeps both sample points inside every window the runner can open", () => {
    const sizes = Arr.map([400, 700, 900, 1200, 1680], (width) => ({
      width,
      height: Math.round(width * 0.58),
    }));
    expect(
      Arr.every(sizes, (window) => {
        const inside = backdropPoint(window);
        const inBox =
          contentPoint.x >= BACKDROP_BOX.x &&
          contentPoint.x <= BACKDROP_BOX.x + BACKDROP_BOX.width &&
          contentPoint.y >= BACKDROP_BOX.y &&
          contentPoint.y <= BACKDROP_BOX.y + BACKDROP_BOX.height;
        return (
          inBox &&
          inside.x > 0 &&
          inside.y > 0 &&
          inside.x < window.width &&
          inside.y < window.height &&
          // The corner sample must miss the box and the mode readout below it.
          inside.y > BACKDROP_BOX.y + BACKDROP_BOX.height + 40
        );
      }),
    ).toBe(true);
  });
});

describe("the live CLI's --window-background flag", () => {
  it("defaults to opaque and leaves the shared flags to the common parser", () => {
    const parsed = splitWindowBackground(["--only", "window-backdrop"]);
    expect(parsed.background).toBe("opaque");
    expect(parsed.unknown).toEqual([]);
    expect(parsed.rest).toEqual(["--only", "window-backdrop"]);
  });

  it("takes a value from anywhere in the argument list", () => {
    const parsed = splitWindowBackground([
      "--only",
      "window-backdrop",
      "--window-background",
      "transparent",
      "--json",
    ]);
    expect(parsed.background).toBe("transparent");
    expect(parsed.rest).toEqual(["--only", "window-backdrop", "--json"]);
    expect(parsed.unknown).toEqual([]);
  });

  it("rejects a value that is not a mode instead of opening an opaque window", () => {
    const missing = splitWindowBackground(["--window-background"]);
    expect(missing.unknown).toEqual(["--window-background needs a mode"]);
    expect(missing.background).toBe("opaque");

    const wrong = splitWindowBackground([
      "--window-background",
      "glassy",
      "--only",
      "window-backdrop",
    ]);
    expect(wrong.background).toBe("opaque");
    expect(wrong.rest).toEqual(["--only", "window-backdrop"]);
    expect(wrong.unknown).toEqual([
      "--window-background glassy is not a mode: opaque, transparent, blurred",
    ]);
  });
});
