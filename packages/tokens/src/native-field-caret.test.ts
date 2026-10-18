/**
 * Guards the defect plan 511 fixes: the pinned native editor reads exactly one
 * paint from its `theme` prop — `caret` — and the package shipped no value for
 * it, so a field kept the runtime's built-in dark `#7C86FF`. That caret
 * measures **3.129:1** on the AAA light `input` and **2.795:1** on its quiet
 * panel, under the 4.5:1 mark floor the AAA theme declares, while every theme
 * check returned `[]` because no pair paints the runtime default.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastRatio,
  extendTheme,
  getTheme,
  highContrastLightTheme,
  lightTheme,
  nativeFieldTheme,
  themeContrastFailures,
} from "./index.js";
import { darkSearchField } from "./native-field.example.js";
import { shippedThemes } from "./shipped-themes.js";

/** The runtime's built-in caret, `oklch(0.673, 0.182, 276.935)`. */
const runtimeCaret = "#7C86FF";

/** Every surface a field can sit on: its own fill and the four `Surface` tones. */
const caretSurfaces = [
  "input",
  "background",
  "card",
  "popover",
  "muted",
] as const;

describe("native field caret", () => {
  it("carries the accent on every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(nativeFieldTheme(theme).caret, theme.name).toBe(
        theme.colors.primary,
      );
    });
  });

  it("holds the caret to the mark floor on every surface a field sits on", () => {
    shippedThemes.forEach(({ theme }) => {
      const floor = contrastFloors[theme.contrast].mark;
      const { caret } = nativeFieldTheme(theme);
      caretSurfaces.forEach((surface) => {
        expect(
          contrastRatio(caret, theme.colors[surface]),
          `${theme.name} on ${surface}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("replaces the runtime default the AAA theme cannot read", () => {
    expect(
      contrastRatio(runtimeCaret, highContrastLightTheme.colors.input),
    ).toBeCloseTo(3.129, 3);
    expect(
      contrastRatio(runtimeCaret, highContrastLightTheme.colors.muted),
    ).toBeCloseTo(2.795, 3);

    const highFloor = contrastFloors.high.mark;
    expect(
      contrastRatio(runtimeCaret, highContrastLightTheme.colors.input),
    ).toBeLessThan(highFloor);
    expect(
      contrastRatio(runtimeCaret, highContrastLightTheme.colors.muted),
    ).toBeLessThan(highFloor);

    // At the default level the same caret passes, which is why the omission
    // shipped invisibly: the AAA set is the one that fails.
    expect(
      contrastRatio(runtimeCaret, lightTheme.colors.input),
    ).toBeGreaterThanOrEqual(contrastFloors.default.mark);

    const { caret } = nativeFieldTheme(highContrastLightTheme);
    expect(
      contrastRatio(caret, highContrastLightTheme.colors.input),
    ).toBeGreaterThanOrEqual(highFloor);
    expect(
      contrastRatio(caret, highContrastLightTheme.colors.muted),
    ).toBeGreaterThanOrEqual(highFloor);
  });

  it("follows an edited accent instead of a stale copy", () => {
    const edited = extendTheme(lightTheme, {
      colors: { primary: "#7A1FA2" },
    });
    expect(nativeFieldTheme(edited).caret).toBe("#7A1FA2");
    expect(nativeFieldTheme(edited).caret).not.toBe(lightTheme.colors.primary);
    expect(
      contrastRatio(nativeFieldTheme(edited).caret, edited.colors.input),
    ).toBeGreaterThanOrEqual(contrastFloors.default.mark);
  });

  it("inherits the accent's public mark contract", () => {
    const collapsed = extendTheme(lightTheme, {
      colors: { primary: lightTheme.colors.input },
    });
    const failures = themeContrastFailures(collapsed).filter(
      (failure) =>
        failure.foreground === "primary" &&
        failure.background === "input" &&
        failure.pairClass === "mark",
    );
    expect(failures.length).toBeGreaterThan(0);
  });

  it("runs the example", () => {
    const dark = getTheme("dark");
    expect(darkSearchField.theme.caret).toBe(dark.colors.primary);
    expect(darkSearchField.style.color).toBe(dark.colors.inputForeground);
  });
});
