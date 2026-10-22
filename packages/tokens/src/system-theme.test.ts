/**
 * The palette a desktop hands an application, and the theme it becomes.
 *
 * The bug this guards: a platform palette is not a theme. Transplanting its
 * colours role-for-role leaves every filled role carrying the palette's body
 * ink — reading, on a violet accent, at whatever the two happen to measure —
 * and it leaves a deleted theme file in place, so the window keeps wearing a
 * palette the desktop no longer has. The mapper picks each on-colour by
 * measuring the palette's own inks, keeps every role the palette does not name
 * from the base theme, and names no colour of its own; the watcher applies the
 * first read at once and only re-applies a palette that changed.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditTheme } from "./audit.js";
import { contrastRatio } from "./contrast.js";
import {
  followDesktop,
  followPalette,
  manualTimer,
  nightPalette,
  paperPalette,
} from "./system-theme.example.js";
import {
  intervalTimer,
  paletteMode,
  paletteToTokens,
  watchSystemTheme,
  type SystemPalette,
} from "./system-theme.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  lightTheme,
  type Theme,
} from "./theme.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const isBaseValue = (
  base: Theme,
  palette: SystemPalette,
  value: string,
): boolean =>
  Object.values(base.colors).includes(value) ||
  Object.values(palette).some((entry) => entry === value);

describe("the palette a desktop hands over", () => {
  it("maps the roles the palette names", () => {
    const theme = paletteToTokens(nightPalette, darkTheme);

    expect(theme.colors.background).toBe(nightPalette.background);
    expect(theme.colors.foreground).toBe(nightPalette.foreground);
    expect(theme.colors.primary).toBe(nightPalette.accent);
    expect(theme.colors.muted).toBe(nightPalette.muted);
    expect(theme.colors.border).toBe(nightPalette.border);
    expect(theme.colors.destructive).toBe(nightPalette.danger);
    expect(theme.colors.selection).toBe(nightPalette.selection);
  });

  it("puts the ink on the fill that reads", () => {
    const night = paletteToTokens(nightPalette, darkTheme);
    const paper = paletteToTokens(paperPalette, lightTheme);
    const palePalette: SystemPalette = {
      ...paperPalette,
      accent: "#FFE08A",
    };
    const paleOnPaper = paletteToTokens(palePalette, lightTheme);

    // A pale accent on a near-black page carries the page as its ink; the same
    // accent on a paper page carries the paper's body ink instead. The chosen
    // value is always one of the palette's own inks, never the base theme's.
    expect(night.colors.primaryForeground).toBe(nightPalette.background);
    expect(paper.colors.primaryForeground).toBe(paperPalette.background);
    expect(paleOnPaper.colors.primaryForeground).toBe(paperPalette.foreground);

    // And it is the better of the two by measurement, which is the whole rule.
    const placedInk: ReadonlyArray<readonly [Theme, SystemPalette]> = [
      [night, nightPalette],
      [paper, paperPalette],
      [paleOnPaper, palePalette],
    ];
    placedInk.forEach(([theme, palette]) => {
      const fill = palette.accent ?? "";
      const chosen = contrastRatio(theme.colors.primaryForeground, fill) ?? 0;
      [palette.foreground, palette.background].forEach((candidate) => {
        expect(chosen).toBeGreaterThanOrEqual(
          contrastRatio(candidate, fill) ?? 0,
        );
      });
    });

    expect(paper.colors.destructiveForeground).toBe(paperPalette.background);
  });

  it("names no colour of its own", () => {
    [nightPalette, paperPalette].forEach((palette) => {
      const theme = paletteToTokens(palette, lightTheme);

      Object.values(theme.colors).forEach((value) => {
        expect(isBaseValue(lightTheme, palette, value)).toBe(true);
      });
    });
  });

  it("keeps every role the palette does not name", () => {
    const partial: SystemPalette = { background: "#202020" };
    const theme = paletteToTokens(partial, lightTheme);

    expect(theme.colors.background).toBe(partial.background);
    expect(theme.colors.foreground).toBe(lightTheme.colors.foreground);
    expect(theme.colors.primary).toBe(lightTheme.colors.primary);
    expect(theme.colors.card).toBe(lightTheme.colors.card);
    expect(theme.colors.ring).toBe(lightTheme.colors.ring);
    expect(theme.typography).toBe(lightTheme.typography);
    expect(theme.density).toBe(lightTheme.density);
    expect(theme.mode).toBe(lightTheme.mode);
  });

  it("returns the base theme unchanged for an empty palette", () => {
    expect(paletteToTokens({}, darkTheme)).toEqual(darkTheme);
    expect(paletteToTokens({}, highContrastDarkTheme)).toEqual(
      highContrastDarkTheme,
    );
  });

  it("reads the mode off the palette's page", () => {
    expect(paletteMode(nightPalette)).toBe("dark");
    expect(paletteMode(paperPalette)).toBe("light");
    expect(paletteMode({})).toBeUndefined();
    expect(paletteMode({ background: "oklch(0.4 0.1 260)" })).toBeUndefined();
  });

  it("follows the palette's page without a base to hand", () => {
    expect(followPalette(nightPalette).mode).toBe("dark");
    expect(followPalette(nightPalette).name).toBe(darkTheme.name);
    expect(followPalette(paperPalette).mode).toBe("light");
    expect(followPalette(paperPalette).colors.background).toBe(
      paperPalette.background,
    );
    // A palette that names no page has no mode to follow, so the default stands.
    expect(followPalette({ accent: "#B49CFF" }).mode).toBe("light");
  });

  it("carries the base theme's variant and shape", () => {
    const theme = paletteToTokens(
      { ...nightPalette },
      extendTheme(highContrastDarkTheme, { density: "comfortable" }),
    );

    expect(theme.contrast).toBe("high");
    expect(theme.mode).toBe("dark");
    expect(theme.density.name).toBe("comfortable");
  });
});

describe("following a palette", () => {
  /** A watch over a palette the test can change, driven by a manual timer. */
  const clock = (initial?: SystemPalette) => {
    const manual = manualTimer();
    const applied: Array<Theme> = [];
    let palette = initial;
    const stop = watchSystemTheme({
      read: () => palette,
      base: lightTheme,
      onChange: (theme) => applied.push(theme),
      every: 2000,
      timer: manual.timer,
    });
    return {
      applied,
      tick: manual.tick,
      stopped: manual.stopped,
      stop,
      change: (next: SystemPalette | undefined) => {
        palette = next;
      },
    };
  };

  it("applies the first read at once", () => {
    const { applied } = clock(nightPalette);

    expect(applied).toHaveLength(1);
    expect(applied[0]?.colors.background).toBe(nightPalette.background);
  });

  it("does not re-apply a palette that did not change", () => {
    const { applied, tick } = clock(nightPalette);
    tick();
    tick();

    expect(applied).toHaveLength(1);
  });

  it("re-applies once per change", () => {
    const { applied, change, tick } = clock(nightPalette);
    change({ ...nightPalette, accent: "#7CC7B0" });
    tick();
    tick();

    expect(applied).toHaveLength(2);
    expect(applied[1]?.colors.primary).toBe("#7CC7B0");
  });

  it("returns the base theme when the file is gone, once", () => {
    const { applied, change, tick } = clock(nightPalette);
    change(undefined);
    tick();
    tick();

    expect(applied).toEqual([
      paletteToTokens(nightPalette, lightTheme),
      lightTheme,
    ]);
  });

  it("stops polling when the caller stops", () => {
    const { stopped, stop } = clock(nightPalette);
    expect(stopped()).toBe(false);
    stop();
    expect(stopped()).toBe(true);
  });

  it("executes the documented call site", () => {
    let applied: Theme | undefined;
    followDesktop(
      () => paperPalette,
      (theme) => {
        applied = theme;
      },
    );

    expect(applied?.colors.background).toBe(paperPalette.background);
    expect(applied?.colors.primary).toBe(paperPalette.accent);
  });

  it("reports the mix a partial palette cannot serve", () => {
    const night = auditTheme(followPalette(nightPalette));
    const paper = auditTheme(followPalette(paperPalette));

    // The mapper does not promise a shippable theme: the palette's own inks are
    // chosen, but its single red still misses the ink floor on the base theme's
    // surface, and the roles the palette does not name belong to that base and
    // are measured on the palette's page.
    expect(night.passed).toBe(false);
    const ink = night.contrast.find(
      ({ foreground, background }) =>
        foreground === "destructiveForeground" && background === "destructive",
    );
    expect(ink?.ratio).toBeCloseTo(4.39, 1);
    const mark = night.indicators.find(({ role }) => role === "destructive");
    expect(mark?.ratio).toBeCloseTo(2.93, 1);
    expect(paper.decorative.length).toBeGreaterThan(0);

    // The catalogue teaches the measured mix rather than a promise.
    const catalogue = read("../../../docs/tokens.md");
    expect(catalogue).toContain("4.39:1");
    expect(catalogue).toContain("2.93:1");
  });

  it("ships an interval timer that can be cancelled", () => {
    let ticks = 0;
    const stop = intervalTimer.poll(1, () => {
      ticks += 1;
    });
    stop();

    expect(typeof stop).toBe("function");
    expect(ticks).toBe(0);
  });
});
