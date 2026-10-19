/**
 * Guards the gap plan 317 closed. `placeholder` is the hint a field paints
 * before the reader types, and plan 059 measured it on the `input` fill only.
 * A transparent field is not tied to that fill: `primitives` exposes four
 * `Surface` tones, so a sidebar search sits on `muted`, a command palette's
 * field on `popover`, a settings form on `card`, and the canvas is the case
 * plan 315 recorded.
 *
 * The missing surfaces hid a shipped defect: the identity dark `placeholder`
 * (`#7C8595`) measures 4.03:1 on both `muted` and `popover` (`#222730`),
 * under the 4.5:1 secondary floor, and the `default` platform variant plus the
 * XP and Aero dark recipes inherit it. Every other shipped set clears the
 * floor, so only the identity dark value moves.
 *
 * Plan 527 adds the four row washes. The reference used to call "a field on a
 * row wash" out of scope, but `InlineEdit` swaps a row's text for a field in
 * place, and a row paints `hover`/`active`/`accent`/`selected` behind its
 * content. Every one of the twelve default sets missed the secondary floor on at
 * least one wash — identity dark `#858F9F` measured **3.132:1** on `selected`
 * — while the checker returned `[]`.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getTheme,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const themes: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const placeholderPairs = contrastPairs.filter(
  ([foreground]) => foreground === "placeholder",
);

describe("the placeholder on every surface a field sits on", () => {
  it("documents the input fill, the four Surface tones and the four row washes, once each", () => {
    expect(placeholderPairs).toEqual([
      ["placeholder", "input", "secondary"],
      ["placeholder", "background", "secondary"],
      ["placeholder", "card", "secondary"],
      ["placeholder", "popover", "secondary"],
      ["placeholder", "muted", "secondary"],
      ["placeholder", "hover", "secondary"],
      ["placeholder", "active", "secondary"],
      ["placeholder", "accent", "secondary"],
      ["placeholder", "selected", "secondary"],
      ["placeholder", "selectedActive", "secondary"],
    ]);
    placeholderPairs.forEach(([foreground, , pairClass]) => {
      expect(foreground).toBe("placeholder");
      expect(pairClass).toBe("secondary");
    });
  });

  it("keeps every shipped theme above its declared floor", () => {
    const failures = themes.flatMap(([label, theme]) =>
      placeholderPairs.flatMap(([foreground, background, pairClass]) => {
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

  it("reports the old dark value erased on the quiet panel and the dialog", () => {
    const regressed = extendTheme(getTheme("dark"), {
      colors: { placeholder: "#7C8595" },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background }) =>
        foreground === "placeholder" &&
        (background === "background" ||
          background === "card" ||
          background === "popover" ||
          background === "muted"),
    );

    expect(failures).toHaveLength(2);
    expect(new Set(failures.map(({ background }) => background))).toEqual(
      new Set(["muted", "popover"]),
    );
    failures.forEach(({ pairClass, floor, ratio }) => {
      expect(pairClass).toBe("secondary");
      expect(floor).toBe(contrastFloors.default.secondary);
      expect(ratio).toBeCloseTo(4.03, 1);
    });
  });

  it("reports a hint erased on a transparent field", () => {
    const light = getTheme("light");
    const regressed = extendTheme(light, {
      colors: { placeholder: light.colors.muted },
    });

    expect(
      themeContrastFailures(regressed).some(
        ({ foreground, background }) =>
          foreground === "placeholder" && background === "muted",
      ),
    ).toBe(true);
  });

  it("keeps the hint dimmer than secondary text on the quiet panel", () => {
    const dark = getTheme("dark");
    const hint = contrastRatio(dark.colors.placeholder, dark.colors.muted);
    const secondary = contrastRatio(
      dark.colors.mutedForeground,
      dark.colors.muted,
    );

    expect(hint).toBeGreaterThanOrEqual(contrastFloors.default.secondary);
    expect(hint).toBeLessThan(secondary);
  });
});
