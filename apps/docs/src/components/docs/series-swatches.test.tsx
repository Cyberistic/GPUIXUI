import {
  extendTheme,
  highContrastThemes,
  lightSeries,
  platformTheme,
  retroStyles,
  seriesColors,
  themes,
  type Theme,
} from "@gpuixui/tokens";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { resolvePlatformTheme } from "../../lib/platform";
import { SeriesSwatchesBody } from "./series-swatches";

/**
 * The data-series specimen.
 *
 * The Theming page claims a chart paints the theme's categorical scale, so the
 * guard is that every position is rendered with the theme's own colour and that
 * the scale it shows is the one the switch resolves — a specimen that painted a
 * fixed palette would keep showing one theme's colours under another.
 */

const render = (theme: Theme): string =>
  renderToStaticMarkup(<SeriesSwatchesBody theme={theme} />);

/** Each rendered swatch, keyed by its series position, cut at the next one. */
const swatches = (markup: string): ReadonlyMap<number, string> =>
  new Map(
    markup
      .split('data-series="')
      .slice(1)
      .map((section) => [
        Number(section.slice(0, section.indexOf('"'))),
        section.slice(section.indexOf('"')),
      ]),
  );

const theme = themes.dark;
const markup = render(theme);

describe("the data-series specimen", () => {
  it("renders every position with the theme's own colour and variable", () => {
    const drawn = swatches(markup);

    expect([...drawn.keys()]).toEqual([1, 2, 3, 4, 5]);

    const wrong = seriesColors(theme).flatMap((color, index) => {
      const swatch = drawn.get(index + 1);
      return swatch !== undefined &&
        swatch.includes(color) &&
        swatch.includes(`--series-${index + 1}`)
        ? []
        : [`series ${index + 1}: expected ${color}`];
    });

    expect(wrong).toEqual([]);
  });

  it("shows a scale per mode, not one palette reused", () => {
    const light = seriesColors(themes.light);

    // The scale is designed per mode: a hue that separates on a pale canvas does
    // not separate on a dark one. The specimen must therefore differ by mode.
    expect(render(themes.light)).not.toBe(markup);
    expect([...light]).not.toEqual([...seriesColors(theme)]);
    expect(swatches(render(themes.light)).get(1)).toContain(light[0]);
  });

  it("resolves the high-contrast scale, not the default one", () => {
    const wrong = [highContrastThemes.light, highContrastThemes.dark].flatMap(
      (theme) => {
        const drawn = swatches(render(theme));
        const scale = seriesColors(theme);
        const own = drawn.get(1)?.includes(scale[0]) === true;
        const differs =
          [...scale].join() !== [...seriesColors(themes[theme.mode])].join();
        return own && differs ? [] : [`${theme.mode} high contrast`];
      },
    );

    expect(wrong).toEqual([]);
  });

  it("follows the platform switch and paints the scale a look declares", () => {
    const win32 = platformTheme(themes.light, "win32");
    const luna = resolvePlatformTheme("default", "light", "luna");
    const lunaOwn = retroStyles.luna.series?.light;

    // A platform style owns chrome, so it resolves its base mode's scale; a
    // look that repaints the surfaces a plot is drawn on declares its own —
    // Luna's beige page swallows the shared light amber — and `applyStyle`
    // passes it. A look that declared none would fall back to `lightSeries`.
    expect([...seriesColors(win32)]).toEqual([...lightSeries]);
    expect(lunaOwn).toBeDefined();
    expect([...seriesColors(luna)]).toEqual([...(lunaOwn ?? lightSeries)]);
    expect(swatches(render(luna)).get(5)).toContain(seriesColors(luna)[4]);
  });

  it("shows a theme's own scale when the theme carries one", () => {
    const brand = extendTheme(themes.dark, {
      series: ["#111111", "#222222", "#333333", "#444444", "#555555"],
    });
    const drawn = swatches(render(brand));

    expect(seriesColors(brand)[0]).toBe("#111111");
    expect(drawn.get(1)).toContain("#111111");
    expect(drawn.get(1)).not.toContain(seriesColors(themes.dark)[0]);
  });
});
