/**
 * Guards two defects. Plan 511 shipped the native field's caret as the
 * `primary` **fill** because the accent is a `mark` pair on the `input` fill and
 * the four `Surface` tones; plan 527 established that `InlineEdit` swaps a row's
 * text for a field in place, on the four row washes the caret inherits onto.
 * On the shipped macOS dark set that fill measures **2.748:1** on `selected` and
 * **2.836:1** on `active`, under the 3:1 mark floor, so a caret in a selected
 * inline edit vanished while every theme check returned `[]`. The caret is the
 * accent's readable ink (`primaryText`): the eight text surfaces already hold it
 * at the secondary floor, and `caretPairs` adds the field's own `input` fill.
 *
 * The plan-511 regression the role already fixed stays: the runtime's built-in
 * dark caret (`#7C86FF`) measures 3.129:1 on the AAA light `input` and 2.795:1
 * on its quiet panel, under the 4.5:1 mark floor.
 *
 * The JSDoc on `nativeFieldTheme` used to credit `caretPairs` with all nine
 * surfaces; it publishes one. The case below holds the sentence to the two
 * lists that actually do.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  caretPairs,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
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

/** Every surface a field can sit on: its fill, the four tones and four washes. */
const caretSurfaces = [
  "input",
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

describe("native field caret", () => {
  it("carries the accent's readable ink on every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(nativeFieldTheme(theme).caret, theme.name).toBe(
        theme.colors.primaryText,
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

  it("records the fill the caret used to be, and why it could not stay", () => {
    const macOSDark = getPlatformTheme("darwin", "dark");
    // The pre-698 fill, kept as the historical evidence: plan 698 moved the
    // macOS dark accent so the selected-option check that paints `primary`
    // clears 3:1 on the selected fill.
    const oldPrimary = "#0A84FF";
    const oldSelected = "#1A4568";
    const selected = contrastRatio(oldPrimary, oldSelected);
    const active = contrastRatio(oldPrimary, macOSDark.colors.active);
    expect(selected).toBeCloseTo(2.748, 3);
    expect(active).toBeCloseTo(2.836, 3);
    expect(selected).toBeLessThan(contrastFloors.default.mark);
    expect(active).toBeLessThan(contrastFloors.default.mark);

    // The ink the caret paints clears both on the current fill, so the caret
    // remains the role fix; the fill move is the check's, not the caret's.
    const { caret } = nativeFieldTheme(macOSDark);
    expect(
      contrastRatio(caret, macOSDark.colors.selected),
    ).toBeGreaterThanOrEqual(contrastFloors.default.mark);
    expect(
      contrastRatio(caret, macOSDark.colors.active),
    ).toBeGreaterThanOrEqual(contrastFloors.default.mark);
  });

  it("reports a collapsed caret on the field and on a row wash", () => {
    const collapsedInput = extendTheme(lightTheme, {
      colors: { primaryText: lightTheme.colors.input },
    });
    expect(
      themeContrastFailures(collapsedInput).some(
        (failure) =>
          failure.foreground === "primaryText" &&
          failure.background === "input" &&
          failure.pairClass === "mark",
      ),
    ).toBe(true);

    const collapsedRow = extendTheme(lightTheme, {
      colors: { primaryText: lightTheme.colors.selected },
    });
    expect(
      themeContrastFailures(collapsedRow).some(
        (failure) =>
          failure.foreground === "primaryText" &&
          failure.background === "selected" &&
          failure.pairClass === "secondary",
      ),
    ).toBe(true);
  });

  it("follows edited ink instead of the fill", () => {
    const edited = extendTheme(lightTheme, {
      colors: { primaryText: "#7A1FA2" },
    });
    expect(nativeFieldTheme(edited).caret).toBe("#7A1FA2");
    expect(
      contrastRatio(nativeFieldTheme(edited).caret, edited.colors.input),
    ).toBeGreaterThanOrEqual(contrastFloors.default.mark);

    const movedFill = extendTheme(lightTheme, {
      colors: { primary: "#7A1FA2" },
    });
    expect(nativeFieldTheme(movedFill).caret).toBe(
      lightTheme.colors.primaryText,
    );
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

  it("publishes the caret list on the public contract", () => {
    expect(caretPairs).toEqual([["primaryText", "input", "mark"]]);
    // The other eight surfaces are the text contract's, at a stricter floor.
    const textSurfaces = caretSurfaces.filter((surface) => surface !== "input");
    textSurfaces.forEach((surface) => {
      expect(
        contrastPairs.some(
          ([foreground, background, pairClass]) =>
            foreground === "primaryText" &&
            background === surface &&
            pairClass === "secondary",
        ),
        surface,
      ).toBe(true);
    });
    expect(
      contrastPairs.some(
        ([foreground, background, pairClass]) =>
          foreground === "primaryText" &&
          background === "input" &&
          pairClass === "mark",
      ),
    ).toBe(true);
  });

  it("states which pair publishes each of the nine surfaces", () => {
    // The JSDoc credited `caretPairs` with all nine; it publishes the one mark
    // pair on `input`. The eight text surfaces belong to `primaryTextPairs`.
    const source = readFileSync(new URL("./styles.ts", import.meta.url), "utf8")
      .replace(/\n\s*\* ?/g, " ")
      .replace(/\s+/g, " ");
    expect(source).toContain(
      "`primaryTextPairs` holds the eight and {@link caretPairs} adds the field's own `input` fill as a mark",
    );

    const markSurfaces = caretPairs.map(([, background]) => background);
    const textSurfaces = contrastPairs
      .filter(
        ([foreground, background, pairClass]) =>
          foreground === "primaryText" &&
          pairClass !== "mark" &&
          caretSurfaces.some((surface) => surface === background),
      )
      .map(([, background]) => background);

    expect(new Set(textSurfaces).size).toBe(8);
    expect([...new Set([...textSurfaces, ...markSurfaces])].toSorted()).toEqual(
      [...caretSurfaces].toSorted(),
    );
  });

  it("runs the example", () => {
    const dark = getTheme("dark");
    expect(darkSearchField.theme.caret).toBe(dark.colors.primaryText);
    expect(darkSearchField.style.color).toBe(dark.colors.inputForeground);
  });
});
