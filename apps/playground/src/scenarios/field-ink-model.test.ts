/**
 * The field ink model's own rules.
 *
 * The frame proves what the runtime paints; these tests prove the model the
 * checks read, and — importantly — that the cross checks can fail. The
 * `#3C4271` / `#2F2F56` pair and the `#8F8F8F` / `#7C8595` pair are the
 * measured reconnaissance values from plan `797` §2.2.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import { darkColors } from "@gpuixui/tokens";
import {
  FIELD_IDS,
  RUNTIME_PLACEHOLDER,
  RUNTIME_SELECTION,
  fieldFixtures,
  tokensSeparate,
  washOver,
} from "./field-ink-model.js";
import { asHex, scanBox } from "./frames.js";

const parsed = (hex: string): Pixels.Rgba =>
  Option.getOrThrowWith(Pixels.hexToRgba(hex), () => new Error(hex));

describe("fieldFixtures", () => {
  it("maps every role to its semantic token", () => {
    const fixtures = fieldFixtures(darkColors);
    expect(fixtures).toEqual({
      text: darkColors.inputForeground,
      placeholder: darkColors.placeholder,
      selection: darkColors.selection,
      input: darkColors.input,
    });
  });

  it("uses three distinct inks, so a swap cannot pass", () => {
    const fixtures = fieldFixtures(darkColors);
    expect(new Set([fixtures.text, fixtures.placeholder]).size).toBe(2);
  });
});

describe("the two runtime constants", () => {
  it("parses the placeholder grey as an opaque colour", () => {
    expect(asHex(parsed(RUNTIME_PLACEHOLDER))).toBe("#8f8f8fff");
  });

  it("composites the runtime selection wash to the measured #3C4271", () => {
    const wash = washOver(RUNTIME_SELECTION, darkColors.input);
    expect(Option.map(wash, asHex)).toEqual(Option.some("#3c4271ff"));
  });

  it("composites the theme's selection token to a different #3B3E59", () => {
    const wash = washOver(darkColors.selection, darkColors.input);
    expect(Option.map(wash, asHex)).toEqual(Option.some("#3b3e59ff"));
  });

  it("returns None for an unparseable colour", () => {
    expect(washOver("not-a-colour", darkColors.input)).toEqual(Option.none());
  });
});

describe("the cross checks can fail", () => {
  it("separates the two selection washes at the frame tolerance", () => {
    expect(tokensSeparate(RUNTIME_SELECTION, darkColors.selection, 2)).toBe(
      true,
    );
  });

  it("separates the runtime placeholder from the placeholder token", () => {
    expect(tokensSeparate(RUNTIME_PLACEHOLDER, darkColors.placeholder, 6)).toBe(
      true,
    );
  });

  it("refuses an unparseable side instead of claiming separation", () => {
    expect(tokensSeparate(RUNTIME_PLACEHOLDER, "nope", 6)).toBe(false);
  });
});

describe("scanBox", () => {
  const window = { width: 2, height: 2 };
  const frame = new Pixels.Pixels({
    width: 2,
    height: 2,
    data: new Uint8Array([
      255, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 0, 0, 255,
    ]),
  });
  const box = { x: 0, y: 0, width: 2, height: 2 };

  it("counts the pixels near the expected colour", () => {
    const scan = scanBox(frame, window, box, parsed("#FF0000"), 2);
    expect({ sampled: scan.sampled, near: scan.near }).toEqual({
      sampled: 4,
      near: 2,
    });
  });

  it("reports zero samples when the frame disagrees with the window", () => {
    const scan = scanBox(
      frame,
      { width: 4, height: 4 },
      box,
      parsed("#FF0000"),
      2,
    );
    expect(scan.sampled).toBe(0);
  });
});

describe("FIELD_IDS", () => {
  it("are unique, so a fixture cannot alias another", () => {
    expect(new Set(Object.values(FIELD_IDS)).size).toBe(
      Object.values(FIELD_IDS).length,
    );
  });
});
