import { readFileSync } from "node:fs";
import {
  contrastFloors,
  getTheme,
  highContrastThemes,
  isThemeMode,
  platformStyles,
  platformTheme,
  themes,
  type Theme,
  type ThemeMode,
} from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { builtInThemes } from "../components/docs/theme-matrix";
import {
  namedImports,
  publishedNames,
  typescriptSnippets,
  unresolvedImports,
} from "./doc-snippets.test-util";
import { sidebarPages } from "./sidebar-pages.test-util";

/**
 * The pages that teach the theme switch.
 *
 * `/docs/dark-mode` and `/docs/theming` both listed the built-in themes by
 * hand — a table of `getTheme` calls on one page and a table of names and
 * exports on the other — and nothing held either table to `@gpuixui/tokens`. A
 * fifth theme, a renamed export or a new contrast variant would have left the
 * site describing a library that no longer shipped them, and the two tables
 * would have disagreed with each other as well.
 *
 * The themes are now one generated specimen (`<ThemeMatrix />`), so this guard
 * holds what is left: the pages mount it, the export names they still print are
 * published by the package and return the theme they sit beside, and the claims
 * the pages make about the platform rule, the appearance query and the boundary
 * floor are the ones the package keeps.
 */

const dir = new URL("../../content/docs/", import.meta.url);

const read = (name: string): string => readFileSync(new URL(name, dir), "utf8");

const darkMode = read("dark-mode.mdx");
const theming = read("theming.mdx");

/** A `##` section of a page, without its following siblings. */
const section = (body: string, heading: string): string => {
  const start = body.indexOf(`## ${heading}`);
  const end = body.indexOf("\n## ", start + 1);
  return start === -1 ? "" : body.slice(start, end === -1 ? undefined : end);
};

/** The prose with its line wrapping flattened: a sentence is not two lines. */
const flat = (text: string): string => text.replace(/\s+/g, " ");

/** The themes the package ships, by the name it gives them. */
const themeNames = (): ReadonlySet<string> =>
  new Set(builtInThemes().map(({ theme }) => theme.name));

/**
 * The named exports that return a built-in theme.
 *
 * The package publishes each theme twice — by name and through the per-mode
 * record — so the resolver takes either shape.
 */
const directExports: ReadonlyMap<string, Theme> = new Map([
  ["lightTheme", themes.light],
  ["darkTheme", themes.dark],
  ["highContrastLightTheme", highContrastThemes.light],
  ["highContrastDarkTheme", highContrastThemes.dark],
]);

const recordExports: ReadonlyMap<
  string,
  Readonly<Record<ThemeMode, Theme>>
> = new Map([
  ["themes", themes],
  ["highContrastThemes", highContrastThemes],
]);

/** The theme an export name resolves to, if it names one. */
const themeOf = (name: string): Theme | undefined => {
  const [head = "", ...rest] = name.split(".");
  if (rest.length === 0) return directExports.get(head);
  const mode = rest[0];
  if (mode === undefined || !isThemeMode(mode)) return undefined;
  return recordExports.get(head)?.[mode];
};

