import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditTheme } from "./audit.js";
import { alpha, alphaOf, blend, invalidColorRoles } from "./color.js";
import { contrastFloors, contrastRatio } from "./contrast.js";
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
  systemThemePollMs,
  watchSystemTheme,
  type SystemPalette,
  type SystemThemeTimer,
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

const flat = (text: string): string => text.replace(/\s+/g, " ");

const isBaseValue = (
  base: Theme,
  palette: SystemPalette,
  value: string,
): boolean =>
  Object.values(base.colors).includes(value) ||
  Object.values(palette).some((entry) => entry === value);

const storedTheme = (theme: Theme): Theme =>
  JSON.parse(JSON.stringify({ ...theme, colors: null })) as Theme;

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

    expect(night.colors.primaryForeground).toBe(nightPalette.background);
    expect(paper.colors.primaryForeground).toBe(paperPalette.background);
    expect(paleOnPaper.colors.primaryForeground).toBe(paperPalette.foreground);

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

    expect(night.colors.selection).toBe(
      alpha("#B49CFF", alphaOf(darkTheme.colors.selection)),
    );
    expect(alphaOf(night.colors.selection)).toBeCloseTo(
      alphaOf(darkTheme.colors.selection),
      5,
    );

    expect(selectionFailures(night)).toEqual([]);

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

    expect(
      paletteToTokens({ ...opaque, selection: "#B49CFF26" }, darkTheme).colors
        .selection,
    ).toBe("#B49CFF26");

    const high = paletteToTokens(opaque, highContrastDarkTheme);
    expect(alphaOf(high.colors.selection)).toBeCloseTo(
      alphaOf(highContrastDarkTheme.colors.selection),
      5,
    );
    expect(selectionFailures(high)).toEqual([]);
  });

  it("prints the paint the window measured, not only the poll", () => {
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

      expect(page).not.toContain("is the playground's to record");
      expect(page).not.toContain("the playground's to record");
    });

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

    expect(selectionFailures(night)).toEqual([]);
    expect(readable).toBeGreaterThan(7);
  });

  it("names no colour of its own", () => {
    [
      nightPalette,
      paperPalette,

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

  it("reads a colour a desktop left blank as one it does not name", () => {
    const pale = paletteToTokens(
      { background: "", foreground: "   ", accent: "#FFE08A" },
      lightTheme,
    );

    expect(pale.colors.background).toBe(lightTheme.colors.background);
    expect(pale.colors.foreground).toBe(lightTheme.colors.foreground);
    expect(pale.colors.primary).toBe("#FFE08A");

    expect(pale.colors.primaryForeground).toBe(lightTheme.colors.foreground);
    expect(
      contrastRatio(pale.colors.primaryForeground, "#FFE08A"),
    ).toBeGreaterThanOrEqual(contrastFloors.secondary);

    expect(
      contrastRatio(lightTheme.colors.primaryForeground, "#FFE08A"),
    ).toBeLessThan(contrastFloors.secondary);

    const quiet = paletteToTokens(
      { muted: "", foreground: "#101010" },
      lightTheme,
    );
    expect(quiet.colors.muted).toBe(lightTheme.colors.muted);
    expect(quiet.colors.mutedForeground).toBe(
      lightTheme.colors.mutedForeground,
    );

    const error = paletteToTokens(
      { danger: " ", foreground: "#000000" },
      lightTheme,
    );
    expect(error.colors.destructive).toBe(lightTheme.colors.destructive);
    expect(error.colors.destructiveForeground).toBe(
      lightTheme.colors.destructiveForeground,
    );
    expect(
      contrastRatio("#000000", lightTheme.colors.destructive),
    ).toBeLessThan(contrastFloors.secondary);

    const wash = paletteToTokens({ selection: "" }, darkTheme);
    expect(wash.colors.selection).toBe(darkTheme.colors.selection);
    expect(wash.colors.border).toBe(darkTheme.colors.border);

    const typo = paletteToTokens(
      { accent: "brand", background: "#FFFFFF", foreground: "#000000" },
      lightTheme,
    );
    expect(typo.colors.primary).toBe("brand");
    expect(invalidColorRoles(typo)).toEqual([
      { role: "primary", value: "brand" },
    ]);

    const catalogue = read("../../../docs/tokens.md");
    const design = read("../../../docs/design-system.md");
    const readme = read("../README.md");
    const inventory = read("../../../.agents/slop/COMPONENTS.md");
    const seam = read("./system-theme.ts");
    const colour = read("./color.ts");

    [catalogue, readme, inventory].forEach((page) => {
      expect(flat(page), "the blank field rule").toContain("names no colour");
      expect(page).toContain("namesColour");
    });
    expect(flat(design)).toContain("left blank names no colour");
    expect(seam).toContain("namesColour(value)");
    expect(colour).toContain("export const namesColour");

    [seam, readme, inventory].forEach((page) => {
      expect(page).not.toContain("states the empty one");
    });
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
    expect(paletteMode({ background: "#000000", mode: "light" })).toBe("light");
    expect(paletteMode({ background: "#FFFFFF", mode: "dark" })).toBe("dark");

    expect(paletteMode({ mode: "dark" })).toBe("dark");
  });

  it("reads a stated mode this release does not ship from the page", () => {
    expect(paletteMode({ ...nightPalette, mode: "Dark" })).toBe("dark");
    expect(paletteMode({ ...paperPalette, mode: "LIGHT" })).toBe("light");

    expect(paletteMode({ ...nightPalette, mode: null })).toBe("dark");
    expect(paletteMode({ ...paperPalette, mode: 7 })).toBe("light");

    expect(paletteMode({ accent: "#B49CFF", mode: "solar" })).toBeUndefined();
  });

  it("follows the page for a palette whose mode names a name it does not ship", () => {
    const followed = followPalette({ ...nightPalette, mode: "Dark" });

    expect(followed.mode).toBe("dark");
    expect(followed.colors.background).toBe(nightPalette.background);
    expect(followed.name).toBe(darkTheme.name);

    expect(paletteToTokens({ ...paperPalette, mode: "DARK" }).mode).toBe(
      "light",
    );
  });

  it("teaches the fallback a stated mode name gets, on every page", () => {
    const catalogue = read("../../../docs/tokens.md");
    const design = read("../../../docs/design-system.md");
    const readme = read("../README.md");
    const inventory = read("../../../.agents/slop/COMPONENTS.md");

    expect(paletteMode({ ...nightPalette, mode: "Dark" })).toBe("dark");

    [catalogue, readme, inventory].forEach((page) => {
      expect(flat(page)).toContain("stated mode this release does not ship");
    });
    expect(flat(catalogue)).toContain(
      "A palette with no page to measure answers no mode",
    );
    expect(flat(design)).toContain(
      "`paletteMode` reads a system palette's stated mode",
    );

    expect(flat(catalogue)).toContain("the value the decoder wrote");
    expect(flat(readme)).toContain("the value the decoder wrote");

    [catalogue, readme, inventory].forEach((page) => {
      expect(flat(page)).toContain("systemThemePollMs");
      expect(flat(page)).toContain("1 ms floor");
      expect(flat(page)).toContain("2 147 483 647");
    });
  });

  it("follows the palette's page without a base to hand", () => {
    expect(followPalette(nightPalette).mode).toBe("dark");
    expect(followPalette(nightPalette).name).toBe(darkTheme.name);
    expect(followPalette(paperPalette).mode).toBe("light");
    expect(followPalette(paperPalette).colors.background).toBe(
      paperPalette.background,
    );

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

  it("re-applies a palette a reader rewrites in place, not only one it replaces", () => {
    const manual = manualTimer();
    const applied: Array<Theme> = [];
    const palette = { ...nightPalette };
    watchSystemTheme({
      read: () => palette,
      base: lightTheme,
      onChange: (theme) => applied.push(theme),
      every: 2000,
      timer: manual.timer,
    });

    palette.accent = "#7CC7B0";
    manual.tick();

    expect(applied).toHaveLength(2);
    expect(applied[1]?.colors.primary).toBe("#7CC7B0");

    palette.accent = "";
    manual.tick();

    expect(applied).toHaveLength(3);
    expect(applied[2]?.colors.primary).toBe(lightTheme.colors.primary);

    manual.tick();

    expect(applied).toHaveLength(3);

    const pages = [
      read("../../../docs/tokens.md"),
      read("../README.md"),
      read("../../../.agents/slop/COMPONENTS.md"),
    ];
    pages.forEach((page) => {
      expect(flat(page), "the in-place rewrite rule").toContain(
        "rewrites one palette object in place",
      );
    });
  });

  it("re-applies a field a decoder now reports as empty, not absent", () => {
    const cleared = clock({ ...nightPalette, accent: undefined });
    cleared.change({ ...nightPalette, accent: "" });
    cleared.tick();

    expect(cleared.applied).toHaveLength(2);
    expect(cleared.applied[1]?.colors.primary).toBe(lightTheme.colors.primary);

    const omitted = clock({ ...nightPalette, accent: "" });
    omitted.change({ ...nightPalette, accent: undefined });
    omitted.tick();

    expect(omitted.applied).toHaveLength(2);
    expect(omitted.applied[1]?.colors.primary).toBe(lightTheme.colors.primary);

    const reread = clock(nightPalette);
    reread.change({ ...nightPalette });
    reread.tick();

    expect(reread.applied).toHaveLength(1);
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

  it("offers a palette again when the change that delivered it threw", () => {
    const manual = manualTimer();
    const applied: Array<Theme> = [];
    let palette: SystemPalette = nightPalette;
    let fail = false;
    watchSystemTheme({
      read: () => palette,
      base: lightTheme,
      onChange: (theme) => {
        if (fail) {
          fail = false;
          throw new Error("the surface could not render");
        }
        applied.push(theme);
      },
      every: 2000,
      timer: manual.timer,
    });

    palette = { ...nightPalette, accent: "#7CC7B0" };
    fail = true;
    expect(() => manual.tick()).toThrow("the surface could not render");
    expect(applied).toHaveLength(1);

    manual.tick();
    expect(applied).toHaveLength(2);
    expect(applied[1]?.colors.primary).toBe("#7CC7B0");
  });

  it("stops polling when the caller stops", () => {
    const { stopped, stop } = clock(nightPalette);
    expect(stopped()).toBe(false);
    stop();
    expect(stopped()).toBe(true);
  });

  it("executes the documented call site, onto the base the palette's mode names", () => {
    const manual = manualTimer();
    const applied: Array<Theme> = [];
    let palette: SystemPalette | undefined = paperPalette;
    const stop = followDesktop(
      () => palette,
      (theme) => applied.push(theme),
      { base: lightTheme, timer: manual.timer },
    );

    palette = nightPalette;
    manual.tick();
    palette = undefined;
    manual.tick();
    stop();

    expect(applied.map((theme) => theme.mode)).toEqual([
      "light",
      "dark",
      "light",
    ]);
    expect(applied[0]?.colors.background).toBe(paperPalette.background);
    expect(applied[1]?.colors.card).toBe(darkTheme.colors.card);
    expect(applied[1]?.colors.primary).toBe(nightPalette.accent);

    expect(applied[2]).toBe(lightTheme);

    const example = read("./system-theme.example.ts");
    expect(example).toContain("baseFor: (palette)");
    expect(example).toContain("paletteMode(palette) ?? base.mode");
    const catalogue = flat(read("../../../docs/tokens.md"));
    const readme = flat(read("../README.md"));
    expect(catalogue).toContain(
      "`followDesktop` is the poll, and the base it applies follows the mode the palette states",
    );
    expect(readme).toContain(
      "`followDesktop` is that poll, with the palette's own mode choosing the base",
    );
  });

  it("reports the mix a partial palette cannot serve", () => {
    const night = auditTheme(followPalette(nightPalette));
    const paper = auditTheme(followPalette(paperPalette));

    expect(night.passed).toBe(false);
    const ink = night.contrast.find(
      ({ foreground, background }) =>
        foreground === "destructiveForeground" && background === "destructive",
    );
    expect(ink?.ratio).toBeCloseTo(4.39, 1);
    const mark = night.indicators.find(({ role }) => role === "destructive");
    expect(mark?.ratio).toBeCloseTo(2.93, 1);
    expect(paper.decorative.length).toBeGreaterThan(0);

    const catalogue = read("../../../docs/tokens.md");
    expect(catalogue).toContain("4.39:1");
    expect(catalogue).toContain("2.93:1");
  });

  it("teaches that a change is recorded only once it was delivered", () => {
    const catalogue = read("../../../docs/tokens.md");
    const readme = read("../README.md");
    expect(catalogue).toContain("recorded once `onChange` returns");
    expect(readme).toContain("recorded once `onChange` has returned");
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

  it("reads an unusable poll pace as the documented one", () => {
    const paces: Array<number> = [];
    const timer: SystemThemeTimer = {
      poll: (every) => {
        paces.push(every);
        return () => {};
      },
    };
    [Number.NaN, 0, -5, Number.POSITIVE_INFINITY].forEach((every) => {
      watchSystemTheme({
        read: () => nightPalette,
        base: darkTheme,
        onChange: () => {},
        every,
        timer,
      });
    });

    expect(paces).toEqual([
      systemThemePollMs,
      systemThemePollMs,
      systemThemePollMs,
      systemThemePollMs,
    ]);

    watchSystemTheme({
      read: () => nightPalette,
      base: darkTheme,
      onChange: () => {},
      every: 250,
      timer,
    });
    expect(paces.at(-1)).toBe(250);
  });

  it("bounds a pace the platform's timer cannot honour, not only a value that is not a number", () => {
    const paces: Array<number> = [];
    const timer: SystemThemeTimer = {
      poll: (every) => {
        paces.push(every);
        return () => {};
      },
    };
    [0.5, 2 ** 31, Number.MAX_SAFE_INTEGER].forEach((every) => {
      watchSystemTheme({
        read: () => nightPalette,
        base: darkTheme,
        onChange: () => {},
        every,
        timer,
      });
    });

    expect(paces).toEqual([
      systemThemePollMs,
      systemThemePollMs,
      systemThemePollMs,
    ]);

    [1, 2 ** 31 - 1].forEach((every) => {
      watchSystemTheme({
        read: () => nightPalette,
        base: darkTheme,
        onChange: () => {},
        every,
        timer,
      });
    });
    expect(paces.slice(-2)).toEqual([1, 2 ** 31 - 1]);
  });

  it("answers a base theme a store truncated, instead of reading nothing", () => {
    const fill = "#FFFFFF";
    const lightBased = paletteToTokens(
      { accent: fill },
      storedTheme(lightTheme),
    );
    const darkBased = paletteToTokens({ accent: fill }, storedTheme(darkTheme));

    expect(lightBased.colors.primary).toBe(fill);
    expect(lightBased.colors.primaryForeground).toBe(
      lightTheme.colors.foreground,
    );
    expect(darkBased.colors.primaryForeground).toBe(
      darkTheme.colors.background,
    );

    expect(lightBased.colors.primaryForeground).not.toBe(
      darkBased.colors.primaryForeground,
    );

    const truncatedHigh = paletteToTokens(
      { selection: "#B49CFF" },
      storedTheme(highContrastDarkTheme),
    );
    expect(alphaOf(truncatedHigh.colors.selection)).toBeCloseTo(
      alphaOf(highContrastDarkTheme.colors.selection),
      5,
    );

    const own = extendTheme(lightTheme, { colors: { selection: "#00000033" } });
    expect(
      paletteToTokens({ selection: "#B49CFF" }, own).colors.selection,
    ).toBe(alpha("#B49CFF", alphaOf("#00000033")));
    expect(
      paletteToTokens({ muted: "#EEEEEE" }, own).colors.mutedForeground,
    ).toBe(own.colors.foreground);

    expect(lightBased.colors.card).toBeUndefined();
    expect(auditTheme(lightBased).passed).toBe(false);
  });

  it("starts following a palette over a base a store truncated", () => {
    const manual = manualTimer();
    const applied: Array<Theme> = [];

    watchSystemTheme({
      read: () => ({ accent: "#34C759" }),
      base: storedTheme(darkTheme),
      onChange: (theme) => applied.push(theme),
      every: 2000,
      timer: manual.timer,
    });

    expect(applied).toHaveLength(1);
    expect(applied[0]?.colors.primary).toBe("#34C759");
    expect(applied[0]?.colors.primaryForeground).toBe(
      darkTheme.colors.background,
    );
  });

  it("teaches the base it reads a truncated theme through, on every page", () => {
    const catalogue = read("../../../docs/tokens.md");
    const design = read("../../../docs/design-system.md");
    const readme = read("../README.md");
    const seam = read("./system-theme.ts");
    const rule =
      "the identity theme of the base's own mode and contrast variant";

    [catalogue, design, readme].forEach((page) => {
      expect(flat(page), "the truncated base rule").toContain(rule);
      expect(page).toContain("themeColors");
    });

    expect(seam).toContain("themeColors(base)");
    expect(seam).toContain("const roles = baseRoles(base)");
    expect(seam).toContain("inkOn(accent, inks, roles)");
    expect(seam).toContain("selectionWash(selection, roles)");
  });

  it("prints the case count its own suite runs", () => {
    const source = read("./system-theme.test.ts");
    const inventory = read("../../../.agents/slop/COMPONENTS.md");
    const cases = source
      .split("\n")
      .filter((line) => /^ {2}it\b/.test(line)).length;

    expect(cases).toBeGreaterThan(20);
    expect(inventory).toContain(`\`system-theme.test.ts\` (${cases} cases)`);
  });
});
