/**
 * Accelerator parsing and formatting.
 *
 * The bug these guard: a chord that renders the macOS glyph on Windows, a
 * platform-dependent `mod` that ignores its argument, and an empty segment that
 * becomes a phantom keycap.
 */

import { describe, expect, it } from "vitest";
import { formatAccelerator, parseAccelerator } from "./accelerator.js";

describe("parseAccelerator", () => {
  it("trims and lower-cases its segments", () => {
    expect(parseAccelerator(" Mod + Shift + K ")).toEqual([
      "mod",
      "shift",
      "k",
    ]);
  });

  it("drops empty segments", () => {
    expect(parseAccelerator("mod++k")).toEqual(["mod", "k"]);
    expect(parseAccelerator("")).toEqual([]);
  });

  it("names the literal plus key", () => {
    // A plus key is a token, not a stray separator (plan 694).
    expect(parseAccelerator("mod++")).toEqual(["mod", "plus"]);
    expect(parseAccelerator("++")).toEqual(["plus"]);
    expect(formatAccelerator("mod++", "darwin")).toEqual(["⌘", "+"]);
    expect(formatAccelerator("plus", "linux")).toEqual(["+"]);
  });
});

describe("formatAccelerator", () => {
  it("adapts mod to the platform", () => {
    expect(formatAccelerator("mod+k", "darwin")).toEqual(["⌘", "K"]);
    expect(formatAccelerator("mod+k", "win32")).toEqual(["Ctrl", "K"]);
    expect(formatAccelerator("mod+k", "linux")).toEqual(["Ctrl", "K"]);
    expect(formatAccelerator("mod+k", "default")).toEqual(["Ctrl", "K"]);
  });

  it("keeps cmd and ctrl specific on every platform", () => {
    expect(formatAccelerator("cmd+k", "win32")).toEqual(["⌘", "K"]);
    expect(formatAccelerator("ctrl+k", "darwin")).toEqual(["Ctrl", "K"]);
  });

  it("formats alt and shift per platform", () => {
    expect(formatAccelerator("alt+shift", "darwin")).toEqual(["⌥", "⇧"]);
    expect(formatAccelerator("option+shift", "linux")).toEqual([
      "Alt",
      "Shift",
    ]);
  });

  it("maps named keys", () => {
    expect(formatAccelerator("enter+escape+up+f5", "darwin")).toEqual([
      "↵",
      "Esc",
      "↑",
      "F5",
    ]);
  });

  it("upper-cases one printable character", () => {
    expect(formatAccelerator("j", "linux")).toEqual(["J"]);
  });

  it("keeps symbols as written", () => {
    expect(formatAccelerator("mod+,", "darwin")).toEqual(["⌘", ","]);
    expect(formatAccelerator("mod+/", "darwin")).toEqual(["⌘", "/"]);
  });

  it("keeps the author's order rather than canonicalising", () => {
    expect(formatAccelerator("shift+mod+k", "darwin")).toEqual(["⇧", "⌘", "K"]);
  });

  it("takes an explicit platform over the host default", () => {
    expect(formatAccelerator("mod+k", "win32")).not.toEqual(
      formatAccelerator("mod+k", "darwin"),
    );
  });
});
