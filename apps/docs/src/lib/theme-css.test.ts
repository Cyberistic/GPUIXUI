import { themes } from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cssFontStack } from "./fonts";
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
  captures(css, /var\((--[a-z-]+)/g, 1);

/** Every custom property a style sheet declares. */
const declaredVars = (css: string): ReadonlyArray<string> =>
  captures(css, /^\s*(--[a-z-]+):/gm, 1);

/** The declarations of a block, as `{ name, value }` pairs. */
const declarations = (body: string): ReadonlyArray<Declaration> =>
  [...body.matchAll(/(--[a-z-]+):\s*([^;]+);/g)].flatMap((match) => {
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
      if (role === "radius") return value !== `${themes.dark.radius.md}px`;
      const expected = darkColours[role];
      // Not every declared name is a colour role; only roles are held here.
      return expected === undefined ? false : value !== expected.toLowerCase();
    });

    // The landing's product window renders outside a PreviewSurface, so these
    // defaults are the only paint it gets: they must be the library's.
    expect(mismatched.map(({ name }) => name)).toEqual([]);
  });

  it("carry no library colour literal outside the defaults", () => {
    const values = Object.values(darkColours).map((value) =>
      value.toLowerCase(),
    );
    const defaults = block(read("../styles/demos.css"), ".gx-demo");

    const literals = previewCss().flatMap(([sheet, css]) => {
      // The dashboard's palette is its own: the landing renders the same markup
      // light and dark from `--dash-*`, so it is not a library preview.
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
