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

/** A document's prose with its line breaks folded away. */
const flat = (text: string): string => text.replace(/\s+/g, " ");

/**
 * A palette as a JSON store hands one back, where a field is unknown before it
 * is a union and a key can hold `null`. The cast is the storage boundary, the
 * rule `styles.test.ts`'s stored role and size cases follow.
 */
const stored = (palette: Record<string, unknown>): SystemPalette =>
  JSON.parse(JSON.stringify(palette)) as SystemPalette;

const isBaseValue = (
  base: Theme,
  palette: SystemPalette,
  value: string,
): boolean =>
  Object.values(base.colors).includes(value) ||
  Object.values(palette).some((entry) => entry === value);

/**
 * A theme as a JSON store hands one back with its colour group truncated: JSON
 * has no `undefined`, so a group a theme never carried arrives as `null`. The
 * cast is the storage boundary, the rule `stored` above follows; this package
 * ships no decoder by design, so the consumer's boundary owns the decode.
 */
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

  it("reads a stated mode this release does not ship from the page", () => {
    // The bug this guards: a `SystemPalette` is written by a consumer's decoder,
    // so its `mode` is unknown input at that boundary even though the type names
    // two modes. `paletteMode` returned the stated string unchanged and the
    // documented call site hands it straight to `getTheme`, which refuses a mode
    // it does not know — an upper-cased `Dark` threw out of `followPalette`
    // instead of following the desktop's page.
    expect(paletteMode(stored({ ...nightPalette, mode: "Dark" }))).toBe("dark");
    expect(paletteMode(stored({ ...paperPalette, mode: "LIGHT" }))).toBe(
      "light",
    );
    // A key a store kept without a value is the absence it is, and the page still
    // answers; a number is not a mode either.
    expect(paletteMode(stored({ ...nightPalette, mode: null }))).toBe("dark");
    expect(paletteMode(stored({ ...paperPalette, mode: 7 }))).toBe("light");
    // No page to measure is no answer, so the caller's own default stands rather
    // than a mode invented from a label nobody ships.
    expect(
      paletteMode(stored({ accent: "#B49CFF", mode: "solar" })),
    ).toBeUndefined();
  });

  it("follows the page for a palette whose mode names a name it does not ship", () => {
    const followed = followPalette(stored({ ...nightPalette, mode: "Dark" }));

    expect(followed.mode).toBe("dark");
    expect(followed.colors.background).toBe(nightPalette.background);
    expect(followed.name).toBe(darkTheme.name);
    // A palette that only names the paper page and a stale label still gets the
    // light base, which is what `paletteToTokens`' own default reads.
    expect(
      paletteToTokens(stored({ ...paperPalette, mode: "DARK" })).mode,
    ).toBe("light");
  });

  it("teaches the fallback a stated mode name gets, on every page", () => {
    // The substitution is a paint seam's, so a page that promises only "the mode
    // the palette states" leaves a reader staring at `getTheme`'s refusal with no
    // explanation. Every surface a consumer reads states the read.
    const catalogue = read("../../../docs/tokens.md");
    const design = read("../../../docs/design-system.md");
    const readme = read("../README.md");
    const inventory = read("../../../COMPONENTS.md");

    expect(paletteMode(stored({ ...nightPalette, mode: "Dark" }))).toBe("dark");

    [catalogue, readme, inventory].forEach((page) => {
      expect(flat(page)).toContain("stated mode this release does not ship");
    });
    expect(flat(catalogue)).toContain(
      "A palette with no page to measure answers no mode",
    );
    expect(flat(design)).toContain(
      "`paletteMode` reads a system palette's stated mode",
    );

    // The poll's pace has the same kind of fallback, and the pages state it
    // beside the pace they pass: `setInterval` honours 1 … 2 147 483 647 ms and
    // reads every other delay as its 1 ms floor, so the range is the rule.
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

  it("re-applies a palette a reader rewrites in place, not only one it replaces", () => {
    // A decoder can fill one palette it reuses: a parser with a module-level
    // result, a watcher that clears and rewrites its record, a record a settings
    // panel keeps. The poll compared the palette values it had delivered with
    // the object the reader handed back, so the same reference was compared with
    // itself — the field the reader had just rewritten matched and the window
    // kept the theme it had, however many times the desktop moved.
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

    // The field the first fix closed stays closed: an empty value differs from
    // an absent one even when the object is the same one.
    palette.accent = "";
    manual.tick();

    expect(applied).toHaveLength(3);
    expect(applied[2]?.colors.primary).toBe("");

    // And a tick that rewrites nothing delivers nothing.
    manual.tick();

    expect(applied).toHaveLength(3);

    // The pages a consumer plans a follow from state the same rule.
    const pages = [
      read("../../../docs/tokens.md"),
      read("../README.md"),
      read("../../../COMPONENTS.md"),
    ];
    pages.forEach((page) => {
      expect(flat(page), "the in-place rewrite rule").toContain(
        "rewrites one palette object in place",
      );
    });
  });

  it("re-applies a field a decoder now reports as empty, not absent", () => {
    // A palette is a set of values, not a joined string. The key the watch used
    // to compare wrote an absent field as `""` and joined the fields with a
    // separator, so a decoder that stopped omitting a colour and started
    // reporting it empty — what a TOML or JSON reader writes for a cleared
    // value — produced the key of the palette before it, and the window kept the
    // theme it had. The two compose differently: `paletteToTokens` keeps the
    // base's role for an absent field and states the empty one, which the
    // renderer then drops.
    const cleared = clock({ ...nightPalette, accent: undefined });
    cleared.change({ ...nightPalette, accent: "" });
    cleared.tick();

    expect(cleared.applied).toHaveLength(2);
    expect(cleared.applied[1]?.colors.primary).toBe("");

    // The reverse direction is the same change: a field omitted after it was
    // reported empty falls back to the base's role.
    const omitted = clock({ ...nightPalette, accent: "" });
    omitted.change({ ...nightPalette, accent: undefined });
    omitted.tick();

    expect(omitted.applied).toHaveLength(2);
    expect(omitted.applied[1]?.colors.primary).toBe(lightTheme.colors.primary);

    // Comparing values rather than one string keeps a re-read that allocates a
    // new object with the same fields quiet.
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

  it("offers a palette again when the change that delivered it threw", () => {
    // The poll records a palette only once `onChange` has returned. A callback
    // that throws is the caller's defect and is not swallowed — but it must not
    // mark the change delivered, or the window keeps the previous theme until
    // the desktop moves again.
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

  it("teaches that a change is recorded only once it was delivered", () => {
    // A reader planning a follow has to know what a failed callback costs; the
    // seam's doc, both pages and §11 state the same rule.
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
    // The poll compares the palette's fields, so a field the list forgot is one
    // a reader can change without the window noticing: the watch compared the
    // values it had, decided nothing had moved and kept the old theme. The table
    // is a `Record<keyof SystemPalette, …>`, so a field added to the palette
    // fails the compile until it is named here, and each one is then driven
    // through the watch. `selection` is the field this caught.
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

  it("reads an unusable poll pace as the documented one", () => {
    // The pace is configuration as often as a literal — a settings row or an
    // environment variable is a string before it is a number — and `setInterval`
    // reads `NaN`, `0` and a negative delay as its 1 ms floor, so an unreadable
    // pace read and decoded the platform's theme file a thousand times a second
    // while the window looked correct.
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

    // A usable pace passes through unchanged, so a caller's own cadence stands.
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
    // `setInterval` honours 1 … 2 147 483 647 ms and silently runs every other
    // delay at its 1 ms floor: `0.5` and `2 ** 31` both measured as a 1 ms
    // interval in this runtime. The guard tested only `NaN`, `0` and a negative
    // value, so a settings row that stored a pace in seconds (`0.5`) or a
    // deliberately rare monthly cadence (`2 ** 31`) read and decoded the
    // platform's theme file every millisecond while its window looked right.
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

    // Both ends of the platform's own range pass through unchanged, so the
    // bound is the timer's rather than a narrower policy of this package's.
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
    // The bug this guards: both questions this seam asks its base — which ink
    // reads on a filled role the palette names no ink for, and the share an
    // opaque selection colour takes — read the base's colour group directly. A
    // base restored from storage can have lost the whole group (JSON keeps
    // `null` where a theme carried nothing), and `paletteToTokens` threw
    // `TypeError: Cannot read properties of null (reading 'foreground')`; the
    // follow below threw it on the tick that sets the window up.

    // A white accent is the ink question's discriminator: the light identity
    // answers its dark body ink, the dark identity its dark page.
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
    // The base's own mode decides the fallback, not the library's default.
    expect(lightBased.colors.primaryForeground).not.toBe(
      darkBased.colors.primaryForeground,
    );

    // The share is the identity's for the base's variant, too.
    const truncatedHigh = paletteToTokens(
      { selection: "#B49CFF" },
      storedTheme(highContrastDarkTheme),
    );
    expect(alphaOf(truncatedHigh.colors.selection)).toBeCloseTo(
      alphaOf(highContrastDarkTheme.colors.selection),
      5,
    );

    // A base whose own group survived still answers with its own numbers: its
    // share wins over the identity's, and its ink is the one measured.
    const own = extendTheme(lightTheme, { colors: { selection: "#00000033" } });
    expect(
      paletteToTokens({ selection: "#B49CFF" }, own).colors.selection,
    ).toBe(alpha("#B49CFF", alphaOf("#00000033")));
    expect(
      paletteToTokens({ muted: "#EEEEEE" }, own).colors.mutedForeground,
    ).toBe(own.colors.foreground);

    // Nothing is invented: a role neither the palette nor the two questions
    // needed stays absent for the gate, rather than the mapper filling it in.
    expect(lightBased.colors.card).toBeUndefined();
    expect(auditTheme(lightBased).passed).toBe(false);
  });

  it("starts following a palette over a base a store truncated", () => {
    // The reachable path: an application holds its brand theme, a store hands it
    // back without the colour group, and the desktop's follow is the first thing
    // that asks it a question. A throw here is the window setup, not a paint.
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
    // A base a consumer holds is a theme like any other, and the seam's two
    // questions about it threw on a stored theme that lost its colour group.
    // The pages a reader learns the mapping from have to say what answers then.
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

    // The rule is the seam's, not only the page's: one helper answers both
    // questions through the colour seam, and the mapper uses it.
    expect(seam).toContain("themeColors(base)");
    expect(seam).toContain("const roles = baseRoles(base)");
    expect(seam).toContain("inkOn(palette.accent, palette, roles)");
    expect(seam).toContain("selectionWash(palette.selection, roles)");
  });

  it("prints the case count its own suite runs", () => {
    // The inventory row is the one place a reader sees how much this file holds,
    // and it printed 22 while the suite had grown to 26. The count is read from
    // the file itself, so a case added here moves the row or fails this one.
    const source = read("./system-theme.test.ts");
    const inventory = read("../../../COMPONENTS.md");
    const cases = source
      .split("\n")
      .filter((line) => /^ {2}it\b/.test(line)).length;

    expect(cases).toBeGreaterThan(20);
    expect(inventory).toContain(`\`system-theme.test.ts\` (${cases} cases)`);
  });
});
