/**
 * Guards the gap plan 315 closed, completed by plan 319. `inputForeground` is
 * the role for typed text, and plan 059 measured it on the `input` fill only.
 * Five shipped components paint a transparent input on a `Surface` tone
 * instead:
 *
 * - `SearchInput` (root `background`, inner `<input>` `inputForeground`);
 * - `InlineEdit` (input `background`);
 * - `ColorPicker` (input `background`);
 * - `TagInput` and `MentionInput` (root `background`, transparent input).
 *
 * Plan 315 added the `background` canvas; plan 319 adds the other three
 * `Surface` tones, because a sidebar search sits on `muted`, a command palette's
 * field on `popover` and a settings form on `card` — the surfaces plan 317 made
 * first class for the placeholder. Plan 527 adds the four row washes: an
 * `InlineEdit` swaps a row's text for a field in place, and a row paints
 * `hover`/`active`/`accent`/`selected` behind it. A copied platform style that
 * retints one of those surfaces while keeping the identity's `inputForeground`
 * could erase typed text while `themeContrastFailures` returned `[]`. Every
 * shipped set passes, so no colour moves.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getTheme,
  lightColors,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const themes: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const typedTextPairs = contrastPairs.filter(
  ([foreground]) => foreground === "inputForeground",
);

const surfacesOf = (background: string) =>
  typedTextPairs.filter(([, surface]) => surface === background);

describe("typed text on the canvas field", () => {
  it("documents the four Surface tones, the input fill and the row washes, once each", () => {
    [
      "background",
      "card",
      "popover",
      "muted",
      "hover",
      "active",
      "accent",
      "selected",
    ].forEach((surface) => {
      expect(surfacesOf(surface), surface).toEqual([
        ["inputForeground", surface, "body"],
      ]);
    });
    expect(surfacesOf("input")).toEqual([["inputForeground", "input", "body"]]);
    expect(typedTextPairs).toHaveLength(9);
  });

  it("keeps every shipped theme above its declared floor", () => {
    const failures = themes.flatMap(([label, theme]) =>
      typedTextPairs.flatMap(([foreground, background, pairClass]) => {
        const floor = contrastFloors[theme.contrast][pairClass];
        const ratio = contrastRatio(
          theme.colors[foreground],
          theme.colors[background],
        );
        return ratio >= floor
          ? []
          : [`${label}: ${foreground} on ${background} at ${ratio} < ${floor}`];
      }),
    );

    expect(failures).toEqual([]);
  });

  it("reports a canvas that erases typed text", () => {
    const regressed = extendTheme(getTheme("light"), {
      colors: { background: lightColors.inputForeground },
    });
    const failures = themeContrastFailures(regressed);

    expect(
      failures.some(
        ({ foreground, background, pairClass, floor }) =>
          foreground === "inputForeground" &&
          background === "background" &&
          pairClass === "body" &&
          floor === contrastFloors.default.body,
      ),
    ).toBe(true);
  });

  it("reports a quiet panel that erases a transparent field's text", () => {
    const regressed = extendTheme(getTheme("light"), {
      colors: { muted: lightColors.inputForeground },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background }) =>
        foreground === "inputForeground" && background === "muted",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("body");
    expect(failures[0]?.floor).toBe(contrastFloors.default.body);
    expect(failures[0]?.ratio).toBeCloseTo(1, 5);
  });

  it("keeps the input fill measured beside the canvas", () => {
    const regressed = extendTheme(getTheme("light"), {
      colors: { input: lightColors.inputForeground },
    });

    expect(
      themeContrastFailures(regressed).some(
        ({ foreground, background }) =>
          foreground === "inputForeground" && background === "input",
      ),
    ).toBe(true);
  });
});