/** The export names a page prints in its built-in-theme table. */
const exportRows = (
  body: string,
): ReadonlyArray<{
  readonly label: string;
  readonly names: ReadonlyArray<string>;
}> =>
  section(body, "Built-in themes")
    .split("\n")
    .flatMap((line) => {
      const match = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/.exec(line);
      const [, label, cell] = match ?? [];
      if (label === undefined || cell === undefined) return [];
      if (label === "Theme" || /^-+$/.test(label)) return [];
      const names = [...cell.matchAll(/`([^`]+)`/g)].flatMap((found) =>
        found[1] === undefined ? [] : [found[1]],
      );
      return names.length === 0 ? [] : [{ label, names }];
    });

describe("the pages that list the built-in themes", () => {
  it("mount the generated specimen on both pages", () => {
    // The two hand-written tables are the defect: a theme the package adds, a
    // renamed export or a reworded name would leave one of them lying.
    expect(darkMode).toContain("<ThemeMatrix />");
    expect(section(theming, "Built-in themes")).toContain("<ThemeMatrix />");

    // The specimen is registered once, in the shared MDX map, so a page can
    // mount it without importing it.
    const registry = readFileSync(
      new URL("../components/mdx.tsx", import.meta.url),
      "utf8",
    );
    expect(registry).toContain(
      'import { ThemeMatrix } from "./docs/theme-matrix"',
    );
    expect(registry).toContain("ThemeMatrix,");
  });

  it("keep no hand-written copy of the theme list", () => {
    // A table row that names a `getTheme` call is the old copy; the specimen
    // owns that list now.
    expect(darkMode).not.toMatch(/^\|\s*`getTheme\(/m);
  });

  it("name only exports the package publishes", () => {
    const published = publishedNames().get("@gpuixui/tokens");
    const unknown = exportRows(theming).flatMap(({ label, names }) =>
      names
        .filter((name) => !(published?.has(name.split(".")[0] ?? "") ?? false))
        .map((name) => `${label}: ${name} is not published by @gpuixui/tokens`),
    );

    expect(unknown).toEqual([]);
  });

  it("put every export beside the theme it returns", () => {
    const names = themeNames();
    const wrong = exportRows(theming).flatMap(({ label, names: exports }) => {
      if (!names.has(label)) {
        return [`${label} is not a theme the package ships`];
      }
      return exports.flatMap((name) => {
        const theme = themeOf(name);
        if (theme === undefined) return [`${label}: ${name} names no theme`];
        return theme.name === label
          ? []
          : [`${label}: ${name} returns ${theme.name}`];
      });
    });

    expect(wrong).toEqual([]);
  });

  it("resolve the imports the pages write", () => {
    const imports = namedImports(typescriptSnippets(darkMode));

    expect(unresolvedImports(imports)).toEqual([]);
  });

  it("quote the boundary floor the package enforces", () => {
    // The page told a reader `borderStrong` is held to 3:1. That number is the
    // package's `contrastFloors.boundary`, so the page now interpolates it and
    // cannot fall behind the contract.
    expect(darkMode).toContain(
      'import { contrastFloors } from "@gpuixui/tokens";',
    );
    expect(darkMode).toContain("{contrastFloors.boundary}:1");
    expect(darkMode).not.toMatch(/held to 3:1/);
    expect(contrastFloors.boundary).toBe(3);
  });

  it("keep the claim that the runtime has no appearance query", () => {
    // The honest contract: the host application owns the mode, because the
    // runtime cannot be asked. The version it was measured on is held by
    // `runtime-version.test.ts`; this is the claim itself.
    expect(darkMode).toMatch(/exposes no appearance query/);
    expect(darkMode).toContain("## Why the app owns it");
  });

  it("state the platform rule the package keeps", () => {
    // The page teaches that a platform style carries the platform's radii,
    // density and colour roles, and that a high-contrast base keeps its own
    // colours. The package keeps exactly that, so the guard executes it.
    const base = getTheme("dark");
    const win32 = platformTheme(base, "win32");

    expect(win32.mode).toBe(base.mode);
    expect(win32.contrast).toBe(base.contrast);
    expect(win32.typography.mono).toBe(platformStyles.win32.mono);
    expect(win32.radius).toEqual(platformStyles.win32.radius);
    expect(win32.density.name).toBe(platformStyles.win32.density);

    const accessible = getTheme("dark", "high");
    expect(platformTheme(accessible, "win32").colors.primary).toBe(
      accessible.colors.primary,
    );

    expect(darkMode).toContain("platformTheme");
    expect(flat(darkMode)).toContain("radii, density and colour roles");
    expect(flat(darkMode)).toContain(
      "a high-contrast base keeps its own colours",
    );
  });

  it("sit in the sidebar", () => {
    const sidebar = sidebarPages(new URL("../../", import.meta.url));

    expect(sidebar).toContain("dark-mode");
    expect(sidebar).toContain("theming");
  });
});
