import { readFileSync } from "node:fs";
import {
  contrastFailures,
  contrastFloors,
  contrastRatio,
  extendTheme,
  isPlatformName,
  isThemeMode,
  platformTheme,
  themes,
  type PlatformName,
  type ThemeMode,
} from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";

/**
 * The "take one and make it yours" contract on `/docs/theming`.
 *
 * The platform styles are editable data, and the page tells a reader to copy a
 * snippet and ship the result. A snippet is only advice until it is executed:
 * this guard reads the block the page shows, resolves it exactly as written,
 * and holds the result to the contract the library runs on its own themes. It
 * also fails when the page stops pointing at the executed example, so the two
 * cannot drift into one instruction with two different themes.
 */

const page = (name: string): string =>
  readFileSync(new URL(`../../content/docs/${name}`, import.meta.url), "utf8");

const theming = page("theming.mdx");

const snippet = (body: string): string =>
  body
    .split("```")
    .filter((fence) => fence.includes("extendTheme(platformTheme"))[0] ?? "";

const required = <A>(value: A | undefined, what: string): A => {
  expect(value, `the snippet has no ${what}`).toBeDefined();
  if (value === undefined) throw new Error(`the snippet has no ${what}`);
  return value;
};

/** The mode and platform the snippet derives its base from. */
const base = (block: string): { mode: ThemeMode; platform: PlatformName } => {
  const [, mode, platform] =
    /platformTheme\(themes\.(\w+), "(\w+)"\)/.exec(block) ?? [];

  if (!isThemeMode(mode) || !isPlatformName(platform)) {
    throw new Error(`the snippet names no known platform: ${block}`);
  }
  return { mode, platform };
};

/** The colour roles the snippet writes, as the page writes them. */
const colours = (block: string): Readonly<Record<string, string>> =>
  Object.fromEntries(
    [...block.matchAll(/(\w+): "(#[0-9A-Fa-f]{6})"/g)].flatMap((match) =>
      match[1] === undefined || match[2] === undefined
        ? []
        : [[match[1], match[2]]],
    ),
  );

/** The radius steps the snippet writes. */
const radii = (block: string): { readonly md: number; readonly lg: number } => {
  const value = (step: string): number =>
    Number(new RegExp(`${step}:\\s*(\\d+)`).exec(block)?.[1]);

  return { md: value("md"), lg: value("lg") };
};

/** The snippet, resolved as written. */
const houseTheme = () => {
  const block = required(snippet(theming), "platform snippet");
  const { mode, platform } = base(block);
  const written = colours(block);
  const radius = radii(block);

  const theme = extendTheme(platformTheme(themes[mode], platform), {
    name: "House",
    colors: {
      primary: required(written.primary, "primary"),
      primaryForeground: required(
        written.primaryForeground,
        "primaryForeground",
      ),
      ring: required(written.ring, "ring"),
    },
    radius: { md: radius.md, lg: radius.lg },
  });

  return { theme, mode, platform };
};

describe("the platform snippet on the theming page", () => {
  it("is a real section, placed inside the platform styles", () => {
    const start = theming.indexOf("### Take one and make it yours");
    const platformStyles = theming.indexOf("## Platform styles");
    const readTheTheme = theming.indexOf("## Read the theme");

    expect(start).toBeGreaterThan(platformStyles);
    expect(start).toBeLessThan(readTheTheme);
  });

  it("changes only the roles it writes", () => {
    const { theme, mode, platform } = houseTheme();
    const platformBase = platformTheme(themes[mode], platform);

    expect(theme.colors.primary).not.toBe(platformBase.colors.primary);
    expect(theme.colors.background).toBe(platformBase.colors.background);
    expect(theme.colors.border).toBe(platformBase.colors.border);
    expect(theme.density).toBe(platformBase.density);
    expect(theme.typography.sans).toBe(platformBase.typography.sans);
    expect(theme.typography.mono).toBe(platformBase.typography.mono);
    expect(theme.radius.md).toBe(radii(snippet(theming)).md);
    expect(theme.radius.lg).toBe(radii(snippet(theming)).lg);
  });

  it("owns the label of the fill it paints", () => {
    const { theme } = houseTheme();
    const measured = contrastRatio(
      theme.colors.primaryForeground,
      theme.colors.primary,
    );

    expect(measured).toBeDefined();
    expect(measured ?? 0).toBeGreaterThanOrEqual(contrastFloors.secondary);
  });

  it("passes the contract the library runs on its own themes", () => {
    const { theme } = houseTheme();

    expect(contrastFailures(theme)).toEqual([]);
  });

  it("leaves the shipped themes untouched", () => {
    const fillBefore = platformTheme(themes.dark, "win32").colors.primary;
    const baseBefore = themes.dark.colors.primary;

    houseTheme();

    expect(themes.dark.colors.primary).toBe(baseBefore);
    expect(platformTheme(themes.dark, "win32").colors.primary).toBe(fillBefore);
    expect(fillBefore).not.toBe(houseTheme().theme.colors.primary);
  });

  it("points at the example the package executes", () => {
    const example = readFileSync(
      new URL(
        "../../../../packages/tokens/src/platforms.example.ts",
        import.meta.url,
      ),
      "utf8",
    );

    expect(theming).toContain("packages/tokens/src/platforms.example.ts");
    expect(theming).toContain("resolveHouseTheme");
    expect(example).toContain("export const resolveHouseTheme");
  });
});
