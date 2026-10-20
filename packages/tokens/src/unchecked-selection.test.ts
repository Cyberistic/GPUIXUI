/**
 * Guards the bug plan 733 fixes: an **unchecked** selection control had no
 * designed paint and no measured knob.
 *
 * A selection control's checked, disabled, focused and invalid states all have a
 * designed role, but the empty state had none: `primitives`
 * (`src/core/selection.ts`) draws a checkbox's edge with `input` — a field
 * *fill* — and a switch's track with `muted` — a *surface* — so on a card the
 * pair measures **1.000:1** in identity light (the edge) and on every platform
 * dark card (both), and the control has no shape at rest. The off switch's knob
 * (`foreground`) is painted on the `track` groove but was in no pair, so an
 * edited theme whose `foreground` equalled its `track` shipped a switch with no
 * knob while `themeFailures` returned `[]`.
 *
 * These cases hold the contract's new mark (the knob on the groove), prove the
 * shipped roles are the defect, and hold the designed composition to the floors
 * it is measured against. The design-system §8 row is guarded in `docs.test.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  platformNames,
  shippedThemes,
  themeFailures,
  themeTextTierFailures,
  trackMarkPairs,
  trackSurfacePairs,
} from "./index.js";
import { tierSurfaces } from "./figures.js";
import { emptySelectionStyle } from "./unchecked-selection.example.js";

const realPlatforms = platformNames.filter((name) => name !== "default");

const markPair = ["foreground", "track", "mark"] as const;

describe("the unchecked selection control", () => {
  it("holds the off switch's knob to the mark floor in every shipped set", () => {
    const failures = shippedThemes.flatMap(({ theme }) => {
      const floor = contrastFloors[theme.contrast].mark;
      const ratio = contrastRatio(theme.colors.foreground, theme.colors.track);
      return ratio >= floor
        ? []
        : [`${theme.name}: foreground on track at ${ratio} < ${floor}`];
    });

    expect(failures).toEqual([]);
  });

  it("publishes the knob once, on the groove, as a mark", () => {
    const published = contrastPairs.filter(
      ([foreground, background]) =>
        foreground === markPair[0] && background === markPair[1],
    );

    expect(published).toEqual([markPair]);
    expect(trackMarkPairs).toContainEqual(markPair);
  });

  it("reports a theme whose knob matches its own groove", () => {
    const base = getTheme("light");
    const planted = extendTheme(base, {
      colors: { foreground: base.colors.track },
    });

    const failures = themeFailures(planted).flatMap((failure) =>
      failure.kind === "contrast" &&
      failure.foreground === "foreground" &&
      failure.background === "track"
        ? [failure]
        : [],
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("mark");
  });

  it("proves the shipped roles leave the control with no shape", () => {
    const identityLight = getTheme("light");

    // The box's edge is `input` — a field fill — so on the canvas's card it
    // paints the card itself.
    expect(
      contrastRatio(identityLight.colors.input, identityLight.colors.card),
    ).toBe(1);

    // Six shipped sets paint both the switch's track (`muted`) and its edge
    // (`input`) under the surface floor on a card, so the control has neither a
    // fill nor an edge there.
    const blank = shippedThemes
      .filter(({ theme }) => {
        const floor = contrastFloors[theme.contrast].surface;
        return (
          contrastRatio(theme.colors.muted, theme.colors.card) < floor &&
          contrastRatio(theme.colors.input, theme.colors.card) < floor
        );
      })
      .map(({ theme }) => theme.name);

    expect(blank).toEqual([
      "Light",
      "Light · Linux",
      "Dark · Linux",
      "Dark · Windows",
      "Dark · Windows XP",
      "Dark · Windows 7",
    ]);

    // Every platform dark style sets the quiet panel to the card itself, so the
    // track alone fails there even where the edge survives.
    realPlatforms.forEach((platform) => {
      const theme = getPlatformTheme(platform, "dark");
      expect(
        contrastRatio(theme.colors.muted, theme.colors.card),
        platform,
      ).toBe(1);
    });
  });

  it("gives every shipped set a checkbox edge and an off-switch groove", () => {
    const failures = shippedThemes.flatMap(({ theme }) => {
      const floors = contrastFloors[theme.contrast];
      const box = emptySelectionStyle(theme, "checkbox");
      const toggle = emptySelectionStyle(theme, "switch");
      const track = toggle.backgroundColor ?? "";
      const rows = [
        [
          "borderStrong on card",
          contrastRatio(box.borderColor, theme.colors.card),
          floors.boundary,
        ],
        [
          "track on card",
          contrastRatio(track, theme.colors.card),
          floors.surface,
        ],
        ["knob on track", contrastRatio(toggle.knobColor, track), floors.mark],
      ] as const;

      return rows.flatMap(([label, ratio, floor]) =>
        ratio >= floor
          ? []
          : [`${theme.name}: ${label} at ${ratio} < ${floor}`],
      );
    });

    expect(failures).toEqual([]);
  });

  it("does not turn the knob into a text tier", () => {
    // A mark on a groove is not copy: the knob (`foreground`) and the muted
    // progress fill (`mutedForeground`) share `track`, but the text hierarchy
    // must not compare them there.
    expect(tierSurfaces(["mutedForeground", "foreground"])).not.toContain(
      "track",
    );

    const base = getTheme("light");
    const planted = extendTheme(base, {
      colors: { foreground: base.colors.track },
    });
    expect(
      themeTextTierFailures(planted).filter(
        ({ surface }) => surface === "track",
      ),
    ).toEqual([]);
  });

  it("keeps the designed composition inside the published pair lists", () => {
    const theme = getTheme("dark");
    const box = emptySelectionStyle(theme, "checkbox");
    const toggle = emptySelectionStyle(theme, "switch");

    expect(box.backgroundColor).toBeUndefined();
    expect(toggle.backgroundColor).toBe(theme.colors.track);
    expect(toggle.borderColor).toBe(theme.colors.borderStrong);
    expect(toggle.knobColor).toBe(theme.colors.foreground);

    const boundary = new Set(
      contrastPairs
        .filter(([role]) => role === "borderStrong")
        .map(([, background]) => background),
    );
    ["background", "card", "popover", "muted"].forEach((surface) =>
      expect(boundary, surface).toContain(surface),
    );
    const groove = new Set(
      trackSurfacePairs.map(([, background]) => background),
    );
    ["background", "card", "popover", "muted"].forEach((surface) =>
      expect(groove, surface).toContain(surface),
    );
  });
});
