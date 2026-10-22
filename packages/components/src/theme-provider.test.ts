/**
 * The theming surface a consumer has to have.
 *
 * The gap this guards: every component in this package reads its colours,
 * spacing, type and elevation from the token package's theme, but the package
 * published neither the provider nor a theme, and the README never said where
 * the theme comes from. An app whose manifest declares only
 * `@gpuixui/components` — the repo's isolated linker resolves a package's
 * dependencies for that package, not for its consumers — could therefore not
 * write `import … from "@gpuixui/tokens"`, and every component fell back to the
 * light theme with no documented way to reach the dark one.
 *
 * The fix publishes the provider and the two themes from the package root, so
 * one import themes the whole library, and the README says how. The provider
 * must stay the token package's own: a second copy would be two providers, and
 * the components would read one while the consumer's own tree read the other.
 *
 * `node:fs` is a test-time repository read, the standing exception
 * `inventory.test.ts` records (plan 110 §7).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as components from "./index.js";
import * as tokens from "@gpuixui/tokens";
import * as tokensReact from "@gpuixui/tokens/react";

const readme = (): string =>
  readFileSync(fileURLToPath(new URL("../README.md", import.meta.url)), "utf8");

/** The body under `## <heading>`, up to the next level-two heading. */
const section = (heading: string): string => {
  const read = readme();
  const start = read.indexOf(`## ${heading}\n`);

  if (start < 0) return "";

  const rest = read.slice(start + heading.length + 4);
  const end = rest.indexOf("\n## ");

  return end < 0 ? rest : rest.slice(0, end);
};

describe("the theming surface", () => {
  it("publishes the provider and the themes from the package root", () => {
    expect(components.ThemeProvider).toBeTypeOf("function");
    expect(components.useTheme).toBeTypeOf("function");
    expect(components.lightTheme).toBe(tokens.lightTheme);
    expect(components.darkTheme).toBe(tokens.darkTheme);
  });

  it("publishes the token package's own provider, not a copy", () => {
    expect(components.ThemeProvider).toBe(tokensReact.ThemeProvider);
    expect(components.useTheme).toBe(tokensReact.useTheme);
  });

  it("shows the consumer a copyable theme wrapper", () => {
    const theming = section("Theming");

    // The import is the one a consumer copies, from the manifest they have.
    expect(theming).toContain(
      'import { Card, ThemeProvider, darkTheme } from "@gpuixui/components";',
    );
    expect(theming).toContain("<ThemeProvider theme={darkTheme}>");
    // A wrapper with no closing tag is not a snippet a reader can run.
    expect(theming).toContain("</ThemeProvider>");
  });

  it("says what happens without a provider, and whose provider it is", () => {
    const theming = section("Theming");

    expect(theming).toContain("light theme");
    expect(theming).toContain("@gpuixui/tokens/react");
    expect(theming).toContain("createTheme");
  });
});
