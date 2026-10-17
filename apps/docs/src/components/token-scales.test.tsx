import {
  darkTheme,
  elevationShadow,
  lightTheme,
  type ElevationLevel,
  type Theme,
} from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TokenScales } from "./token-scales";

/**
 * Guards the generated scale catalogue (plan 430): every spacing, radius,
 * border-width, icon-size, density and elevation token the package ships must
 * render with its real value. The failures it catches are a dropped group, a
 * dropped row, and a value retyped on the page after the theme changed.
 */
const html = renderToStaticMarkup(<TokenScales />);

const attribute = (
  token: string,
  name: "data-value" | "data-light" | "data-dark",
): Option.Option<string> => {
  const start = html.indexOf(`data-token="${token}"`);
  if (start === -1) return Option.none();
  const tag = html.slice(start, html.indexOf(">", start));
  return Option.fromNullishOr(tag.match(new RegExp(`${name}="([^"]*)"`))?.[1]);
};

const rendered = (
  token: string,
  name: "data-value" | "data-light" | "data-dark",
): string => Option.getOrElse(attribute(token, name), () => "");

const rowsIn = (group: string): number =>
  Arr.length(
    Arr.fromIterable(html.matchAll(new RegExp(`data-token="${group}\\.`, "g"))),
  );

const px = (value: number): string => `${value}px`;

const entriesOf = <K extends string>(
  record: Readonly<Record<K, number>>,
): ReadonlyArray<readonly [string, number]> =>
  Arr.map(R.toEntries(record), ([key, value]) => [key, value] as const);

const groups = [
  { id: "spacing", entries: entriesOf(lightTheme.spacing) },
  { id: "radius", entries: entriesOf(lightTheme.radius) },
  { id: "borderWidth", entries: entriesOf(lightTheme.borderWidth) },
  { id: "iconSize", entries: entriesOf(lightTheme.iconSize) },
] as const;

const expectShadow = (
  theme: Theme,
  level: ElevationLevel,
  name: "data-light" | "data-dark",
): void =>
  Option.match(Option.fromNullishOr(elevationShadow(theme, level)), {
    onNone: () => {
      expect(rendered(`elevation.${level}`, name)).toBe("none (reserved)");
    },
    onSome: (source) => {
      const text = rendered(`elevation.${level}`, name);
      expect(text).toContain(
        `${source.offsetX}px ${source.offsetY}px ${source.blurRadius}px`,
      );
      expect(text).toContain(source.color);
    },
  });

describe("scale catalogue", () => {
  it("renders one row per token in every mode-independent group", () => {
    Arr.forEach(groups, ({ id, entries }) => {
      expect(html).toContain(`data-group="${id}"`);
      expect(rowsIn(id)).toBe(Arr.length(entries));
      Arr.forEach(entries, ([name, expected]) => {
        expect(html).toContain(`data-token="${id}.${name}"`);
        expect(rendered(`${id}.${name}`, "data-value")).toBe(px(expected));
      });
    });
  });

  it("renders every density metric for the shipped preset", () => {
    const { density } = lightTheme;
    expect(html).toContain('data-group="density"');
    expect(rowsIn("density")).toBe(7);
    expect(html).toContain(`Density (${density.name})`);

    Arr.forEach(["sm", "md", "lg"] as const, (size) => {
      expect(rendered(`density.controlHeight.${size}`, "data-value")).toBe(
        px(density.controlHeight[size]),
      );
      expect(rendered(`density.controlPaddingX.${size}`, "data-value")).toBe(
        px(density.controlPaddingX[size]),
      );
    });
    expect(rendered("density.rowHeight", "data-value")).toBe(
      px(density.rowHeight),
    );
  });

  it("renders each elevation level in both themes", () => {
    expect(html).toContain('data-group="elevation"');
    expect(rowsIn("elevation")).toBe(4);

    Arr.forEach(["sm", "md", "lg"] as const, (level) => {
      expectShadow(lightTheme, level, "data-light");
      expectShadow(darkTheme, level, "data-dark");
    });
    expectShadow(lightTheme, "overlay", "data-light");
    expectShadow(darkTheme, "overlay", "data-dark");
  });

  it("keeps the scales mode-independent so one value column is honest", () => {
    expect(darkTheme.spacing).toEqual(lightTheme.spacing);
    expect(darkTheme.radius).toEqual(lightTheme.radius);
    expect(darkTheme.borderWidth).toEqual(lightTheme.borderWidth);
    expect(darkTheme.iconSize).toEqual(lightTheme.iconSize);
    expect(darkTheme.density).toEqual(lightTheme.density);
  });
});
