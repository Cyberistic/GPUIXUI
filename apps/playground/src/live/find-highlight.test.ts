/**
 * Holds the `find-highlight` fixtures to the wash the probe asserts.
 *
 * The bug this guards: a find bar that hands a host no colour paints the
 * runtime's own accent, not the theme's `primary`, and a wash is a quad behind
 * the glyphs that no text read can see. The probe reads each block's own box,
 * so a reader that mistook a glyph's antialiased edge for a wash — or a fixture
 * that stopped deriving the composite from `findHighlight` — would turn the
 * defect into a silent pass. The frame cases draw the pixels the reader counts
 * and the theme cases read `findHighlight` itself.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import {
  contrastFloorsFor,
  contrastRatio,
  darkTheme,
  findHighlight,
} from "@gpuixui/tokens";
import { liveRegistry } from "./registry.js";
import {
  dominantWash,
  FIND_CHECKS,
  FIND_IDS,
  FIND_INK_FLOOR,
  FIND_LINE,
  FIND_QUERY,
  FIND_TOLERANCE,
  isWashPainted,
  nearColour,
  paintedWash,
  themedWashes,
} from "./find-highlight.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const readmeFlat = readme.replace(/\s+/g, " ");

/** An opaque colour, as the RGBA a capture stores. */
const rgba = (r: number, g: number, b: number): Pixels.Rgba =>
  new Pixels.Rgba({ r, g, b, a: 0xff });

/** A frame filled with `fill`, with `marks` painted at their own coordinates. */
const frameOf = (
  width: number,
  height: number,
  fill: Pixels.Rgba,
  marks: ReadonlyArray<readonly [number, number, Pixels.Rgba]>,
): Pixels.Pixels => {
  const data = new Uint8Array(width * height * 4);
  Arr.forEach(Arr.range(0, width * height - 1), (pixel) => {
    data[pixel * 4] = fill.r;
    data[pixel * 4 + 1] = fill.g;
    data[pixel * 4 + 2] = fill.b;
    data[pixel * 4 + 3] = fill.a;
  });
  Arr.forEach(marks, ([x, y, colour]) => {
    const at = (y * width + x) * 4;
    data[at] = colour.r;
    data[at + 1] = colour.g;
    data[at + 2] = colour.b;
    data[at + 3] = colour.a;
  });
  return new Pixels.Pixels({ width, height, data });
};

const STRIP = "#191D25";
const INK = "#EDEFF3";
const WASH = "#5F4BDB66";
const PAINTED = paintedWash(STRIP, WASH);

/** {@link PAINTED} as the bytes a frame holds; the wash cases assert the hex. */
const PAINTED_RGBA = Option.getOrElse(
  Option.fromNullishOr(Pixels.hexToRgba(PAINTED)),
  () => rgba(0, 0, 0),
);

const BOX = { x: 0, y: 0, width: 6, height: 4 } as const;

/** A frame whose block painted a wash band and a glyph core. */
const drawn = (): Pixels.Pixels => {
  const strip = rgba(0x19, 0x1d, 0x25);
  const wash = PAINTED_RGBA;
  const ink = rgba(0xed, 0xef, 0xf3);
  const marks: Array<readonly [number, number, Pixels.Rgba]> = [];
  Arr.forEach(Arr.range(0, 2), (x) =>
    Arr.forEach(Arr.range(0, 3), (y) => {
      marks.push([x, y, wash]);
    }),
  );
  marks.push([4, 1, ink], [5, 1, ink]);
  return frameOf(6, 4, strip, marks);
};

/** A frame whose block painted only glyphs. */
const glyphsOnly = (): Pixels.Pixels => {
  const strip = rgba(0x19, 0x1d, 0x25);
  const ink = rgba(0xed, 0xef, 0xf3);
  return frameOf(6, 4, strip, [
    [1, 1, ink],
    [2, 1, ink],
  ]);
};

