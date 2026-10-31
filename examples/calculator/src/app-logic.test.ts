import { defaultModel, initialState } from "@gpuixui/calc";
import { describe, expect, it } from "vitest";
import {
  modeForShortcut,
  paletteEntries,
  paletteMatches,
  statusItems,
} from "./app-logic.js";

const model = defaultModel;

const entries = paletteEntries(model, {
  runEngine: () => undefined,
  toggleAppearance: () => undefined,
  showHistory: () => undefined,
});

describe("the calculator app's palette", () => {
  it("searches every function by label and keyword", () => {
    const determinant = entries.find(
      (entry) => entry.action.id === "matrix:det",
    );
    expect(determinant).toBeDefined();
    if (determinant !== undefined) {
      expect(paletteMatches(determinant, "det")).toBe(true);
      expect(paletteMatches(determinant, "determinant")).toBe(true);
    }
  });

  it("finds modes, bases and the manual's constants", () => {
    expect(entries.some((entry) => entry.action.id === "mode:BASE-N")).toBe(
      true,
    );
    expect(entries.some((entry) => entry.action.id === "base:HEX")).toBe(true);
    expect(entries.some((entry) => entry.action.id === "const:28")).toBe(true);
    expect(
      entries.some((entry) => entry.action.label.includes("speed of light")),
    ).toBe(true);
  });

  it("searches regression and integral in words", () => {
    const regression = entries.find((entry) =>
      entry.action.id.startsWith("stat:type:"),
    );
    expect(regression).toBeDefined();
    if (regression !== undefined)
      expect(paletteMatches(regression, "regression")).toBe(true);
    const integral = entries.find((entry) => entry.action.id === "fn:integral");
    expect(integral).toBeDefined();
    if (integral !== undefined)
      expect(paletteMatches(integral, "integrate")).toBe(true);
  });

  it("keeps app actions after the model's rows", () => {
    expect(entries[entries.length - 1]?.action.id).toBe("app:history");
    expect(entries.some((entry) => entry.action.id === "app:appearance")).toBe(
      true,
    );
  });

  it("maps ⌘1…⌘8 to the manual's modes", () => {
    expect(modeForShortcut(1)).toBe("COMP");
    expect(modeForShortcut(4)).toBe("BASE-N");
    expect(modeForShortcut(8)).toBe("VECTOR");
    expect(modeForShortcut(9)).toBeNull();
  });

  it("reads the status bar from the session, not from the press history", () => {
    const state = initialState();
    const items = statusItems(state);
    expect(items.left.map((item) => item.label)).toEqual([
      "COMP",
      "Deg",
      "Norm1",
      "MthIO-MathO",
      "M —",
    ]);
    expect(items.right.some((item) => item.label.includes("⌘K"))).toBe(true);
  });
});
