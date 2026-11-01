import { defaultModel, initialState } from "@gpuixui/calc";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  DEVICE,
  deviceUnit,
  modeMenu,
  modeMenuPick,
  shiftMenu,
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

describe("the device's menus and fit", () => {
  it("lists the eight modes as the LCD does and picks one by digit", () => {
    expect(modeMenu).toEqual([
      "1:COMP",
      "2:CMPLX",
      "3:STAT",
      "4:BASE-N",
      "5:EQN",
      "6:MATRIX",
      "7:TABLE",
      "8:VECTOR",
    ]);
    expect(modeMenuPick("6")).toEqual(Option.some("MATRIX"));
    expect(modeMenuPick("9")).toEqual(Option.none());
    expect(modeMenuPick("AC")).toEqual(Option.none());
  });

  it("opens SHIFT's number-key menus as panels", () => {
    expect(shiftMenu("7")).toEqual(
      Option.some({ _tag: "panel", tab: "catalog", mode: Option.none() }),
    );
    expect(shiftMenu("4")).toEqual(
      Option.some({ _tag: "panel", tab: "mode", mode: Option.some("MATRIX") }),
    );
    expect(shiftMenu("9")).toEqual(Option.some({ _tag: "setup" }));
    expect(shiftMenu("6")).toEqual(Option.none());
  });

  it("fits the whole device to the space it gets", () => {
    const u = deviceUnit(600, 480);
    expect(DEVICE.height * u).toBeLessThanOrEqual(480);
    expect(DEVICE.width * u).toBeLessThanOrEqual(600);
    expect(deviceUnit(4000, 4000)).toBe(1.3);
  });
});
