/**
 * The gradient's arithmetic, without a renderer.
 *
 * The bugs these guard: a ramp that paints the same colour end to end; a
 * one-glyph line that divides by zero; an end the parser cannot read that
 * paints a hole instead of the start colour; a short hex or an alpha end read
 * as three channels; a word gap or an empty line counted as a glyph; and a
 * surrogate pair split into two glyphs.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  glyphCount,
  gradientColor,
  gradientLines,
  parseHexColor,
} from "./logic.js";

const glyphsOf = (
  lines: ReturnType<typeof gradientLines>,
): ReadonlyArray<string> =>
  lines.flatMap((line) =>
    line.words.flatMap((word) => word.glyphs.map((glyph) => glyph.text)),
  );

const colorsOf = (
  lines: ReturnType<typeof gradientLines>,
): ReadonlyArray<string> =>
  lines.flatMap((line) =>
    line.words.flatMap((word) => word.glyphs.map((glyph) => glyph.color)),
  );

const labelsOf = (
  lines: ReturnType<typeof gradientLines>,
): ReadonlyArray<string> =>
  lines.flatMap((line) =>
    line.words.flatMap((word) =>
      word.glyphs.flatMap((glyph) =>
        Option.match(glyph.label, {
          onNone: () => [],
          onSome: (label) => [label],
        }),
      ),
    ),
  );

describe("the ramp", () => {
  it("samples start, midpoint and end across a three-glyph run", () => {
    expect([
      gradientColor("#000000", "#ffffff", 0),
      gradientColor("#000000", "#ffffff", 0.5),
      gradientColor("#000000", "#ffffff", 1),
    ]).toEqual(["#000000", "#808080", "#ffffff"]);
  });

  it("reads a short hex as every channel doubled", () => {
    const parsed = parseHexColor("#abc");
    expect(
      Option.match(parsed, {
        onNone: () => "unreadable",
        onSome: (color) => color,
      }),
    ).toEqual({ red: 170, green: 187, blue: 204, alpha: 255 });
    expect(gradientColor("#000", "#fff", 1)).toBe("#ffffff");
  });

  it("interpolates the alpha of a four- or eight-digit hex", () => {
    expect(gradientColor("#00000000", "#ffffffff", 0.5)).toBe("#80808080");
    expect(gradientColor("#0000", "#ffff", 1)).toBe("#ffffff");
  });

  it("paints the start colour when either end is not hex", () => {
    expect(gradientColor("red", "#ffffff", 1)).toBe("red");
    expect(gradientColor("#000000", "red", 1)).toBe("#000000");
  });

  it("holds a non-finite or out-of-range position to the ramp", () => {
    expect(gradientColor("#000000", "#ffffff", Number.NaN)).toBe("#000000");
    expect(gradientColor("#000000", "#ffffff", -3)).toBe("#000000");
    expect(gradientColor("#000000", "#ffffff", 4)).toBe("#ffffff");
  });
});

describe("the glyph layout", () => {
  it("splits words, ignores blank lines and gaps, and paints in reading order", () => {
    const lines = gradientLines("Ship  it\n\n today ", "#000000", "#ffffff");

    expect(lines.map((line) => line.words.map((word) => word.label))).toEqual([
      ["Ship", "it"],
      ["today"],
    ]);
    expect(glyphsOf(lines).join("")).toBe("Shipittoday");
    expect(labelsOf(lines)).toEqual(["Ship", "it", "today"]);
  });

  it("gives every glyph in a word a sampled colour and one label", () => {
    const lines = gradientLines("abcd", "#000000", "#ffffff");
    const line = lines[0];
    if (line === undefined) throw new Error("expected one line");
    const word = line.words[0];

    expect(word?.glyphs.map((glyph) => glyph.color)).toEqual([
      "#000000",
      "#555555",
      "#aaaaaa",
      "#ffffff",
    ]);
    expect(word?.glyphs.map((glyph) => glyph.text)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(labelsOf([line])).toEqual(["abcd"]);
  });

  it("paints a single glyph at the start rather than dividing by zero", () => {
    const lines = gradientLines("A", "#123456", "#abcdef");

    expect(colorsOf(lines)).toEqual(["#123456"]);
    expect(glyphCount(lines)).toBe(1);
  });

  it("keeps a surrogate pair as one glyph", () => {
    const lines = gradientLines("A😀", "#000000", "#ffffff");

    expect(glyphsOf(lines)).toEqual(["A", "😀"]);
    expect(glyphCount(lines)).toBe(2);
  });

  it("restarts the ramp on each explicit line", () => {
    const lines = gradientLines("ab\ncd", "#000000", "#ffffff");

    expect(colorsOf(lines)).toEqual([
      "#000000",
      "#ffffff",
      "#000000",
      "#ffffff",
    ]);
  });

  it("counts no glyphs for a phrase that paints nothing", () => {
    expect(glyphCount(gradientLines(" \n\t", "#000000", "#ffffff"))).toBe(0);
  });
});
