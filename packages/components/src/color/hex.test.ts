/**
 * Hex colour normalisation.
 *
 * The bug these guard: a shorthand that is not expanded, an alpha form accepted
 * as if it were opaque, an uppercase value that never compares equal, and a
 * colour string accepted without the leading hash.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { isHexColor, normalizeHex, sameHex } from "./hex.js";

describe("normalizeHex", () => {
  it("expands a three-digit shorthand", () => {
    expect(normalizeHex("#ABC")).toEqual(Option.some("#aabbcc"));
    expect(normalizeHex("abc")).toEqual(Option.some("#aabbcc"));
  });

  it("lower-cases a six-digit value", () => {
    expect(normalizeHex("#AABBCC")).toEqual(Option.some("#aabbcc"));
  });

  it("adds a missing hash", () => {
    expect(normalizeHex("aabbcc")).toEqual(Option.some("#aabbcc"));
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeHex("  #aabbcc ")).toEqual(Option.some("#aabbcc"));
  });

  it("refuses four- and eight-digit forms", () => {
    expect(normalizeHex("#abcd")).toEqual(Option.none());
    expect(normalizeHex("#aabbccdd")).toEqual(Option.none());
  });

  it("refuses words and non-hex characters", () => {
    expect(normalizeHex("red")).toEqual(Option.none());
    expect(normalizeHex("#gggggg")).toEqual(Option.none());
    expect(normalizeHex("")).toEqual(Option.none());
  });
});

describe("isHexColor", () => {
  it("accepts the normal form only", () => {
    expect(isHexColor("#aabbcc")).toBe(true);
    expect(isHexColor("#AABBCC")).toBe(false);
    expect(isHexColor("abc")).toBe(false);
  });
});

describe("sameHex", () => {
  it("compares after normalisation", () => {
    expect(sameHex("#ABC", "aabbcc")).toBe(true);
    expect(sameHex("#abc", "#abd")).toBe(false);
    expect(sameHex("nope", "#abc")).toBe(false);
  });
});
