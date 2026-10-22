/**
 * The three answers a theme toggler gives.
 *
 * The bug these guard: a glyph that describes the current mode rather than the
 * press (a moon in a dark application, which tells a reader nothing about what
 * pressing it does), a name that disagrees with the glyph, and a caller's copy
 * being replaced by the shipped default when it passes an empty string on
 * purpose.
 */

import { describe, expect, it } from "vitest";
import { toggleIcon, toggleLabel, toggleLabels, toggledMode } from "./logic.js";

describe("toggledMode", () => {
  it("requests the other mode", () => {
    expect(toggledMode("dark")).toBe("light");
    expect(toggledMode("light")).toBe("dark");
  });
});

describe("toggleIcon", () => {
  it("paints the mode a press switches to, not the current one", () => {
    expect(toggleIcon("dark")).toBe("sun");
    expect(toggleIcon("light")).toBe("moon");
  });
});

describe("toggleLabel", () => {
  it("names the press rather than the state", () => {
    expect(toggleLabel("dark")).toBe(toggleLabels.light);
    expect(toggleLabel("light")).toBe(toggleLabels.dark);
  });

  it("takes a caller's copy per direction, and keeps an empty name", () => {
    expect(toggleLabel("dark", { light: "Go light" })).toBe("Go light");
    expect(toggleLabel("light", { dark: "Go dark" })).toBe("Go dark");
    expect(toggleLabel("dark", { dark: "" })).toBe(toggleLabels.light);
    expect(toggleLabel("light", { dark: "" })).toBe("");
  });
});
