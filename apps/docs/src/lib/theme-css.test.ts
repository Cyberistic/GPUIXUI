import {
  applyStyle,
  contrastRatio,
  darkSeries,
  decorativeFloor,
  dividerOn,
  filledHover,
  filledPressed,
  highContrastLightSeries,
  highContrastThemes,
  lightSeries,
  platformStyles,
  platformTheme,
  retroStyles,
  targetSize,
  themes,
  type SeriesColors,
  type Theme,
} from "@gpuixui/tokens";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cssFontStack } from "./fonts";
import { resolvePlatformTheme } from "./platform";
import { toCssVars } from "./theme-css";

/**
 * The bridge, and the preview style sheets that consume it.
 *
 * The previews paint the library's roles through CSS variables, so the guard
 * that matters is the seam: every variable the style sheets read must be one
 * the bridge writes, the `.gx-demo` defaults must be the dark theme, and no
 * preview rule may carry a colour literal of its own. Each check fails the
 * moment a preview stops following the tokens.
 *
 * `node:fs` is the test's own read of a checked-in file, not runtime I/O.
 */

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** Every non-test module the docs app ships. */
const appSources = (): ReadonlyArray<string> =>
  readdirSync(new URL("../", import.meta.url), {
    recursive: true,
    encoding: "utf8",
  })
    .filter((name) => /\.tsx?$/.test(name) && !name.includes(".test."))
    .map((name) => `../${name}`);

/** The style sheets that paint a library preview. */
const previewCss = (): ReadonlyArray<readonly [string, string]> => [
  ["demos.css", read("../styles/demos.css")],
  ["blocks.css", read("../styles/blocks.css")],
];

/** The declarations of the first `selector { … }` block in a style sheet. */
const block = (css: string, selector: string): string => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`no ${selector} block`);
  return css.slice(start, css.indexOf("}", start));
};

/** The matches of `pattern` in `css`, with the capture at `at` when present. */
const captures = (css: string, pattern: RegExp, at: number): string[] =>
  [...css.matchAll(pattern)].flatMap((match) => {
    const value = match[at];
    return value === undefined ? [] : [value];
  });

