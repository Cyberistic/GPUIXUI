import {
  colorRoles,
  darkTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
} from "@gpuixui/tokens";
import * as Arr from "effect/Array";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContrastColors } from "./contrast-colors";

/**
 * Guards the high-contrast colour catalogue (plan 586). The Theming page
 * documented the two high-contrast themes in prose only, so a reader who needs
 * the accessible palette could not see its values, and a value pasted from one
 * of those themes found no role at all.
 *
 * The failures worth catching are silent: the table drops a role, it renders
 * the default palettes under high-contrast headings, or the page loses the
 * block. Every expectation is derived from `@gpuixui/tokens`, so a palette edit
 * cannot make the page document a value the package does not ship.
 */
const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const theming = readFileSync(
  join(appRoot, "content", "docs", "theming.mdx"),
  "utf8",
);

/** The body under one `## ` heading, up to the next heading. */
const sectionBody = (document: string, name: string): string => {
  const start = document.indexOf(`## ${name}`);
  if (start < 0) return "";
  const rest = document.slice(start + name.length + 3);
  const next = rest.search(/^## /m);
  return next < 0 ? rest : rest.slice(0, next);
};

const html = renderToStaticMarkup(<ContrastColors />);

describe("high-contrast colour table", () => {
  it("renders one row per exported role", () => {
    expect([...html.matchAll(/data-role="/g)]).toHaveLength(colorRoles.length);
    Arr.forEach(colorRoles, (role) => {
      expect(html).toContain(`data-role="${role}"`);
    });
  });

  it("renders both high-contrast themes' real values for every role", () => {
    Arr.forEach(colorRoles, (role) => {
      expect(html).toContain(highContrastLightTheme.colors[role]);
      expect(html).toContain(highContrastDarkTheme.colors[role]);
    });
    expect(html).toContain("High-contrast light");
    expect(html).toContain("High-contrast dark");
  });

  it("is not the default palette under high-contrast headings", () => {
    const defaults = new Set([
      ...Object.values(lightTheme.colors),
      ...Object.values(darkTheme.colors),
    ]);
    const highOnly = Arr.flatMap(colorRoles, (role) => [
      highContrastLightTheme.colors[role],
      highContrastDarkTheme.colors[role],
    ]).filter((value) => !defaults.has(value));

    expect(highOnly.length).toBeGreaterThan(0);
    Arr.forEach(highOnly, (value) => {
      expect(html).toContain(value);
    });
  });

  it("is mounted on the Theming page under High contrast", () => {
    expect(sectionBody(theming, "High contrast")).toContain(
      "<ContrastColors />",
    );
  });
});