describe("the find-highlight reader", () => {
  it("finds the wash and ignores the strip and the ink", () => {
    expect(dominantWash(drawn(), BOX, 1, STRIP, INK)).toEqual(
      Option.some({ hex: PAINTED, count: 12 }),
    );
  });

  it("reports no wash when a block painted only glyphs", () => {
    // A glyph's solid core is not a wash: it is the ink the block already had.
    expect(dominantWash(glyphsOnly(), BOX, 1, STRIP, INK)).toEqual(
      Option.none(),
    );
  });

  it("reads a crop at the capture's device scale", () => {
    const doubled = frameOf(12, 8, rgba(0x19, 0x1d, 0x25), [
      [2, 2, PAINTED_RGBA],
      [3, 2, PAINTED_RGBA],
    ]);
    expect(dominantWash(doubled, { ...BOX, width: 3 }, 2, STRIP, INK)).toEqual(
      Option.some({ hex: PAINTED, count: 2 }),
    );
  });

  it("reports an unread region rather than an absent wash", () => {
    expect(dominantWash(drawn(), { ...BOX, x: 40 }, 1, STRIP, INK)).toEqual(
      Option.none(),
    );
    expect(dominantWash(drawn(), BOX, 1, "not a colour", INK)).toEqual(
      Option.none(),
    );
  });

  it("needs more than an edge to call a wash painted", () => {
    expect(isWashPainted(FIND_INK_FLOOR)).toBe(false);
    expect(isWashPainted(FIND_INK_FLOOR + 1)).toBe(true);
  });

  it("compares a measured colour only inside the tolerance it is given", () => {
    expect(nearColour(PAINTED, PAINTED)).toBe(true);
    expect(nearColour("#5F4BDB66", "#5F4BDB67")).toBe(true);
    expect(nearColour("#5F4BDB", "#5F4BDC", 0)).toBe(false);
    expect(nearColour("not a colour", PAINTED)).toBe(false);
    expect(FIND_TOLERANCE).toBeGreaterThan(0);
  });
});

describe("the wash the fixture asks the theme for", () => {
  it("composites the translucent wash onto the block's strip", () => {
    // An opaque wash is the colour itself; a fully transparent one leaves the
    // strip; the share in between is a third colour, which is the composite the
    // frame must carry.
    expect(paintedWash(STRIP, "#5F4BDB")).toBe("#5F4BDB");
    expect(paintedWash(STRIP, "#5F4BDB00")).toBe(STRIP);
    expect(PAINTED).toMatch(/^#[0-9A-F]{6}$/);
    expect(nearColour(PAINTED, "#5F4BDB")).toBe(false);
  });

  it("moves the resting and active washes apart", () => {
    const wash = themedWashes(darkTheme);
    expect(nearColour(wash.rest, wash.active)).toBe(false);
    expect(findHighlight(darkTheme).activeColor).not.toBe(
      findHighlight(darkTheme).color,
    );
  });

  it("keeps the marked text at the theme's body floor", () => {
    // The composite is the colour the contract measured, not an approximation:
    // a reader whose match sat under the reading floor would be the defect.
    const wash = themedWashes(darkTheme);
    const floor = contrastFloorsFor(darkTheme).body;
    expect(
      contrastRatio(darkTheme.colors.foreground, wash.rest),
    ).toBeGreaterThanOrEqual(floor);
    expect(
      contrastRatio(darkTheme.colors.foreground, wash.active),
    ).toBeGreaterThanOrEqual(contrastFloorsFor(darkTheme).secondary);
  });

  it("puts one query on every block's line", () => {
    expect(FIND_LINE.split(FIND_QUERY).length - 1).toBe(1);
  });

  it("addresses the blocks with ids no other probe owns", () => {
    expect(new Set(Object.values(FIND_IDS)).size).toBe(
      Object.values(FIND_IDS).length,
    );
  });
});

describe("the find-highlight probe's record", () => {
  it("registers the probe with the search capability", () => {
    expect(
      Arr.filter(liveRegistry, (probe) => probe.id === "find-highlight"),
    ).toEqual([
      {
        id: "find-highlight",
        title: expect.stringContaining("find paints"),
        capability: "search",
      },
    ]);
  });

  it("prints the check count the probe asserts", () => {
    const printed = Number(
      /(\d+) checks, `--only find-highlight`/.exec(readme)?.[1] ?? Number.NaN,
    );
    expect(printed).toBe(FIND_CHECKS);
  });

  it("states the fallback the token package replaces", () => {
    expect(readmeFlat).toContain(
      "a host handed no colour paints the runtime's own accent",
    );
    expect(readmeFlat).toContain("findHighlight(theme)");
  });

  it("mounts the three blocks the section describes", () => {
    expect(scenarios).toContain("const FindHighlightProbe");
    expect(scenarios).toContain("testId={testId} highlight={spec}");
    expect(scenarios).toContain(
      "block(FIND_IDS.rest, { query: FIND_QUERY, ...highlight })",
    );
    expect(scenarios).toContain("block(FIND_IDS.active, {");
    expect(scenarios).toContain("activeIndex: 0");
    expect(scenarios).toContain(
      "block(FIND_IDS.runtime, { query: FIND_QUERY })",
    );
    expect(scenarios).toContain('ctx.host.capture("find-highlight")');
    expect(scenarios).toContain('ctx.host.pixels("find-highlight")');
  });
});
