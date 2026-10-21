import {
  darkSeries,
  lightSeries,
  platformTheme,
  retroStyles,
  themes,
  type Theme,
} from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
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

  it("keep the .gx-demo defaults equal to the dark theme", () => {
    const declared = declarations(
      block(read("../styles/demos.css"), ".gx-demo"),
    );

    expect(declared.length).toBeGreaterThan(10);

    const mismatched = declared.filter(({ name, value }) => {
      const role = toCamel(name.slice(2));
      const metric = darkDensity[name];
      if (metric !== undefined) return value !== `${metric}px`;
      if (role === "radius") return value !== `${themes.dark.radius.md}px`;
      const expected = darkColours[role];
      // Not every declared name is a colour role; only roles are held here.
      return expected === undefined ? false : value !== expected.toLowerCase();
    });

    // The landing's product window renders outside a PreviewSurface, so these
    // defaults are the only paint it gets: they must be the library's.
    expect(mismatched.map(({ name }) => name)).toEqual([]);
  });

  it("read a control's geometry from the theme, not a fixed height", () => {
    const css = read("../styles/demos.css");
    const fixed = [
      ".gx-btn",
      ".gx-btn-sm",
      ".gx-btn-lg",
      ".gx-field",
      ".gx-tab",
    ]
      .filter((selector) => !block(css, selector).includes("--control-height"))
      .map((selector) => `${selector}: no --control-height`);

    expect(fixed).toEqual([]);
  });

  it("carry no library colour literal outside the defaults", () => {
    const values = Object.values(darkColours).map((value) =>
      value.toLowerCase(),
    );
    const defaults = block(read("../styles/demos.css"), ".gx-demo");

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
  /** The scale as a style sheet spells it: lowercase hex. */
  const cssSeries = (scale: ReadonlyArray<string>): ReadonlyArray<string> =>
    scale.map((colour) => colour.toLowerCase());

  it("publishes the theme's five colours as --series-1 to --series-5", () => {
    const series = (theme: Theme) =>
      [1, 2, 3, 4, 5].map(
        (position) => toCssVars(theme)[`--series-${position}`],
      );

    // A chart in a preview reads these; a fixed palette here would leave the
    // platform switch showing one theme's bars on another theme's page.
    expect(series(themes.dark)).toEqual([...darkSeries]);
    expect(series(themes.light)).toEqual([...lightSeries]);
    // A look owns type, radii, density and chrome, not a categorical scale.
    expect(series(resolvePlatformTheme("default", "light", "luna"))).toEqual([
      ...lightSeries,
    ]);
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
