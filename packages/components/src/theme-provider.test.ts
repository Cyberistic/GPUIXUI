import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as components from "./index.js";
import * as tokens from "@gpuixui/tokens";
import * as tokensReact from "@gpuixui/tokens/react";

const readme = (): string =>
  readFileSync(fileURLToPath(new URL("../README.md", import.meta.url)), "utf8");

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

    expect(theming).toContain(
      'import { Card, ThemeProvider, darkTheme } from "@gpuixui/components";',
    );
    expect(theming).toContain("<ThemeProvider theme={darkTheme}>");

    expect(theming).toContain("</ThemeProvider>");
  });

  it("says what happens without a provider, and whose provider it is", () => {
    const theming = section("Theming");

    expect(theming).toContain("light theme");
    expect(theming).toContain("@gpuixui/tokens/react");
    expect(theming).toContain("createTheme");
  });
});
