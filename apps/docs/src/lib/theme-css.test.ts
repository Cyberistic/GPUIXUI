import {
  applyStyle,
  contrastRatio,
  darkSeries,
  decorativeFloor,
  dividerOn,
  elevationShadow,
  filledHover,
  filledPressed,
  highContrastLightSeries,
  highContrastThemes,
  lightSeries,
  platformStyles,
  materialFill,
  materialNames,
  platformTheme,
  retroStyles,
  retroTheme,
  syntaxColors,
  targetSize,
  themes,
  type SeriesColors,
  type Theme,
} from "@gpuixui/tokens";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cssFontStack } from "./fonts";
import { resolvePlatformTheme } from "./platform";
import { toCssText, toCssVars } from "./theme-css";
import {
  THUMB_SLIDE_CSS_EASE,
  THUMB_SLIDE_MS,
} from "../components/docs/switch-preview";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const appSources = (): ReadonlyArray<string> =>
  readdirSync(new URL("../", import.meta.url), {
    recursive: true,
    encoding: "utf8",
  })
    .filter((name) => /\.tsx?$/.test(name) && !name.includes(".test."))
    .map((name) => `../${name}`);

const previewCss = (): ReadonlyArray<readonly [string, string]> => [
  ["demos.css", read("../styles/demos.css")],
  ["blocks.css", read("../styles/blocks.css")],
];

const block = (css: string, selector: string): string => {
  const pattern = new RegExp(
    `^[ \\t]*${selector.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{`,
    "m",
  );
  const match = pattern.exec(css);
  if (match === null) throw new Error(`no ${selector} block`);
  const start = match.index;
  return css.slice(start, css.indexOf("}", start));
};

const captures = (css: string, pattern: RegExp, at: number): string[] =>
  [...css.matchAll(pattern)].flatMap((match) => {
    const value = match[at];
    return value === undefined ? [] : [value];
  });

const referencedVars = (css: string): ReadonlyArray<string> =>
  captures(css, /var\((--[a-z0-9-]+)/g, 1);

const declaredVars = (css: string): ReadonlyArray<string> =>
  captures(css, /^\s*(--[a-z0-9-]+):/gm, 1);

const declarations = (body: string): ReadonlyArray<Declaration> =>
  [...body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].flatMap((match) => {
    const [name, value] = [match[1], match[2]];
    return name === undefined || value === undefined ? [] : [{ name, value }];
  });

interface Declaration {
  readonly name: string;
  readonly value: string;
}

const toCamel = (name: string): string =>
  name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

const darkColours = Object.fromEntries(Object.entries(themes.dark.colors));

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

    expect(vars["--icon-size-md"]).toBe(`${themes.dark.iconSize.md}px`);
    expect(vars["--target-size"]).toBe(`${targetSize.minimum}px`);

    expect(vars["--primary-hover"]).toBe(filledHover(themes.dark, "primary"));
    expect(vars["--primary-pressed"]).toBe(
      filledPressed(themes.dark, "primary"),
    );
  });

  it("carries the platform density, so a preview's controls change size", () => {
    const height = (platform: "darwin" | "linux" | "win32") =>
      toCssVars(platformTheme(themes.dark, platform))["--control-height-md"];

    expect([height("darwin"), height("linux"), height("win32")]).toEqual([
      "28px",
      "36px",
      "32px",
    ]);
  });

  it("carries an authored look's palette, radius and family", () => {
    const vars = toCssVars(resolvePlatformTheme("default", "light", "luna"));

    expect(vars["--background"]).toBe(retroStyles.luna.colors.light.background);
    expect(vars["--radius"]).toBe(`${retroStyles.luna.radius.md}px`);
    expect(vars["--font-mono"]).toBe(retroStyles.luna.mono);
  });

  it("maps the GPUI font sentinel to a CSS stack, and leaves other families alone", () => {
    expect(cssFontStack(".SystemUIFont")).toContain("BlinkMacSystemFont");
    expect(cssFontStack("Inter")).toBe("Inter");
  });

  it("derives the rule each table row state crosses from the fill it wears", () => {
    const vars = toCssVars(themes.dark);
    const rule = (surface: string): string =>
      dividerOn(themes.dark, surface) ?? themes.dark.colors.border;

    expect(vars["--divider-card"]).toBe(rule(themes.dark.colors.card));
    expect(vars["--divider-selected"]).toBe(rule(themes.dark.colors.selected));
    expect(vars["--divider-hover"]).toBe(rule(themes.dark.colors.hover));
    expect(vars["--divider-accent"]).toBe(rule(themes.dark.colors.accent));

    const raw =
      contrastRatio(themes.dark.colors.border, themes.dark.colors.accent) ?? 1;
    expect(raw, "the dark accent no longer needs a derived rule").toBeLessThan(
      decorativeFloor,
    );
    expect(vars["--divider-accent"]).not.toBe(themes.dark.colors.border);

    const css = read("../styles/demos.css");
    expect(block(css, ".gx-table-head")).toContain("var(--divider-muted)");
    expect(block(css, ".gx-table-head")).toContain("background: var(--muted)");
    expect(vars["--divider-muted"]).toBe(rule(themes.dark.colors.muted));

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

  it("publishes each elevation level's own shadow", () => {
    const vars = toCssVars(themes.dark);
    for (const level of ["sm", "md", "lg"] as const) {
      const shadow = elevationShadow(themes.dark, level);
      if (shadow === undefined) throw new Error(`the theme has no ${level}`);
      expect(vars[`--elevation-${level}`]).toBe(
        `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blurRadius}px ${shadow.spreadRadius}px ${shadow.color}`,
      );
    }

    expect(vars["--elevation-overlay"]).toBeUndefined();
  });

  it("publishes each material as the fill the native window paints", () => {
    const mac = platformTheme(themes.light, "darwin");
    expect(
      materialNames.map((name) => toCssVars(mac)[`--material-${name}`]),
    ).toEqual(materialNames.map((name) => materialFill(mac, name)));
    expect(toCssVars(mac)["--material-sidebar"]).not.toBe(mac.colors.muted);
    expect(toCssVars(themes.dark)["--material-sidebar"]).toBe(
      themes.dark.colors.muted,
    );
  });

  it("publishes the syntax palette a code block paints", () => {
    const palette = syntaxColors(themes.dark);
    const vars = toCssVars(themes.dark);

    expect(vars["--syntax-keyword"]).toBe(palette.keyword);
    expect(vars["--syntax-string-special"]).toBe(palette.stringSpecial);
    expect(vars["--syntax-function-builtin"]).toBe(palette.functionBuiltin);
  });
});

