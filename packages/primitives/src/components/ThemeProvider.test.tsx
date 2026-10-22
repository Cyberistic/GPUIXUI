/**
 * `ThemeProvider` — the three decisions it makes.
 *
 * The bugs behind these: a provider that quietly invents a palette, one whose
 * density override reaches a colour, and one that owns a **second** theme
 * context. The first is guarded by the error naming the provider (there is no
 * default theme by design — a silent one is how two design systems end up in
 * one app). The second is guarded by the override returning the theme *itself*
 * when there is nothing to change, so a re-render can never silently clone or
 * re-tint a palette. The third is guarded by the provider writing
 * `@gpuixui/tokens/react`'s context — the one `@gpuixui/components` reads — so
 * a tree that mixes the two packages wraps once and cannot paint two palettes.
 *
 * `node:fs` is a test-time repository read, the same boundary
 * `core/theme.test.ts` uses to hold the package's other single-source rules: a
 * one-shot read of the package's own source at test time, never runtime domain
 * code.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";
import { ThemeProvider as TokensThemeProvider } from "@gpuixui/tokens/react";
import type { Density } from "../core/theme.js";
import { testTheme } from "../core/testing/theme.fixture.js";
import { MissingThemeProviderError, ThemeProvider } from "./ThemeProvider.js";
import { withDensity } from "./internal.js";

const compact: Density = {
  name: "compact",
  controlHeight: { sm: 24, md: 28, lg: 32 },
  controlPaddingX: { sm: 6, md: 8, lg: 10 },
  rowHeight: 28,
};

/** The package's `src/` directory: this file lives one level below it. */
const sourceRoot = fileURLToPath(new URL("../", import.meta.url));

const isSource = (name: string): boolean =>
  (name.endsWith(".ts") || name.endsWith(".tsx")) &&
  !name.endsWith(".test.ts") &&
  !name.endsWith(".test.tsx");

/**
 * A context that carries a theme.
 *
 * The package's other contexts carry a *part* (a slider's thumb, a checkbox's
 * indicator); only a theme-typed one is the second context this change removed.
 */
const THEME_CONTEXT =
  /createContext\s*<\s*(PrimitiveTheme|Theme)\b|ThemeContext\s*=/;

const walk = (dir: string): ReadonlyArray<string> =>
  Arr.flatMap(readdirSync(dir, { withFileTypes: true }), (entry) =>
    entry.isDirectory()
      ? walk(join(dir, entry.name))
      : isSource(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );

/** One prop of an element, read as unknown — React types an element's props loosely. */
const prop = (element: ReactElement, name: string): unknown =>
  Option.getOrElse(
    Option.flatMap(
      Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown))(
        element.props,
      ),
      (record) => R.get(record, name),
    ),
    () => undefined,
  );

/** The density group the provider hands to the shared context. */
const densityOf = (element: ReactElement): unknown =>
  Option.getOrElse(
    Option.flatMap(
      Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown))(
        prop(element, "theme"),
      ),
      (theme) => R.get(theme, "density"),
    ),
    () => undefined,
  );

describe("withDensity", () => {
  it("hands the theme through untouched when there is no override", () => {
    expect(withDensity(testTheme, undefined)).toBe(testTheme);
  });

  it("replaces only the density group, so the palette is shared not copied", () => {
    const dense = withDensity(testTheme, compact);
    expect(dense.density).toBe(compact);
    expect(dense.colors).toBe(testTheme.colors);
    expect(dense.typography).toBe(testTheme.typography);
  });
});

describe("a primitive without a provider", () => {
  it("fails with an error that names the provider to add", () => {
    const error = new MissingThemeProviderError();
    expect(error.name).toBe("MissingThemeProviderError");
    expect(error.message).toContain("<ThemeProvider>");
  });
});

describe("the provider writes the shared token context", () => {
  it("is the token package's own provider, so a mixed tree finds one theme", () => {
    // The bug: a package-local provider is a second context, so a page mixing
    // `@gpuixui/primitives` with `@gpuixui/components` had to wrap twice and
    // the two palettes could disagree.
    const element = ThemeProvider({ theme: testTheme, children: null });
    expect(element.type).toBe(TokensThemeProvider);
    expect(prop(element, "theme")).toBe(testTheme);
  });

  it("carries the density override into the shared context", () => {
    const element = ThemeProvider({
      theme: testTheme,
      density: compact,
      children: null,
    });
    expect(densityOf(element)).toBe(compact);
  });

  it("declares no theme context of its own", () => {
    // The package's other contexts carry a *part* (a slider's thumb, a
    // checkbox's indicator); only a theme-typed one is the second context this
    // change removed, so the scan looks for that and nothing else.
    const sources = walk(sourceRoot);
    // The walk must reach the provider itself, or the scan proves nothing.
    expect(
      Arr.some(sources, (path) => path.endsWith("ThemeProvider.tsx")),
    ).toBe(true);
    const themeContexts = Arr.filter(sources, (path) =>
      THEME_CONTEXT.test(readFileSync(path, "utf8")),
    );
    expect(themeContexts).toEqual([]);
  });

  it("asks the token package whether a provider is above it", () => {
    // The bug: the seam kept its own presence marker, so a tree wrapped only in
    // `@gpuixui/tokens/react`'s provider — the one `@gpuixui/components` uses —
    // made every primitive throw. `useThemePresence` answers the same question
    // from the context both packages write, so either provider satisfies the
    // fail-loud rule.
    const provider = Option.getOrElse(
      Arr.findFirst(walk(sourceRoot), (path) =>
        path.endsWith("ThemeProvider.tsx"),
      ),
      () => "",
    );
    const source = readFileSync(provider, "utf8");

    expect(source).toContain("useThemePresence()");
    expect(source).not.toContain("createContext");
  });
});
