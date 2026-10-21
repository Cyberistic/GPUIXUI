/**
 * Guards the `register-font` probe's fixture.
 *
 * The probe proves a face paints by measuring text width, so the two ways it
 * could lie are silent: a swapped or corrupted font file (the family would fall
 * back and every sample would agree), and a family name that does not match the
 * one inside the file (the runtime derives the name from the file's own name
 * table, so a mismatch falls back without a word). Both are caught here without
 * a window, so a live failure means the paint, not the fixture.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { registerFonts, type FontRegistrar } from "@gpuixui/tokens";
import {
  MISSING_FAMILY,
  SQUARE_BYTES,
  SQUARE_FACE,
  SQUARE_FAMILY,
  SQUARE_GLYPHS,
  SQUARE_WORD,
  SQUARE_WORD_WIDTH,
} from "./fonts.js";

/** TrueType outlines: the sfnt version the runtime accepts. */
const sfntMagic = (bytes: Uint8Array): boolean =>
  bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0;

/** The UTF-16BE bytes of `text`, which is how a Windows name record stores it. */
const utf16be = (text: string): Uint8Array =>
  Uint8Array.from(
    Arr.flatMap(Arr.fromIterable(text), (char) => {
      const code = char.charCodeAt(0);
      return [code >> 8, code & 0xff];
    }),
  );

const containsRun = (bytes: Uint8Array, run: Uint8Array): boolean =>
  Array.from(bytes.keys()).some((start) =>
    run.every((value, offset) => bytes[start + offset] === value),
  );

describe("the square face", () => {
  it("is a TrueType file that declares the family the probe names", () => {
    expect(sfntMagic(SQUARE_BYTES)).toBe(true);
    expect(SQUARE_BYTES.length).toBeGreaterThan(0);
    // The runtime derives the family from this table: a file that does not
    // declare it silently falls back, which is the failure this guards.
    expect(containsRun(SQUARE_BYTES, utf16be(SQUARE_FAMILY))).toBe(true);
  });

  it("does not declare the family the fallback sample names", () => {
    expect(MISSING_FAMILY).not.toBe(SQUARE_FAMILY);
    expect(containsRun(SQUARE_BYTES, utf16be(MISSING_FAMILY))).toBe(false);
  });

  it("reaches the runtime once, under the family it declares", () => {
    const calls: Uint8Array[] = [];
    const registrar: FontRegistrar = {
      registerFont: (data) => {
        calls.push(data);
      },
    };
    expect(registerFonts(registrar, [SQUARE_FACE])).toEqual([SQUARE_FAMILY]);
    expect(registerFonts(registrar, [SQUARE_FACE])).toEqual([SQUARE_FAMILY]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe(SQUARE_BYTES);
  });

  it("lays the sample word out at the sum of its declared advances", () => {
    // The generator's table: A 1em, B 2em, m 1em at 1000 units per em.
    expect(SQUARE_WORD).toBe("ABm");
    expect(SQUARE_GLYPHS.map((glyph) => glyph.em)).toEqual([1, 2, 1]);
    expect(SQUARE_WORD_WIDTH).toBe(80);
  });
});
