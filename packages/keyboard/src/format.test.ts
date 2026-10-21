/**
 * Keycap glyph display.
 *
 * The bug these guard: a glyph renderer that shows the macOS symbol on another
 * platform, or that fails to keep `cmd` and `ctrl` distinct.
 */

import { describe, expect, it } from "vitest";
import { formatSymbols } from "./display.js";

describe("formatSymbols", () => {
  it("resolves mod to the platform's primary modifier", () => {
    expect(formatSymbols("mod+k", "darwin")).toEqual(["⌘", "K"]);
    expect(formatSymbols("mod+k", "win32")).toEqual(["Ctrl", "K"]);
    expect(formatSymbols("mod+k", "linux")).toEqual(["Ctrl", "K"]);
    expect(formatSymbols("mod+k", "default")).toEqual(["Ctrl", "K"]);
  });

  it("orders modifiers by the platform convention", () => {
    // macOS renders Shift before Command (⇧⌘Z); other platforms keep Ctrl+Shift.
    expect(formatSymbols("mod+shift+z", "darwin")).toEqual(["⇧", "⌘", "Z"]);
    expect(formatSymbols("mod+shift+z", "win32")).toEqual([
      "Ctrl",
      "Shift",
      "Z",
    ]);
  });

  it("renders named-key glyphs through the engine", () => {
    expect(formatSymbols("meta+enter", "darwin")).toEqual(["⌘", "↵"]);
    expect(formatSymbols("mod+pageup", "darwin")).toEqual(["⌘", "PageUp"]);
  });

  it("keeps cmd and ctrl distinct on every platform", () => {
    expect(formatSymbols("cmd+k", "win32")).toEqual(["Win", "K"]);
    expect(formatSymbols("ctrl+k", "darwin")).toEqual(["⌃", "K"]);
    // Negative control: `mod` never renders ⌘ off macOS.
    expect(formatSymbols("mod+k", "win32")).not.toEqual(["⌘", "K"]);
  });
});