describe("the block reader", () => {
  it("reads the selector that starts a line, not a compound one ending in it", () => {
    const sheet = [
      ".gx-base.gx-demo {",
      "  background: red;",
      "}",
      "",
      ".gx-demo {",
      "  background: blue;",
      "}",
    ].join("\n");

    expect(block(sheet, ".gx-demo")).toContain("background: blue");
    expect(block(sheet, ".gx-base.gx-demo")).toContain("background: red");
  });
});

describe("preview style sheets", () => {
  it("read only variables the bridge provides, or declares of their own", () => {
    const provided = new Set([
      ...Object.keys(toCssVars(themes.dark)),

      "--switch-on",
      "--switch-off",
      "--switch-knob",
      "--switch-edge",
      "--switch-edge-shadow",
      "--switch-knob-shadow",
      "--switch-track-width",
      "--switch-track-height",
      "--switch-knob-size",
      "--switch-inset",
      "--switch-border-width",
      "--switch-track-width-sm",
      "--switch-track-height-sm",
      "--switch-knob-size-sm",
      "--switch-inset-sm",
      "--switch-border-width-sm",
      "--switch-track-width-lg",
      "--switch-track-height-lg",
      "--switch-knob-size-lg",
      "--switch-inset-lg",
      "--switch-border-width-lg",

      "--gx-aspect-width",
      "--gx-aspect-height",
      "--gx-aspect-tallest",
    ]);

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

      const metric = darkDensity[name.slice(2)];
      if (metric !== undefined) return value !== `${metric}px`;
      const fill = darkFills[name.slice(2)];
      if (fill !== undefined) return value !== fill.toLowerCase();
      if (role === "radius") return value !== `${themes.dark.radius.md}px`;
      const expected = darkColours[role];

      return expected === undefined ? false : value !== expected.toLowerCase();
    });

    expect(mismatched.map(({ name }) => name)).toEqual([]);
  });

  it("keeps every density default it paints, not only the colours", () => {
    const declared = declarations(
      block(read("../styles/demos.css"), ".gx-base"),
    );
    const metrics = declared
      .map(({ name }) => name.slice(2))
      .filter((name) =>
        /^(?:control-|row-|spacing-|icon-size-|target-size$)/.test(name),
      );

    expect(metrics.length).toBeGreaterThan(5);
    expect(metrics.filter((name) => darkDensity[name] === undefined)).toEqual(
      [],
    );
    expect(block(read("../styles/demos.css"), ".gx-base")).toContain(
      `--row-height: ${themes.dark.density.rowHeight}px`,
    );
  });

  it("keep the scene free of variables, so a preview inherits its surface", () => {
    const scene = block(read("../styles/demos.css"), ".gx-demo");
    expect(declarations(scene)).toEqual([]);

    expect(scene).toContain("background-color: var(--background)");
    expect(scene).toContain("background-size: 16px 16px");
    expect(scene).toContain(
      "color-mix(in srgb, var(--foreground) 9%, transparent)",
    );
    expect(scene).not.toContain("radial-gradient(720px");
    expect(scene).toContain("color: var(--foreground)");

    const landing = read("../components/landing/landing.tsx");
    expect(landing).toContain('className="gx-base gx-demo"');

    const hosts = appSources()
      .filter((path) => read(path).includes('className="gx-demo"'))
      .filter((path) => !path.endsWith("landing/landing.tsx"));
    expect(hosts).toEqual([]);
  });

  it("follows the palette a surface carries in the scene's own chrome", () => {
    const css = read("../styles/demos.css");

    expect(block(css, ".gx-demo")).toContain("color-scheme: dark");
    const light = block(css, '.gx-demo[data-mode="light"]');
    expect(light).toContain("color-scheme: light");
    expect(light).not.toContain("color-scheme: dark");

    const surface = read("../components/docs/preview-surface.tsx");

    expect(surface).toContain("data-mode={theme.mode}");
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
    const row = block(read("../styles/demos.css"), ".gx-list-row");

    expect(row).toContain("--row-height");
    expect(row).toContain("--spacing-md");
  });

  it("keeps a hovered row's label in the role the row resolves", () => {
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
    const clear = block(read("../styles/demos.css"), ".gx-search-clear");

    expect(clear).toContain("--target-size");
    expect(clear).not.toContain("width: 18px");
  });

  it("reads a switch's band, pill and knob from the theme's steps", () => {
    const css = read("../styles/demos.css");

    expect(block(css, ".gx-switch")).toContain(
      "min-height: var(--target-size)",
    );

    expect(block(css, ".gx-switch-track")).toContain(
      "var(--switch-track-width, calc(var(--icon-size-md) * 1.75))",
    );
    expect(block(css, ".gx-switch-track")).toContain(
      "var(--switch-track-height, var(--icon-size-md))",
    );
    expect(block(css, ".gx-switch-thumb")).toContain(
      "var(--switch-knob-size, calc(var(--icon-size-md) - 4px))",
    );

    expect(block(css, ".gx-switch-thumb")).toContain(
      `transition: left ${THUMB_SLIDE_MS}ms ${THUMB_SLIDE_CSS_EASE}`,
    );
  });

  it("draws each platform's switch box from the bridge", () => {
    const css = read("../styles/demos.css");

    expect(block(css, ".gx-switch-track")).toContain(
      "var(--switch-track-width, calc(var(--icon-size-md) * 1.75))",
    );
    expect(block(css, ".gx-switch-track")).toContain(
      "var(--switch-track-height, var(--icon-size-md))",
    );
    expect(block(css, ".gx-switch-track")).toContain(
      "var(--switch-border-width, 1px)",
    );
    expect(block(css, ".gx-switch-thumb")).toContain(
      "var(--switch-knob-size, calc(var(--icon-size-md) - 4px))",
    );
    expect(block(css, ".gx-switch-thumb")).toContain(
      "var(--switch-track-height, var(--icon-size-md))",
    );
    expect(block(css, ".gx-switch-thumb")).not.toContain("top: 2px");

    expect(block(css, ".gx-switch-track")).toContain(
      "var(--switch-off, var(--muted))",
    );
    expect(block(css, ".gx-switch-track")).toContain(
      "var(--switch-edge, var(--border-strong))",
    );
    expect(block(css, ".gx-switch-thumb")).toContain(
      "var(--switch-knob, var(--foreground))",
    );
  });

  it("moves a control's paint on hover, never its box", () => {
    const css = read("../styles/demos.css");
    const hover = [
      ...css.matchAll(/(\.gx-(?:btn|field)[^{]*:hover[^{]*)\{([^}]*)\}/g),
    ];

    expect(hover.length).toBeGreaterThan(3);
    const shifting = hover
      .filter(([, , body]) => /border-width|\bpadding/.test(body ?? ""))
      .map(([, selector]) => selector);
    expect(shifting).toEqual([]);
  });

  it("writes a declared switch's paint, and the knob's lift, as variables", () => {
    const apple = platformTheme(themes.dark, "darwin");
    const vars = toCssVars(apple);

    expect(vars["--switch-on"]).toBe("#30D158");
    expect(vars["--switch-off"]).toBe("#39393D");
    expect(vars["--switch-knob"]).toBe("#FFFFFF");
    expect(vars["--switch-track-width"]).toBe("38px");
    expect(vars["--switch-track-height"]).toBe("22px");
    expect(vars["--switch-knob-size"]).toBe("20px");
    expect(vars["--switch-inset"]).toBe("1px");
    expect(vars["--switch-border-width"]).toBe("0px");
    expect(vars["--switch-knob-shadow"]).toBeDefined();

    expect(
      toCssVars(platformTheme(themes.dark, "win32"))["--switch-edge"],
    ).toBe("#8A8A8A");

    expect(Object.keys(toCssVars(themes.dark))).not.toContain("--switch-on");
  });

  it("takes a timeline's dot and rail from the roles the mark contract holds", () => {
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
    const css = read("../styles/demos.css");
    const marker = block(css, ".gx-stepper-marker");

    expect(marker).toContain("width: var(--control-height-md)");
    expect(marker).toContain("height: var(--control-height-md)");
    expect(marker).not.toContain("28px");

    expect(
      block(css, '.gx-stepper-step[data-status="complete"] .gx-stepper-marker'),
    ).toContain("background: var(--secondary)");
    expect(
      block(css, '.gx-stepper-step[data-status="current"] .gx-stepper-marker'),
    ).toContain("background: var(--primary)");
    expect(
      block(css, '.gx-stepper-step[data-status="upcoming"] .gx-stepper-marker'),
    ).toContain("background: var(--muted)");

    expect(
      block(css, '.gx-stepper-step[data-status="upcoming"] .gx-stepper-label'),
    ).toContain("color: var(--muted-foreground)");
  });

  it("draws the carousel's arrows as the shared secondary button", () => {
    const css = read("../styles/demos.css");
    const arrows = read("../components/docs/carousel-demo.tsx");

    expect(
      arrows.match(/gx-btn gx-btn-secondary gx-btn-square/g) ?? [],
    ).toHaveLength(2);
    expect(css).not.toContain(".gx-carousel-btn");
    expect(block(css, ".gx-btn-secondary")).toContain(
      "background: var(--secondary)",
    );

    expect(block(css, ".gx-btn-secondary:hover")).toContain(
      "color-mix(in srgb, var(--secondary), var(--foreground) 12%)",
    );
    expect(block(css, ".gx-carousel-card")).toContain(
      "border: 1px solid var(--border)",
    );
    expect(block(css, ".gx-carousel-dot-mark[data-selected]")).toContain(
      "var(--primary)",
    );

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
  const cssSeries = (
    scale: ReadonlyArray<string | undefined>,
  ): ReadonlyArray<string | undefined> =>
    scale.map((colour) => colour?.toLowerCase());

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

    expect(series(themes.dark)).toEqual([...darkSeries]);
    expect(series(themes.light)).toEqual([...lightSeries]);

    const look = (name: "luna" | "aero") => {
      const theme = resolvePlatformTheme("default", "light", name);
      const declared = retroStyles[name].series?.light;
      expect(theme.series?.length ?? 0).toBe(declared?.length ?? 0);

      expect(cssSeries(series(theme))).toEqual(
        cssSeries(theme.series ?? lightSeries),
      );
    };
    look("luna");
    look("aero");

    const lookWithSeries = {
      ...platformStyles.default,
      series: { light: lookSeries },
    };
    expect(cssSeries(series(applyStyle(themes.light, lookWithSeries)))).toEqual(
      cssSeries(lookSeries),
    );

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

    expect(values(".landing .gx-dash")).toEqual(cssSeries(lightSeries));
    expect(values(".dark .landing .gx-dash")).toEqual(cssSeries(darkSeries));
  });

  it("draws the dashboard's charts from the variables, not a palette", () => {
    const source = read("../components/docs/dashboard.tsx");

    expect(source.match(/#[0-9a-f]{6}\b/gi) ?? []).toEqual([]);
    expect(source).toContain("var(--dash-series-");

    expect(source).toContain("const series = seriesColors(theme)");
    expect(source).toContain("const theme = useTheme()");
  });
});

describe("the generated stylesheet", () => {
  it("writes every variable the preview reads, exactly once", () => {
    const theme = retroTheme(themes.dark, "aero");
    const vars = Object.entries(toCssVars(theme));
    const text = toCssText(theme, ".aero");

    expect(text.startsWith(".aero {\n")).toBe(true);
    expect(text.trimEnd().endsWith("}")).toBe(true);
    expect(text.trimEnd().split("\n")).toHaveLength(vars.length + 2);
    for (const [name, value] of vars) {
      expect(text).toContain(`  ${name}: ${value};`);
      expect(text.split(`  ${name}: `)).toHaveLength(2);
    }
  });

  it("names the root selector by default", () => {
    expect(toCssText(themes.light).startsWith(":root {\n")).toBe(true);
  });
});
