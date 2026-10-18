import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The bug guarded: `/docs/getting-started` rendered raw GPUix and never imported
 * the library, so a reader finished onboarding without mounting a provider or a
 * component; `/docs/installation` omitted `@gpuixui/tokens`, whose React
 * provider is the only public theme entry for `@gpuixui/components`; and no page
 * explained that primitives **throw** without a provider while components fall
 * back to the light theme. That inversion is exactly what plan `457` §9 measured
 * as light components on a dark page.
 *
 * `readFileSync` is deliberate: `apps/docs` has no Effect runtime and its
 * bundle must not import `effect`; every docs content guard reads repository
 * files the same way (`docs-checks.test.ts`, `content-references.test.ts`).
 */

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = join(appRoot, "..", "..");
const contentRoot = join(appRoot, "content", "docs");

const page = (name: string): string =>
  readFileSync(join(contentRoot, name), "utf8");
const source = (path: string): string =>
  readFileSync(join(repoRoot, path), "utf8");

const gettingStarted = page("getting-started.mdx");
const installation = page("installation.mdx");
const theming = page("theming.mdx");

const primitivesProvider = source(
  "packages/primitives/src/components/ThemeProvider.tsx",
);
const tokensProvider = source("packages/tokens/src/react.ts");
const componentsTheme = source("packages/components/src/internal/theme.ts");
const componentsIndex = source("packages/components/src/index.ts");
const liveSurface = source("apps/docs/preview/main.tsx");

/** The body under one `## ` heading, up to the next heading. */
const sectionBody = (document: string, name: string): string => {
  const start = document.indexOf(`## ${name}`);
  if (start < 0) return "";
  const rest = document.slice(start + name.length + 3);
  const next = rest.search(/^## /m);
  return next < 0 ? rest : rest.slice(0, next);
};

/**
 * The nesting claim: tokens outside primitives. It is checked inside a fenced
 * code block, because the prose above the snippet also names `<ThemeProvider>`
 * inline. Comparing the first occurrence of each tag catches a snippet that
 * mounts them the other way round, and the closing tags catch a snippet that
 * opens both but closes one too early.
 */
const codeBlocks = (document: string): ReadonlyArray<string> => {
  const parts = document.split("```");
  return parts.length === 1
    ? [document]
    : parts.filter((_, index) => index % 2 === 1);
};

const nestsTokensOutsidePrimitives = (document: string): boolean =>
  codeBlocks(document).some((block) => {
    const openTokens = block.indexOf("<TokensThemeProvider");
    const openPrimitives = block.indexOf("<ThemeProvider");
    const closePrimitives = block.indexOf("</ThemeProvider>");
    const closeTokens = block.indexOf("</TokensThemeProvider>");
    return (
      openTokens >= 0 &&
      openPrimitives > openTokens &&
      closePrimitives > openPrimitives &&
      closeTokens > closePrimitives
    );
  });

describe("the documented install reaches the provider", () => {
  it("declares @gpuixui/tokens in the intended nub add line", () => {
    expect(installation).toContain(
      "nub add @gpuixui/tokens @gpuixui/primitives @gpuixui/components",
    );
  });

  it("names the provider entry point a consumer imports", () => {
    expect(installation).toContain("@gpuixui/tokens/react");
  });
});

describe("getting started is a library app", () => {
  it("imports the library and a theme value", () => {
    expect(gettingStarted).toContain("@gpuixui/primitives");
    expect(gettingStarted).toContain("@gpuixui/tokens");
    expect(gettingStarted).toContain("<Button");
    expect(gettingStarted).toContain("<ThemeProvider");
  });

  it("nests the token provider outside the primitives provider", () => {
    const body = sectionBody(gettingStarted, "Providers");
    expect(body).toContain("@gpuixui/tokens/react");
    expect(body).toContain("@gpuixui/primitives");
    expect(body).toContain("import {");
    expect(nestsTokensOutsidePrimitives(body)).toBe(true);
  });
});

describe("the pages match the shipped contexts", () => {
  it("primitives still throw without a provider", () => {
    expect(primitivesProvider).toContain("MissingThemeProviderError");
    expect(primitivesProvider).toContain(
      "throw new MissingThemeProviderError()",
    );
  });

  it("the token context still defaults to the light theme", () => {
    expect(tokensProvider).toContain("createContext<Theme>(lightTheme)");
    expect(tokensProvider).toContain("useContext(ThemeContext)");
  });

  it("components read the token provider, not a provider of their own", () => {
    expect(componentsTheme).toContain("ThemeProvider, useTheme");
    expect(componentsTheme).toContain("@gpuixui/tokens/react");
    expect(componentsIndex).not.toContain("ThemeProvider");
  });

  it("the live surface and the prose nest the same two providers", () => {
    expect(nestsTokensOutsidePrimitives(liveSurface)).toBe(true);
  });

  it("theming names both provider packages and the first-app page", () => {
    expect(theming).toContain("@gpuixui/tokens/react");
    expect(theming).toContain("@gpuixui/primitives");
    expect(theming).toContain("/docs/getting-started");
  });
});

describe("the inverted claim cannot ship", () => {
  it("no sentence says primitives fall back to a default theme", () => {
    const inverted = [
      { page: "getting-started", text: gettingStarted },
      { page: "installation", text: installation },
      { page: "theming", text: theming },
    ].flatMap(({ page: name, text }) =>
      text
        .replace(/\s+/g, " ")
        .split(/(?<=[.;:])\s+/)
        .filter((sentence) => sentence.toLowerCase().includes("primitives"))
        .filter((sentence) => {
          const lower = sentence.toLowerCase();
          return (
            lower.includes("fall back") ||
            lower.includes("falls back") ||
            lower.includes("fallback")
          );
        })
        .map((sentence) => `${name}: ${sentence}`),
    );
    expect(inverted).toEqual([]);
  });
});
