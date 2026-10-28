/**
 * The colour model the picker commits through.
 *
 * The bugs these guard: a shorthand that is not expanded before it is saved, an
 * alpha channel dropped on the way back out, a grey that resets the hue a drag
 * was riding, a contrast ratio that measures a translucent fill as if it were
 * opaque, and a colour function accepted as a value the picker can paint.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  contrast,
  grade,
  hsvToRgb,
  Hsva,
  opaqueHex,
  parseColor,
  sameColor,
  storedDraft,
  storedSwatches,
  toHex,
} from "./logic.js";

/** A parsed colour, or `undefined` when the grammar refused it. */
const read = (input: string, hue = 0) =>
  Option.getOrUndefined(parseColor(input, hue));

describe("parseColor", () => {
  it("expands shorthand and accepts a missing hash", () => {
    expect(read("#f0a")).toEqual(new Hsva({ h: 320, s: 1, v: 1, a: 1 }));
    expect(read("f0a")).toEqual(read("#f0a"));
    expect(read("#F0A")).toEqual(read("#f0a"));
  });

  it("reads an alpha byte from the shorthand and the long form", () => {
    expect(read("#f0a8")?.a).toBeCloseTo(0x88 / 255, 5);
    expect(read("#FF00AA80")?.a).toBeCloseTo(0x80 / 255, 5);
    expect(read("#ff00aa")?.a).toBe(1);
  });

  it("refuses a colour function, a word and a malformed hex", () => {
    // The picker's one grammar. `rgb()`, `hsl()` and `oklch()` are absent
    // rather than half-read, so a value that commits is one it can paint.
    expect(read("rgb(255, 0, 0)")).toBeUndefined();
    expect(read("oklch(62.8% 0.25 29)")).toBeUndefined();
    expect(read("red")).toBeUndefined();
    expect(read("#12345")).toBeUndefined();
    expect(read("#gggggg")).toBeUndefined();
    expect(read("")).toBeUndefined();
  });

  it("keeps the caller's hue for a grey", () => {
    // A drag through the middle of the area is a grey; resetting the hue jumps
    // the thumb to red and loses the direction the pointer is travelling.
    expect(read("#808080", 210)?.h).toBe(210);
    expect(read("#FFFFFF", 47)?.s).toBe(0);
    expect(read("#000000", 47)?.v).toBe(0);
  });
});

describe("toHex", () => {
  it("writes the normal form with two uppercase alpha digits when needed", () => {
    expect(toHex(new Hsva({ h: 0, s: 1, v: 1, a: 1 }))).toBe("#FF0000");
    expect(toHex(new Hsva({ h: 0, s: 1, v: 1, a: 0.5 }))).toBe("#FF000080");
    expect(toHex(new Hsva({ h: 300, s: 1, v: 1, a: 1 }))).toBe("#FF00FF");
  });

  it("round-trips every channel through the parser", () => {
    const wrote = toHex(new Hsva({ h: 137, s: 0.42, v: 0.63, a: 0.75 }));
    expect(read(wrote)?.a).toBeCloseTo(0.749, 2);
    expect(opaqueHex(read(wrote) ?? new Hsva({ h: 0, s: 0, v: 0, a: 1 }))).toBe(
      wrote.slice(0, 7),
    );
  });
});

describe("sameColor", () => {
  it("compares colours, not spellings", () => {
    expect(sameColor("#ABC", "aabbcc")).toBe(true);
    expect(sameColor("#abc", "#abd")).toBe(false);
    expect(sameColor("nope", "#abc")).toBe(false);
  });
});

describe("contrast", () => {
  it("composites a translucent fill over the background before measuring", () => {
    const white = new Hsva({ h: 0, s: 0, v: 1, a: 1 });
    const halfBlack = new Hsva({ h: 0, s: 0, v: 0, a: 0.5 });
    // A 50% black over white is a mid grey, not the black fill itself.
    expect(Option.getOrUndefined(contrast(halfBlack, "#FFFFFF"))).toBeCloseTo(
      3.95,
      1,
    );
    expect(Option.getOrUndefined(contrast(white, "#FFFFFF"))).toBeCloseTo(1, 5);
    // The same fill over black is black: a translucent layer cannot lighten
    // the surface it is laid on.
    expect(Option.getOrUndefined(contrast(halfBlack, "#000000"))).toBeCloseTo(
      1,
      5,
    );
    expect(
      Option.getOrUndefined(
        contrast(new Hsva({ h: 0, s: 0, v: 1, a: 0.5 }), "#000000"),
      ),
    ).toBeCloseTo(5.32, 1);
  });

  it("refuses a background it cannot read instead of inventing one", () => {
    expect(
      contrast(new Hsva({ h: 0, s: 1, v: 1, a: 1 }), "not a colour"),
    ).toEqual(Option.none());
  });

  it("grades at the WCAG floors", () => {
    expect(grade(7)).toBe("AAA");
    expect(grade(6.99)).toBe("AA");
    expect(grade(4.5)).toBe("AA");
    expect(grade(3)).toBe("AA large");
    expect(grade(2.99)).toBe("Fails");
  });
});

describe("the channel helpers", () => {
  it("turns HSV into sRGB", () => {
    const rgb = hsvToRgb(new Hsva({ h: 300, s: 1, v: 1, a: 1 }));
    expect(
      [rgb.r, rgb.g, rgb.b].map((channel) => Math.round(channel * 255)),
    ).toEqual([255, 0, 255]);
    expect(opaqueHex(new Hsva({ h: 210, s: 1, v: 1, a: 1 }))).toBe("#0080FF");
  });
});

describe("the stored readers", () => {
  it("keeps a draft as written and reads a non-text value as absence", () => {
    expect(storedDraft("#AABBCC")).toEqual(Option.some("#AABBCC"));
    expect(storedDraft(null)).toEqual(Option.none());
    expect(storedDraft(42)).toEqual(Option.none());
  });

  it("keeps the palette a record saved and drops what it cannot name", () => {
    expect(storedSwatches(["#112233", null, "", "  ", 7, "#abc"])).toEqual(
      Option.some(["#112233", "#abc"]),
    );
    expect(storedSwatches(null)).toEqual(Option.none());
    expect(storedSwatches([])).toEqual(Option.some([]));
  });
});
