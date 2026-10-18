import { describe, expect, it } from "vitest";
import { remarkAutoTypeTable } from "fumadocs-typescript";
import { darkTheme, lightTheme } from "@gpuixui/tokens";
import sourceConfig from "../source.config";
import {
  codeColorReplacements,
  codeThemes,
  codeThemeNames,
  contrastRatio,
  parseColour,
  TEXT_CONTRAST_FLOOR,
} from "./lib/code-palette";

/**
 * The bug guarded: the default GitHub Light/Dark pair painted light `#e36209`
 * at 3.49:1 and dark `#6a737d` at 3.51:1 on the docs code surface — below the
 * 4.5:1 text floor on 146 of 180 page-modes. Nothing compared a syntax colour
 * to the floor, so the site shipped unreadable code for its whole life.
 *
 * These tests prove the palette and the wiring; `smoke:browser` proves the
 * painted page, because only a browser resolves the Shiki variables to pixels.
 */

/** A test fixture that cannot be read is a broken test, not a recoverable case. */
const ratio = (foreground: string, background: string): number => {
  const first = parseColour(foreground);
  const second = parseColour(background);
  if (first === null || second === null) {
    throw new Error(`unreadable colour pair ${foreground} / ${background}`);
  }
  return contrastRatio(first, second);
};

const isObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

const read = (value: object, key: string): unknown => Reflect.get(value, key);

describe("code palette", () => {
  it("replaces a colour that fails the floor with one that clears it", () => {
    const failures = (["light", "dark"] as const).flatMap((mode) => {
      const entry = codeThemes[mode];
      return Object.entries(entry.replacements)
        .flatMap(([from, to]) => [
          {
            message: `${mode}: ${from} is not below the floor, so it needs no replacement`,
            passes: ratio(from, entry.background) < TEXT_CONTRAST_FLOOR,
          },
          {
            message: `${mode}: ${to} is below ${TEXT_CONTRAST_FLOOR}:1 on ${entry.background}`,
            passes: ratio(to, entry.background) >= TEXT_CONTRAST_FLOOR,
          },
        ])
        .filter((check) => !check.passes)
        .map((check) => check.message);
    });
    expect(failures).toEqual([]);
  });

  it("corrects exactly the two measured colours, one per scheme", () => {
    expect(codeThemes.light.replacements).toEqual({ "#e36209": "#b34700" });
    expect(codeThemes.dark.replacements).toEqual({ "#6a737d": "#8b949e" });
    expect(codeThemes.light.background).toBe(lightTheme.colors.card);
    expect(codeThemes.dark.background).toBe(darkTheme.colors.card);
  });

  it("keys replacements by the theme names Shiki matches", () => {
    // Shiki resolves a per-theme map by `theme.name`; a renamed key would drop
    // the correction silently, so these are the defaults Fumadocs ships.
    expect(Object.keys(codeColorReplacements)).toEqual([
      "github-light",
      "github-dark",
    ]);
    expect(Object.values(codeThemeNames)).toEqual(
      Object.keys(codeColorReplacements),
    );
  });

  it("reads the hex and computed-rgb colours the two callers pass", () => {
    expect(parseColour("#e36209")).toEqual({ r: 227, g: 98, b: 9 });
    expect(parseColour("rgb(255, 255, 255)")).toEqual({
      r: 255,
      g: 255,
      b: 255,
    });
    expect(parseColour("oklab(0.2 0 0)")).toBeNull();
  });
});

describe("source.config wiring", () => {
  const options = sourceConfig.mdxOptions;

  it("is a static options object, not a builder", () => {
    expect(isObject(options)).toBe(true);
  });

  it("passes the palette to the fence and include pipeline", () => {
    if (!isObject(options)) return;
    const code = read(options, "rehypeCodeOptions");
    expect(isObject(code)).toBe(true);
    if (!isObject(code)) return;
    expect(read(code, "themes")).toEqual(codeThemeNames);
    expect(read(code, "colorReplacements")).toEqual(codeColorReplacements);
  });

  it("passes the palette to the generated prop tables", () => {
    if (!isObject(options)) return;
    const plugins = read(options, "remarkPlugins");
    expect(Array.isArray(plugins)).toBe(true);
    if (!Array.isArray(plugins)) return;
    const entry = plugins.find(
      (plugin: unknown) =>
        Array.isArray(plugin) && plugin[0] === remarkAutoTypeTable,
    );
    expect(entry, "remarkAutoTypeTable is not configured").toBeDefined();
    if (!Array.isArray(entry)) return;
    const pluginOptions = entry[1];
    expect(isObject(pluginOptions)).toBe(true);
    if (!isObject(pluginOptions)) return;
    const shiki = read(pluginOptions, "shiki");
    expect(isObject(shiki)).toBe(true);
    if (!isObject(shiki)) return;
    expect(read(shiki, "themes")).toEqual(codeThemeNames);
    expect(read(shiki, "colorReplacements")).toEqual(codeColorReplacements);
  });
});
