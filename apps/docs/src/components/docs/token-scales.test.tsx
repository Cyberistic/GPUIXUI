import {
  densityNames,
  densityPresets,
  elevationLevels,
  platformTheme,
  themes,
  type Theme,
} from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TokenScalesBody } from "./token-scales";

/**
 * The geometry specimens.
 *
 * The page claims to show the spacing, radius, border, icon and density scales,
 * so the guard is that every step the theme has is rendered with its own value —
 * a step added to `@gpuixui/tokens` and left out here would be a public token no
 * docs page shows. The elevation order is the package's `elevationLevels`; the
 * specimen and the source guard keep it that way.
 */

const render = (theme: Theme): string =>
  renderToStaticMarkup(<TokenScalesBody theme={theme} />);

/** Each rendered row, keyed by its `data-token`, cut at the next row. */
const rows = (markup: string): ReadonlyMap<string, string> =>
  new Map(
    markup
      .split('data-token="')
      .slice(1)
      .map((section) => [
        section.slice(0, section.indexOf('"')),
        section.slice(section.indexOf('"')),
      ]),
  );

const theme = themes.dark;
const markup = render(theme);

describe("the token scales", () => {
  it("renders every step of every geometric scale with its pixel value", () => {
    const scales = {
      spacing: theme.spacing,
      radius: theme.radius,
      borderWidth: theme.borderWidth,
      iconSize: theme.iconSize,
    };
    const drawn = rows(markup);

    const missing = Object.entries(scales).flatMap(([scale, steps]) =>
      Object.entries(steps).flatMap(([name, value]) => {
        const row = drawn.get(`${scale}.${name}`);
        return row !== undefined && row.includes(`${value}px`)
          ? []
          : [`${scale}.${name} (${value}px)`];
      }),
    );

    expect(missing).toEqual([]);
  });

  it("lists every elevation level the theme has", () => {
    expect([...elevationLevels]).toEqual(Object.keys(theme.elevation));
  });

  it("paints the levels in the package's order", () => {
    const drawn = [...rows(markup).keys()].filter((key) =>
      key.startsWith("elevation."),
    );

    expect(drawn).toEqual(elevationLevels.map((level) => `elevation.${level}`));
  });

  it("reads the elevation order from the package, not a local list", () => {
    const source = readFileSync(
      new URL("./token-scales.tsx", import.meta.url),
      "utf8",
    );
    const imports = source.slice(0, source.indexOf('from "@gpuixui/tokens"'));

    expect(imports).toMatch(/\belevationLevels\b/);
    expect(source).not.toMatch(/\bconst\s+elevationLevels\b/);
  });

  it("paints one shadow for each populated elevation level", () => {
    const painted = elevationLevels.filter((level) =>
      rows(markup).get(`elevation.${level}`)?.includes("box-shadow"),
    );

    expect(painted).toEqual(["sm", "md", "lg"]);
    expect(
      elevationLevels.filter(
        (level) => rows(markup).get(`elevation.${level}`) === undefined,
      ),
    ).toEqual([]);
  });

  it("shows all three density presets and marks the active one", () => {
    const drawn = rows(markup);

    expect(
      [...drawn.keys()].filter((key) => key.startsWith("density.")),
    ).toEqual(densityNames.map((name) => `density.${name}`));
    expect(
      densityNames.filter(
        (name) =>
          !drawn
            .get(`density.${name}`)
            ?.includes(`${densityPresets[name].rowHeight}px`),
      ),
    ).toEqual([]);
    expect(drawn.get(`density.${theme.density.name}`)).toContain("· active");
    expect(
      densityNames.filter(
        (name) =>
          name !== theme.density.name &&
          drawn.get(`density.${name}`)?.includes("· active"),
      ),
    ).toEqual([]);
  });

  it("follows the platform switch's radii and density", () => {
    const linux = platformTheme(themes.dark, "linux");
    const drawn = rows(render(linux));

    expect(drawn.get("radius.lg")).toContain(`${linux.radius.lg}px`);
    expect(drawn.get(`density.${linux.density.name}`)).toContain("· active");
    // Linux is the spacious preset, so this cannot pass against the base theme.
    expect(linux.density.controlHeight.md).not.toBe(
      theme.density.controlHeight.md,
    );
    expect(linux.density.name).not.toBe(theme.density.name);
  });
});

describe("the theming page's scales", () => {
  const page = readFileSync(
    new URL("../../../content/docs/theming.mdx", import.meta.url),
    "utf8",
  );

  it("mounts the generated specimens", () => {
    expect(page).toContain("<TokenScales />");
  });

  it("places them after the theme shape and before the platform styles", () => {
    const scales = page.indexOf("<TokenScales />");
    const platformStyles = page.indexOf("## Platform styles");

    expect(scales).toBeGreaterThan(page.indexOf("## Override a theme"));
    expect(scales).toBeLessThan(platformStyles);
  });
});
