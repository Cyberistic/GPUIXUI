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

const sourceRoot = fileURLToPath(new URL("../", import.meta.url));

const isSource = (name: string): boolean =>
  (name.endsWith(".ts") || name.endsWith(".tsx")) &&
  !name.endsWith(".test.ts") &&
  !name.endsWith(".test.tsx");

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

  it("reads a stored override that was never carried as no override", () => {
    const stored: Density | null = null;
    expect(withDensity(testTheme, stored)).toBe(testTheme);
    const element = ThemeProvider({
      theme: testTheme,
      density: stored,
      children: null,
    });
    expect(densityOf(element)).toBe(testTheme.density);
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
    const sources = walk(sourceRoot);

    expect(
      Arr.some(sources, (path) => path.endsWith("ThemeProvider.tsx")),
    ).toBe(true);
    const themeContexts = Arr.filter(sources, (path) =>
      THEME_CONTEXT.test(readFileSync(path, "utf8")),
    );
    expect(themeContexts).toEqual([]);
  });

  it("asks the token package whether a provider is above it", () => {
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
