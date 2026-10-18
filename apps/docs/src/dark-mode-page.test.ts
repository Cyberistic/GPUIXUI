import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards plan 514: `/docs/dark-mode` documents the application's real mode
 * switch. The bugs guarded: (1) the page could name a constructor the tokens
 * package no longer exports, so a reader's copy fails to compile; (2) the
 * contrast table is hand-written, so a fifth mode or a dropped contrast axis
 * could leave the page promising a call that does not exist; (3) the runtime
 * recipe could drop one of the two providers a mixed app needs — the inversion
 * plan 503 measured; (4) the page's "no OS appearance detection" claim could
 * outlive the day the package gains an appearance API, which would make the
 * page wrong rather than merely stale.
 *
 * `readFileSync` is deliberate: `apps/docs` has no Effect runtime and its
 * bundle must not import `effect`; every content guard here reads repository
 * files the same way (`provider-docs.test.ts`, `content-references.test.ts`).
 */

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = join(appRoot, "..", "..");
const contentRoot = join(appRoot, "content", "docs");

const page = (name: string): string =>
  readFileSync(join(contentRoot, name), "utf8");
const source = (path: string): string =>
  readFileSync(join(repoRoot, path), "utf8");

const darkMode = page("dark-mode.mdx");
const themeSource = source("packages/tokens/src/theme.ts");
const reactSource = source("packages/tokens/src/react.ts");
const platformsSource = source("packages/tokens/src/platforms.ts");

/** Fenced code blocks, paired by the split: index 0 is prose, 1 is a fence. */
const codeBlocks = (document: string): ReadonlyArray<string> => {
  const parts = document.split("```");
  return parts.length === 1
    ? [document]
    : parts.filter((_, index) => index % 2 === 1);
};

/** The string literals of an exported union, read from the package. */
const unionLiterals = (
  typescript: string,
  name: string,
): ReadonlyArray<string> => {
  const body =
    typescript.match(new RegExp(`export type ${name} = ([^;]+);`))?.[1] ?? "";
  return [...body.matchAll(/"([^"]+)"/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

/** Every `getTheme(...)` call in the page, with its literal string args. */
const themeCalls = (): ReadonlyArray<ReadonlyArray<string>> =>
  [...darkMode.matchAll(/getTheme\(([^)]*)\)/g)].flatMap((match) => {
    const args = (match[1] ?? "")
      .split(",")
      .map((argument) => argument.trim())
      .flatMap((argument) => {
        const literal = argument.match(/^"([^"]+)"$/)?.[1];
        return literal === undefined ? [] : [literal];
      });
    return args.length === 0 ? [] : [args];
  });

const modes = unionLiterals(themeSource, "ThemeMode");
const contrasts = unionLiterals(themeSource, "ThemeContrast");

describe("the dark-mode page", () => {
  it("sits beside Theming in the sidebar", () => {
    const meta = readFileSync(join(contentRoot, "meta.json"), "utf8");
    expect(meta).toMatch(/"theming",\s*"dark-mode",/);
    expect(darkMode).toMatch(/^---\ntitle: Dark mode\ndescription: .+\n---/);
  });

  it("names only constructors the token package exports", () => {
    expect(themeSource).toMatch(/export function getTheme\b/);
    expect(themeSource).toMatch(/export function platformTheme\b/);
    expect(reactSource).toMatch(/export function ThemeProvider\b/);
    const named = ["getTheme", "ThemeMode", "ThemeContrast", "platformTheme"];
    expect(
      named.filter((name) => !new RegExp(`\\b${name}\\b`).test(darkMode)),
    ).toEqual([]);
  });

  it("lists every built-in combination the package defines", () => {
    const built = modes.flatMap((mode) =>
      contrasts.map((contrast) => [mode, contrast] as const),
    );
    expect(built.length).toBeGreaterThanOrEqual(4);
    const missing = built.filter(([mode, contrast]) =>
      contrast === "default"
        ? !darkMode.includes(`getTheme("${mode}")`)
        : !darkMode.includes(`getTheme("${mode}", "${contrast}")`),
    );
    expect(missing).toEqual([]);
  });

  it("never calls getTheme outside the package's unions", () => {
    const calls = themeCalls();
    expect(calls.length).toBeGreaterThanOrEqual(4);
    const unknown = calls.filter(
      ([mode, contrast]) =>
        !modes.includes(mode ?? "") ||
        (contrast !== undefined && !contrasts.includes(contrast)),
    );
    expect(unknown).toEqual([]);
  });

  it("mounts both providers a mixed app needs", () => {
    const recipe = codeBlocks(darkMode).find((block) =>
      block.includes("@gpuixui/tokens/react"),
    );
    expect(recipe).toContain("@gpuixui/primitives");
    expect(recipe).toContain("<TokensThemeProvider");
    expect(recipe).toContain("<ThemeProvider");
  });

  it("keeps the no-appearance claim true of the package", () => {
    const appearanceExports = [
      themeSource,
      reactSource,
      platformsSource,
    ].flatMap((typescript) =>
      [...typescript.matchAll(/export (?:const|function) (\w+)/g)].flatMap(
        (match) => {
          const name = match[1] ?? "";
          return /appearance|prefers|systemTheme|colorScheme/i.test(name)
            ? [name]
            : [];
        },
      ),
    );
    const providerProps =
      reactSource.match(/interface ThemeProviderProps \{([\s\S]*?)\n\}/)?.[1] ??
      "";
    expect(appearanceExports).toEqual([]);
    expect(providerProps).not.toMatch(/\bmode\b/);
    expect(darkMode).toMatch(/application owns the mode/i);
  });
});
