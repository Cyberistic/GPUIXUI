/**
 * Guards the gap plan 723 closes: `selectedActive` is the fill a chosen row
 * keeps while the pointer is held, and a reader click-drags a text selection
 * with the button down, so the composited `selection` wash must stay visible on
 * it. The wash walk held the nine `selectionSurfaces` — `hover` and `active`
 * among them, the pointer states of an *unselected* row — plus the `disabled`
 * fill plan 524 added, and never the pressed selected row: a theme whose wash
 * composited to `selectedActive` returned `[]` from `themeFailures` while the
 * highlight measured 1.000:1 on the only surface a reader drags over while the
 * row is pressed.
 */
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getTheme,
  selectionWashPairs,
  shippedThemes,
  themeContrastFailures,
  type Theme,
} from "./index.js";

/** A theme's wash as the runtime paints it on `surface`. */
const washedOn = (theme: Theme, surface: keyof Theme["colors"]): string =>
  compositeOver(theme.colors.selection, theme.colors[surface]);

/** The `selection`/`surface` failures alone. */
const washFailures = (theme: Theme, surface: keyof Theme["colors"]) =>
  themeContrastFailures(theme).filter(
    ({ foreground, background, wash }) =>
      foreground === "selection" &&
      background === surface &&
      wash === "selection",
  );

describe("the selection wash on the pressed selected row", () => {
  it("publishes the wash on the pressed fill once", () => {
    const pair = ["selection", "selectedActive", "surface"] as const;

    expect(selectionWashPairs).toContainEqual([...pair]);
    expect(
      selectionWashPairs.filter(
        ([role, surface]) => role === pair[0] && surface === pair[1],
      ),
    ).toHaveLength(1);
    // The pair belongs to the wash walk, which is measured composited; the plain
    // contract must not gain a raw `selection` pair that would measure a
    // translucent colour against a fill.
    expect(contrastPairs).not.toContainEqual([...pair]);
  });

  it("holds every shipped set above the perceivability floor there", () => {
    const failures = shippedThemes.flatMap(({ theme }) => {
      const ratio = contrastRatio(
        washedOn(theme, "selectedActive"),
        theme.colors.selectedActive,
      );
      const floor = contrastFloors[theme.contrast].surface;
      return ratio >= floor ? [] : [`${theme.name}: ${ratio} < ${floor}`];
    });

    expect(failures).toEqual([]);
  });

  it("pins the pressed fill's tightest figure", () => {
    const worst = shippedThemes
      .map(
        ({ theme }) =>
          [
            theme.name,
            contrastRatio(
              washedOn(theme, "selectedActive"),
              theme.colors.selectedActive,
            ),
          ] as const,
      )
      .reduce((tightest, current) =>
        current[1] < tightest[1] ? current : tightest,
      );

    expect([worst[0], Number(worst[1].toFixed(3))]).toEqual([
      "High contrast dark",
      1.185,
    ]);
    // The pressed row is not the list's own minimum: `active` is, so adding it
    // cannot move the figure the catalogue quotes for the wash.
    const tightestWash = Math.min(
      ...selectionWashPairs.map(([, surface]) =>
        Math.min(
          ...shippedThemes.map(({ theme }) =>
            contrastRatio(washedOn(theme, surface), theme.colors[surface]),
          ),
        ),
      ),
    );

    expect(Number(tightestWash.toFixed(3))).toBe(1.061);
  });

  it("reports a highlight erased on the pressed fill", () => {
    const light = getTheme("light");
    // The wash's own base colour: painted over it, the highlight is the fill, so
    // the selection is invisible there and nowhere else.
    const fill = light.colors.selection.slice(0, 7);
    const regressed = extendTheme(light, {
      colors: { selectedActive: fill },
    });
    const failures = themeContrastFailures(regressed);
    const erased = washFailures(regressed, "selectedActive");

    expect(erased).toHaveLength(1);
    expect(erased[0]?.pairClass).toBe("surface");
    expect(erased[0]?.floor).toBe(contrastFloors.default.surface);
    // Every failure the plant reports is on the pressed fill, so the case names
    // the missing pair rather than a broken palette.
    expect(
      failures.filter(({ background }) => background !== "selectedActive"),
    ).toEqual([]);
  });
});
