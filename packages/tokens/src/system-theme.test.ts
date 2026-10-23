/**
 * The palette a desktop hands an application, and the theme it becomes.
 *
 * The bug this guards: a platform palette is not a theme. Transplanting its
 * colours role-for-role leaves every filled role carrying the palette's body
 * ink — reading, on a violet accent, at whatever the two happen to measure —
 * and it leaves a deleted theme file in place, so the window keeps wearing a
 * palette the desktop no longer has. A desktop's selection colour is a **fill**
 * rather than the wash the role is, so handing it over unchanged covers the page
 * it selects on. The mapper picks each on-colour by measuring the palette's own
 * inks, restates an opaque selection colour at the base theme's share, keeps
 * every role the palette does not name from the base theme, and names no colour
 * of its own; the watcher applies the first read at once and only re-applies a
 * palette that changed.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditTheme } from "./audit.js";
import { alpha, alphaOf, blend } from "./color.js";
import { contrastRatio } from "./contrast.js";
import {
  followDesktop,
  followPalette,
  manualTimer,
  nightPalette,
  paperPalette,
} from "./system-theme.example.js";
import { selectionFailures } from "./selection.js";
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

  it("paints a desktop's opaque selection colour at the theme's share", () => {
    const opaque: SystemPalette = { ...nightPalette, selection: "#B49CFF" };
    const night = paletteToTokens(opaque, darkTheme);

    // The platform's hue, at the base theme's own share rather than its opacity.
    expect(night.colors.selection).toBe(
      alpha("#B49CFF", alphaOf(darkTheme.colors.selection)),
    );
    expect(alphaOf(night.colors.selection)).toBeCloseTo(
      alphaOf(darkTheme.colors.selection),
      5,
    );
    // The wash this rule exists for: the run keeps its own text role.
    expect(selectionFailures(night)).toEqual([]);

    // The failure it prevents, built as the mapper used to: the same colour
    // handed over unchanged covers the page it is drawn on.
    const handedOver = extendTheme(paletteToTokens(nightPalette, darkTheme), {
      colors: { selection: "#B49CFF" },
    });
    const legibility = selectionFailures(handedOver).filter(
      ({ kind }) => kind === "legibility",
    );
    const onPage = legibility.find(
      ({ background }) => background === "background",
    );
    expect(legibility).toHaveLength(8);
    expect(onPage?.ratio).toBeCloseTo(1.81, 2);

    // A share the palette states itself is its own decision.
    expect(
      paletteToTokens({ ...opaque, selection: "#B49CFF26" }, darkTheme).colors
        .selection,
    ).toBe("#B49CFF26");

    // And the share is the base theme's, so a high-contrast brand keeps its own.
    const high = paletteToTokens(opaque, highContrastDarkTheme);
    expect(alphaOf(high.colors.selection)).toBeCloseTo(
      alphaOf(highContrastDarkTheme.colors.selection),
      5,
    );
    expect(selectionFailures(high)).toEqual([]);
  });

  it("prints the paint the window measured, not only the poll", () => {
    // The unit suite proves the mapping and the poll's arithmetic; the half a
    // consumer relies on is the paint — a running window repaints without
    // remounting and returns to its own theme when the desktop theme is
    // deleted. The playground's `system-theme-follow` measures that, and the
    // page used to send a reader to it as future work, so a proven follow read
    // exactly like a planned one. Every value below is derived, and the probe's
    // fixture must still carry the palettes the page prints.
    const catalogue = read("../../../docs/tokens.md");
    const readme = read("../README.md");
    const fixture = read("../../../apps/playground/src/live/system-theme.ts");
    const checks = /export const SYSTEM_THEME_CHECKS = (\d+)/.exec(
      fixture,
    )?.[1];

    const night = paletteToTokens(nightPalette, darkTheme);
    const paper = paletteToTokens(paperPalette, lightTheme);

    expect(checks, "the probe's check count").toBeDefined();
    [nightPalette, paperPalette].forEach((palette) => {
      expect(fixture).toContain(`background: "${palette.background}"`);
      expect(fixture).toContain(`accent: "${palette.accent}"`);
    });

    // The three states the probe reads off the frame.
    const painted = [
      night.colors.background,
      night.colors.primary,
      paper.colors.background,
      paper.colors.primary,
      darkTheme.colors.background,
      darkTheme.colors.primary,
    ];
    painted.forEach((value) => {
      expect(catalogue, `${value} on the page`).toContain(value);
    });

    [catalogue, readme].forEach((page) => {
      expect(page).toContain("system-theme-follow");
      expect(page).toContain(`${checks} checks`);
      // The retracted promise: the paint was the playground's to record.
      expect(page).not.toContain("is the playground's to record");
      expect(page).not.toContain("the playground's to record");
    });

    // The honest half stays: macOS host, the decoder is the consumer's, and
    // `omarchy-theme-set` itself was not run.
    expect(catalogue).toContain("`omarchy-theme-set` is not run");
    expect(catalogue).toContain("mount count stays `1`");
  });

  it("prints the selection rule it applies", () => {
    const catalogue = read("../../../docs/tokens.md");
    const design = read("../../../docs/design-system.md");
    const readme = read("../README.md");
    const opaque: SystemPalette = { ...nightPalette, selection: "#B49CFF" };
    const night = paletteToTokens(opaque, darkTheme);
    const legibility = selectionFailures(
      extendTheme(paletteToTokens(nightPalette, darkTheme), {
        colors: { selection: "#B49CFF" },
      }),
    ).filter(({ kind }) => kind === "legibility");
    const wash = blend(
      night.colors.background,
      night.colors.selection,
      alphaOf(night.colors.selection),
    );
    const readable = contrastRatio(night.colors.foreground, wash) ?? 0;

    // The numbers the page prints are the ones the mapper's rule produces.
    const onPage = legibility.find(
      ({ background }) => background === "background",
    );
    expect(catalogue).toContain(`${(onPage?.ratio ?? 0).toFixed(2)}:1`);
    expect(catalogue).toContain(`${legibility.length} of its placements`);
    expect(catalogue).toContain("A selection colour becomes a wash");
    expect(catalogue).toContain("`selection_foreground` cannot be honoured");
    expect(design).toContain("painted at the base theme's share");
    expect(readme).toContain(`${legibility.length} selection placements`);
    expect(readme).toContain(`${(onPage?.ratio ?? 0).toFixed(2)}:1`);
    // The derived wash is the readable one, which is why the rule exists.
    expect(selectionFailures(night)).toEqual([]);
    expect(readable).toBeGreaterThan(7);
  });

  it("names no colour of its own", () => {
    [
      nightPalette,
      paperPalette,
      // A desktop's selection colour is opaque, so the mapper restates it at the
      // base theme's share — the one value in the theme that is neither the
      // palette's nor the base's, and the rule the "selection" case below holds.
      { ...nightPalette, selection: "#B49CFF" },
    ].forEach((palette) => {
      const theme = paletteToTokens(palette, lightTheme);
      const derivedWash =
        palette.selection === undefined
          ? undefined
          : alpha(palette.selection, alphaOf(lightTheme.colors.selection));

      Object.values(theme.colors).forEach((value) => {
        expect(
          isBaseValue(lightTheme, palette, value) || value === derivedWash,
        ).toBe(true);
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

  it("takes a stated mode over the one a page's lightness implies", () => {
    // A desktop that says `light` has answered the question its page only
    // approximates — a mid-grey page is neither, and an inverted theme is a
    // choice rather than a measurement error.
    expect(paletteMode({ background: "#000000", mode: "light" })).toBe("light");
    expect(paletteMode({ background: "#FFFFFF", mode: "dark" })).toBe("dark");
    // A mode with no page is still an answer; nothing has to be measured.
    expect(paletteMode({ mode: "dark" })).toBe("dark");
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

  it("maps a palette onto the base its mode asks for", () => {
    // A desktop switches its light and dark themes, not only their colours: the
    // light page must land on the light base's surfaces, or the window wears a
    // light page with dark cards and the gate reports the mix.
    const manual = manualTimer();
    const applied: Array<Theme> = [];
    let palette: SystemPalette = { ...nightPalette, mode: "dark" };
    watchSystemTheme({
      read: () => palette,
      base: darkTheme,
      baseFor: (next) =>
        paletteMode(next) === "light" ? lightTheme : darkTheme,
      onChange: (theme) => applied.push(theme),
      every: 2000,
      timer: manual.timer,
    });
    palette = { ...paperPalette, mode: "light" };
    manual.tick();

    expect(applied).toHaveLength(2);
    expect(applied[1]?.mode).toBe("light");
    expect(applied[1]?.colors.background).toBe(paperPalette.background);
    expect(applied[1]?.colors.card).toBe(lightTheme.colors.card);

    // Without `baseFor` the watch keeps the base it started on, which is the
    // documented default rather than a second guess at the palette's mode.
    const fixedManual = manualTimer();
    const fixed: Array<Theme> = [];
    let next: SystemPalette = { ...nightPalette, mode: "dark" };
    watchSystemTheme({
      read: () => next,
      base: darkTheme,
      onChange: (theme) => fixed.push(theme),
      every: 2000,
      timer: fixedManual.timer,
    });
    next = { ...paperPalette, mode: "light" };
    fixedManual.tick();

    expect(fixed[1]?.mode).toBe("dark");
    expect(fixed[1]?.colors.card).toBe(darkTheme.colors.card);
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

  it("watches every field the palette offers", () => {
    // The poll compares a key built from the palette's fields, so a field the
    // key forgot is one a reader can change without the window noticing: the
    // watch read the same key, decided nothing had moved and kept the old
    // theme. The table is a `Record<keyof SystemPalette, …>`, so a field added
    // to the palette fails the compile until it is named here, and each one is
    // then driven through the watch. `selection` is the field this caught.
    const pair: Record<keyof SystemPalette, readonly [string, string]> = {
      mode: ["dark", "light"],
      background: ["#101418", "#101419"],
      foreground: ["#E6E9EE", "#E6E9EF"],
      accent: ["#7C5CFF", "#7C5CFE"],
      muted: ["#1B2027", "#1B2028"],
      border: ["#2A3038", "#2A3039"],
      danger: ["#E5484D", "#E5484E"],
      selection: ["#7C5CFF40", "#7C5CFF41"],
    };

    Object.entries(pair).forEach(([field, [first, second]]) => {
      const manual = manualTimer();
      const applied: Array<Theme> = [];
      let palette: SystemPalette = { ...nightPalette, [field]: first };
      watchSystemTheme({
        read: () => palette,
        base: darkTheme,
        onChange: (theme) => applied.push(theme),
        every: 2000,
        timer: manual.timer,
      });
      palette = { ...nightPalette, [field]: second };
      manual.tick();

      expect(applied, `${field} re-applies`).toHaveLength(2);
    });

    // The other direction: a tick that reads the same palette applies nothing.
    const manual = manualTimer();
    const applied: Array<Theme> = [];
    watchSystemTheme({
      read: () => nightPalette,
      base: darkTheme,
      onChange: (theme) => applied.push(theme),
      every: 2000,
      timer: manual.timer,
    });
    manual.tick();
    expect(applied).toHaveLength(1);
  });
});