/** Every custom property a style sheet reads through `var(--…)`. */
const referencedVars = (css: string): ReadonlyArray<string> =>
  captures(css, /var\((--[a-z0-9-]+)/g, 1);

/** Every custom property a style sheet declares. */
const declaredVars = (css: string): ReadonlyArray<string> =>
  captures(css, /^\s*(--[a-z0-9-]+):/gm, 1);

/** The declarations of a block, as `{ name, value }` pairs. */
const declarations = (body: string): ReadonlyArray<Declaration> =>
  [...body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].flatMap((match) => {
    const [name, value] = [match[1], match[2]];
    return name === undefined || value === undefined ? [] : [{ name, value }];
  });

interface Declaration {
  readonly name: string;
  readonly value: string;
}

/** `primary-foreground` → `primaryForeground`, the theme role behind it. */
const toCamel = (name: string): string =>
  name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

const darkColours = Object.fromEntries(Object.entries(themes.dark.colors));

/** The density metrics `.gx-demo` declares, keyed by their CSS variable. */
const darkDensity: Readonly<Record<string, number>> = {
  "control-height-sm": themes.dark.density.controlHeight.sm,
  "control-height-md": themes.dark.density.controlHeight.md,
  "control-height-lg": themes.dark.density.controlHeight.lg,
  "control-padding-x-sm": themes.dark.density.controlPaddingX.sm,
  "control-padding-x-md": themes.dark.density.controlPaddingX.md,
  "control-padding-x-lg": themes.dark.density.controlPaddingX.lg,
  "row-height": themes.dark.density.rowHeight,
  "spacing-md": themes.dark.spacing.md,
  "spacing-lg": themes.dark.spacing.lg,
  "icon-size-sm": themes.dark.iconSize.sm,
  "icon-size-md": themes.dark.iconSize.md,
  "icon-size-lg": themes.dark.iconSize.lg,
  "target-size": targetSize.minimum,
};

/** The derived fills a filled control previews, keyed by their CSS variable. */
const darkFills: Readonly<Record<string, string>> = {
  "primary-hover": filledHover(themes.dark, "primary"),
  "primary-pressed": filledPressed(themes.dark, "primary"),
  "secondary-hover": filledHover(themes.dark, "secondary"),
  "secondary-pressed": filledPressed(themes.dark, "secondary"),
  "destructive-hover": filledHover(themes.dark, "destructive"),
  "destructive-pressed": filledPressed(themes.dark, "destructive"),
};

describe("theme bridge", () => {
  it("maps token roles to the shadcn variable names", () => {
    const vars = toCssVars(themes.dark);

    expect(vars["--background"]).toBe(themes.dark.colors.background);
    expect(vars["--primary"]).toBe(themes.dark.colors.primary);
    // CamelCase roles must become kebab-case (`primaryForeground` →
    // `--primary-foreground`), matching shadcn and the docs' app.css.
    expect(vars["--primary-foreground"]).toBe(
      themes.dark.colors.primaryForeground,
    );
    expect(vars["--muted-foreground"]).toBe(themes.dark.colors.mutedForeground);
    expect(vars["--radius"]).toBe(`${themes.dark.radius.md}px`);
    expect(vars["--control-height-md"]).toBe(
      `${themes.dark.density.controlHeight.md}px`,
    );
    expect(vars["--control-padding-x-sm"]).toBe(
      `${themes.dark.density.controlPaddingX.sm}px`,
    );
    expect(vars["--row-height"]).toBe(`${themes.dark.density.rowHeight}px`);
    expect(vars["--spacing-md"]).toBe(`${themes.dark.spacing.md}px`);
    expect(vars["--spacing-lg"]).toBe(`${themes.dark.spacing.lg}px`);
    // A drawn control's side is an icon step and its press target is the
    // shared floor around it, so a checkbox preview cannot carry its own 16px.
    expect(vars["--icon-size-md"]).toBe(`${themes.dark.iconSize.md}px`);
    expect(vars["--target-size"]).toBe(`${targetSize.minimum}px`);
    // A checked box's hover and press are the derived opaque fills, not an
    // alpha lift, so the bridge cannot leave a preview to guess one.
    expect(vars["--primary-hover"]).toBe(filledHover(themes.dark, "primary"));
    expect(vars["--primary-pressed"]).toBe(
      filledPressed(themes.dark, "primary"),
    );
  });

  it("carries the platform density, so a preview's controls change size", () => {
    const height = (platform: "darwin" | "linux" | "win32") =>
      toCssVars(platformTheme(themes.dark, platform))["--control-height-md"];

    // macOS compact (28), Linux spacious (36), Windows comfortable (32).
    expect([height("darwin"), height("linux"), height("win32")]).toEqual([
      "28px",
      "36px",
      "32px",
    ]);
  });

  it("carries an authored look's palette, radius and family", () => {
    const vars = toCssVars(resolvePlatformTheme("default", "light", "luna"));

    // The look picker is only honest if the browser bridge paints the look's
    // own values; a preview that kept the base palette would show a theme the
    // library does not ship.
    expect(vars["--background"]).toBe(retroStyles.luna.colors.light.background);
    expect(vars["--radius"]).toBe(`${retroStyles.luna.radius.md}px`);
    expect(vars["--font-mono"]).toBe(retroStyles.luna.mono);
  });

  it("maps the GPUI font sentinel to a CSS stack, and leaves other families alone", () => {
    expect(cssFontStack(".SystemUIFont")).toContain("BlinkMacSystemFont");
    expect(cssFontStack("Inter")).toBe("Inter");
  });

  it("derives the rule each table row state crosses from the fill it wears", () => {
    // A table row paints its rule *inside* its own box, so the line lands on the
    // fill the row is wearing. The data package derives it per state
    // (`packages/data/src/table/table.tsx` → `rule`), while the preview drew the
    // raw `border` role on every row — a line under the 1.05:1 floor on the
    // `accent` a chosen row takes under the pointer.
    const vars = toCssVars(themes.dark);
    const rule = (surface: string): string =>
      dividerOn(themes.dark, surface) ?? themes.dark.colors.border;

    expect(vars["--divider-card"]).toBe(rule(themes.dark.colors.card));
    expect(vars["--divider-selected"]).toBe(rule(themes.dark.colors.selected));
    expect(vars["--divider-hover"]).toBe(rule(themes.dark.colors.hover));
    expect(vars["--divider-accent"]).toBe(rule(themes.dark.colors.accent));

    // The premise: the raw role cannot clear the wash, so the derivation is
    // observable rather than an identity.
    const raw =
      contrastRatio(themes.dark.colors.border, themes.dark.colors.accent) ?? 1;
    expect(raw, "the dark accent no longer needs a derived rule").toBeLessThan(
      decorativeFloor,
    );
    expect(vars["--divider-accent"]).not.toBe(themes.dark.colors.border);

    // The sheet reads each derived rule for the state it belongs to, and the
    // header paints the card rather than a muted strip of its own.
    const css = read("../styles/demos.css");
    expect(block(css, ".gx-table-head")).toContain("var(--divider-card)");
    expect(block(css, ".gx-table-head")).not.toContain("var(--muted)");
    // The base cell rule is the last of the three selectors that end in
    // `.gx-table-cell`, so it is read from its own line rather than by prefix.
    const cell = css.slice(css.indexOf("\n.gx-table-cell {"));
    expect(cell.slice(0, cell.indexOf("}"))).toContain("var(--divider-card)");
    expect(block(css, ".gx-table-row:hover .gx-table-cell")).toContain(
      "var(--divider-hover)",
    );
    expect(
      block(css, '.gx-table-row[data-selected="true"] .gx-table-cell'),
    ).toContain("var(--divider-selected)");
    expect(
      block(css, '.gx-table-row[data-selected="true"]:hover .gx-table-cell'),
    ).toContain("var(--divider-accent)");
  });
  it("carries both families, so a preview's monospace follows the platform", () => {
    const vars = toCssVars(themes.dark);

    expect(vars["--font-sans"]).toContain("BlinkMacSystemFont");
    expect(vars["--font-mono"]).toBe(themes.dark.typography.mono);
  });
});

describe("preview style sheets", () => {
  it("read only variables the bridge provides, or declares of their own", () => {
    const provided = new Set(Object.keys(toCssVars(themes.dark)));

    const unknown = previewCss().map(([sheet, css]) => {
      const local = new Set(declaredVars(css));
      const missing = referencedVars(css).filter(
        (variable) =>
          !provided.has(variable) &&
          !local.has(variable) &&
          !variable.startsWith("--dash-"),
      );
      return [sheet, missing] as const;
    });

    // A typo (`--muted-fg`) paints nothing and is silent in a browser.
    expect(unknown).toEqual([
      ["demos.css", []],
      ["blocks.css", []],
    ]);
  });

  it("keep the .gx-base defaults equal to the dark theme", () => {
    const declared = declarations(
      block(read("../styles/demos.css"), ".gx-base"),
    );

    expect(declared.length).toBeGreaterThan(10);

    const mismatched = declared.filter(({ name, value }) => {
      const role = toCamel(name.slice(2));
      const metric = darkDensity[name];
      if (metric !== undefined) return value !== `${metric}px`;
      const fill = darkFills[name];
      if (fill !== undefined) return value !== fill.toLowerCase();
      if (role === "radius") return value !== `${themes.dark.radius.md}px`;
      const expected = darkColours[role];
      // Not every declared name is a colour role; only roles are held here.
      return expected === undefined ? false : value !== expected.toLowerCase();
    });

    // The landing's product window renders outside a PreviewSurface, so these
    // defaults are the only paint it gets: they must be the library's.
    expect(mismatched.map(({ name }) => name)).toEqual([]);
  });

  it("keep the scene free of variables, so a preview inherits its surface", () => {
    // `.gx-demo` was both the scene and the defaults, and a demo's own root
    // carries the class too — so every scene inside a `PreviewSurface`
    // re-declared the dark theme and stopped following the platform switch.
    // The scene declares no variable; the defaults live on `.gx-base`, which
    // only a host outside a preview wears.
    const scene = block(read("../styles/demos.css"), ".gx-demo");
    expect(declarations(scene)).toEqual([]);
    // The scene paints nothing of its own surface: the page behind it shows
    // through, and only the role-tinted wash above it is drawn. A scene that
    // went back to a solid `var(--background)` would box every preview in a
    // colour the surface it sits on does not own.
    expect(scene).toContain("background-color: transparent");
    expect(scene).toContain("color: var(--foreground)");

    // The one host outside a preview is the landing's product window, and it
    // must wear the defaults — a scene without them paints unstyled.
    const landing = read("../components/landing/landing.tsx");
    expect(landing).toContain('className="gx-base gx-demo"');

    // Nothing else may sit outside a surface: every other `gx-demo` element is
    // mounted under a `PreviewSurface` (or under the landing window above).
    const hosts = appSources()
      .filter((path) => read(path).includes('className="gx-demo"'))
      .filter((path) => !path.endsWith("landing/landing.tsx"));
    expect(hosts).toEqual([]);
  });

  it("read a control's geometry from the theme, not a fixed height", () => {
    const css = read("../styles/demos.css");
    const fixed = [
      ".gx-btn",
      ".gx-btn-sm",
      ".gx-btn-lg",
      ".gx-field",
      ".gx-search-field",
      ".gx-tab",
    ]
      .filter((selector) => !block(css, selector).includes("--control-height"))
      .map((selector) => `${selector}: no --control-height`);

    expect(fixed).toEqual([]);
  });

  it("read a list row's height from the density and its spacing", () => {
    // A row is `density.rowHeight + spacing.md` in the component, so a preview
    // cannot carry 40px: macOS compact and Linux spacious must both resize it.
    const row = block(read("../styles/demos.css"), ".gx-list-row");

    expect(row).toContain("--row-height");
    expect(row).toContain("--spacing-md");
  });

  it("keeps a hovered row's label in the role the row resolves", () => {
    // The row's hover record paints `accent` and no colour; the title resolves
    // `foreground` (or `selectedForeground` on a chosen row). The preview painted
    // `accentForeground`, a role the shipped label never takes, and kept a chosen
    // row on `selected` while the native row answers the pointer with `accent`.
    const css = read("../styles/demos.css");
    const hovered = block(css, ".gx-list-row:hover:not(:disabled)");
    const chosen = block(
      css,
      '.gx-list-row[data-selected="true"]:hover:not(:disabled)',
    );

    expect(hovered).toContain("background: var(--accent)");
    expect(hovered).toContain("color: var(--foreground)");
    expect(hovered).not.toContain("--accent-foreground");
    expect(chosen).toContain("background: var(--accent)");
    expect(chosen).toContain("color: var(--selected-foreground)");
    expect(chosen).not.toContain("--accent-foreground");
  });

  it("read a search field's clear target from the shared floor", () => {
    // The shipped clear control is a 24px press target around the recipe's
    // 18px drawing, so a preview that copied the drawing's size would paint a
    // control smaller than the one a reader can press in the app.
    const clear = block(read("../styles/demos.css"), ".gx-search-clear");

    expect(clear).toContain("--target-size");
    expect(clear).not.toContain("width: 18px");
  });

  it("reads a switch's band, pill and knob from the theme's steps", () => {
    // The shipped pill is one icon-step tall and 1.75 steps wide, the knob is
    // that height less two `spacing.2xs` insets, and the band is the 24px
    // target floor around it (`core/selection.ts`). A preview carrying 28px
    // would stop resizing with the platform's icon steps.
    const css = read("../styles/demos.css");

    expect(block(css, ".gx-switch")).toContain(
      "min-height: var(--target-size)",
    );
    expect(block(css, ".gx-switch-track")).toContain(
      "width: calc(var(--icon-size-md) * 1.75)",
    );
    expect(block(css, ".gx-switch-track")).toContain(
      "height: var(--icon-size-md)",
    );
    expect(block(css, ".gx-switch-thumb")).toContain(
      "width: calc(var(--icon-size-md) - 4px)",
    );
    expect(block(css, ".gx-switch-thumb")).toContain(
      "transition: left 150ms ease-out",
    );
  });

  it("takes a timeline's dot and rail from the roles the mark contract holds", () => {
    // The dot is a mark: `primary` while current, `foreground` once complete and
    // the muted **text** role while upcoming. The `muted` surface fill measured
    // 1.06:1 on the page, so a preview that copied it would draw an invisible
    // dot that a screenshot cannot show. The connector is a real 1px element and
    // the content's bottom padding is the theme's `spacing.lg`, dropped on the
    // last event — the rail's end.
    const css = read("../styles/demos.css");

    expect(block(css, ".gx-timeline-connector")).toContain("width: 1px");
    expect(block(css, ".gx-timeline-connector")).toContain(
      "background: var(--border)",
    );
    expect(block(css, ".gx-timeline-content")).toContain(
      "padding-bottom: var(--spacing-lg)",
    );
    expect(
      block(css, ".gx-timeline-item[data-last] .gx-timeline-content"),
    ).toContain("padding-bottom: 0");

    expect(
      block(css, '.gx-timeline-item[data-status="complete"] .gx-timeline-dot'),
    ).toContain("background: var(--foreground)");
    expect(
      block(css, '.gx-timeline-item[data-status="current"] .gx-timeline-dot'),
    ).toContain("background: var(--primary)");
    expect(
      block(css, '.gx-timeline-item[data-status="upcoming"] .gx-timeline-dot'),
    ).toContain("background: var(--muted-foreground)");
  });

  it("takes a stepper's marker from the density step the component reads", () => {
    // The shipped marker is `controlHeight(theme, "md")` round, so a platform's
    // compact or comfortable density resizes it with the controls beside it. A
    // preview carrying a literal 28px would look right on the default theme and
    // stop following the switch — the one thing the marker's size is for.
    const css = read("../styles/demos.css");
    const marker = block(css, ".gx-stepper-marker");

    expect(marker).toContain("width: var(--control-height-md)");
    expect(marker).toContain("height: var(--control-height-md)");
    expect(marker).not.toContain("28px");

    // The three derived statuses paint the fills `markerPalette` names.
    expect(
      block(css, '.gx-stepper-step[data-status="complete"] .gx-stepper-marker'),
    ).toContain("background: var(--secondary)");
    expect(
      block(css, '.gx-stepper-step[data-status="current"] .gx-stepper-marker'),
    ).toContain("background: var(--primary)");
    expect(
      block(css, '.gx-stepper-step[data-status="upcoming"] .gx-stepper-marker'),
    ).toContain("background: var(--muted)");
    // An upcoming step's label is the muted role; a complete or current one is
    // body text.
    expect(
      block(css, '.gx-stepper-step[data-status="upcoming"] .gx-stepper-label'),
    ).toContain("color: var(--muted-foreground)");
  });

  it("reads a carousel's control fills and its track edge from the theme", () => {
    // The control is the local `Button`'s `secondary` variant: `secondary` fill,
    // `borderStrong` edge and the derived opaque pointer steps. The track's edge
    // is the `border` role: the recipe's `border-input` is shadcn's name for a
    // border, and the registry resolves it to `border`, because this library's
    // `input` role is the field fill (the card's own white in light).
    const css = read("../styles/demos.css");

    expect(block(css, ".gx-carousel-btn")).toContain(
      "background: var(--secondary)",
    );
    expect(block(css, ".gx-carousel-btn")).toContain(
      "border: 1px solid var(--border-strong)",
    );
    expect(block(css, ".gx-carousel-btn:hover:not(:disabled)")).toContain(
      "var(--secondary-hover)",
    );
    expect(block(css, ".gx-carousel-btn:active:not(:disabled)")).toContain(
      "var(--secondary-pressed)",
    );
    expect(block(css, ".gx-carousel-btn:disabled")).toContain(
      "background: var(--disabled)",
    );
    expect(block(css, ".gx-carousel-card")).toContain(
      "border: 1px solid var(--border)",
    );
    expect(block(css, ".gx-carousel-dot-mark[data-selected]")).toContain(
      "var(--primary)",
    );
    // The pointer steps are the library's derivation, so the bridge must publish
    // them: a preview that fell back to `.gx-demo`'s defaults would stop
    // repainting when the platform switch changes the theme.
    expect(toCssVars(themes.dark)["--secondary-hover"]).toBe(
      filledHover(themes.dark, "secondary"),
    );
    expect(toCssVars(themes.dark)["--secondary-pressed"]).toBe(
      filledPressed(themes.dark, "secondary"),
    );
  });

  it("carry no library colour literal outside the defaults", () => {
    const values = Object.values(darkColours).map((value) =>
      value.toLowerCase(),
    );
    const defaults = block(read("../styles/demos.css"), ".gx-base");

    const literals = previewCss().flatMap(([sheet, css]) => {
      // The dashboard's chrome is its own illustration: the landing renders the
      // same markup light and dark from `--dash-*`, so it is not a library
      // preview. Its chart colours are the theme's series instead — see "the
      // data series" below.
      const [scoped = ""] = css.split("/* ---- dashboard ---- */");
      const body =
        sheet === "demos.css" ? scoped.replace(defaults, "") : scoped;
      return values
        .filter((value) => body.includes(value))
        .map((value) => `${sheet}: ${value}`);
    });

    expect(literals).toEqual([]);
  });
});

describe("the data series", () => {
  /**
   * The scale as a style sheet spells it: lowercase hex. An absent variable is
   * carried through rather than dropped, so a bridge that stopped writing a
   * position fails the comparison instead of shortening it.
   */
  const cssSeries = (
    scale: ReadonlyArray<string | undefined>,
  ): ReadonlyArray<string | undefined> =>
    scale.map((colour) => colour?.toLowerCase());

  /**
   * A table this case declares itself: the shipped looks are read from their
   * own `series` above, and this fixture proves the rule for any style that
   * declares one — five hues a reader can tell apart on every position.
   */
  const lookSeries: SeriesColors = [
    "#9A6300",
    "#0F6E8C",
    "#7A2E8F",
    "#2D6A2D",
    "#8C3A00",
  ];

  it("publishes the theme's five colours as --series-1 to --series-5", () => {
    const series = (theme: Theme) =>
      [1, 2, 3, 4, 5].map(
        (position) => toCssVars(theme)[`--series-${position}`],
      );

    // A chart in a preview reads these; a fixed palette here would leave the
    // platform switch showing one theme's bars on another theme's page.
    expect(series(themes.dark)).toEqual([...darkSeries]);
    expect(series(themes.light)).toEqual([...lightSeries]);

    // A look may declare the table its own plot surfaces were designed for,
    // and the bridge publishes the look's scale — not the base's. The shipped
    // looks are read from their declaration, so one that gains a table lands
    // here without an edit and one that has none keeps its base.
    const look = (name: "luna" | "aero") => {
      const theme = resolvePlatformTheme("default", "light", name);
      const declared = retroStyles[name].series?.light;
      expect(theme.series?.length ?? 0).toBe(declared?.length ?? 0);
      expect(cssSeries(series(theme))).toEqual(
        cssSeries(declared ?? lightSeries),
      );
    };
    look("luna");
    look("aero");

    // The rule itself, with a style that declares one: a look is not stuck
    // with a scale designed for another page.
    const lookWithSeries = {
      ...platformStyles.default,
      series: { light: lookSeries },
    };
    expect(cssSeries(series(applyStyle(themes.light, lookWithSeries)))).toEqual(
      cssSeries(lookSeries),
    );

    // And the variant guard: a high-contrast base keeps its own table, because
    // a scale designed for a look's surfaces is not a high-contrast scale.
    expect(
      cssSeries(series(applyStyle(highContrastThemes.light, lookWithSeries))),
    ).toEqual(cssSeries(highContrastLightSeries));
  });

  it("keeps the dashboard's fallbacks on the dark theme's scale", () => {
    const declared = declarations(
      block(read("../styles/blocks.css"), ".gx-dash"),
    )
      .filter(({ name }) => name.startsWith("--dash-series-"))
      .map(({ name, value }) => [name, value] as const);

    // The landing renders the dashboard outside a preview surface, so these are
    // the only paint it gets there — and each must defer to an inherited
    // `--series-*` first, or the switch could not repaint the charts.
    expect(declared).toEqual(
      darkSeries.map(
        (colour, index) =>
          [
            `--dash-series-${index + 1}`,
            `var(--series-${index + 1}, ${colour.toLowerCase()})`,
          ] as const,
      ),
    );
  });

  it("re-maps the landing's two modes to the matching scale", () => {
    const landing = read("../styles/landing.css");
    const values = (selector: string): string[] =>
      declarations(block(landing, selector))
        .filter(({ name }) => name.startsWith("--dash-series-"))
        .map(({ value }) => value);

    expect(values("\n.landing .gx-dash")).toEqual(cssSeries(lightSeries));
    expect(values("\n.dark .landing .gx-dash")).toEqual(cssSeries(darkSeries));
  });

  it("draws the dashboard's charts from the variables, not a palette", () => {
    const source = read("../components/docs/dashboard.tsx");

    // The block used to carry five hand-picked hexes described as "readable in
    // both themes", which nothing measured. A colour literal returning here
    // means the charts stop following the theme again.
    expect(source.match(/#[0-9a-f]{6}\b/gi) ?? []).toEqual([]);
    expect(source).toContain("var(--dash-series-");
    expect(source).toContain("seriesColors(useTheme())");
  });
});
