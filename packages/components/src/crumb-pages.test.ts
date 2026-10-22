/**
 * The trail page's paint claim, held to the source and the compiler.
 *
 * `docs/breadcrumb.mdx` once called its 12/16 type "the `caption` type role",
 * while the recipe reads `text-xs`, which `@gpuixui/tw` compiles against its
 * **fixed** shadcn scale: the theme's `caption` role never reaches it (the same
 * class as the Carousel page's `radius.lg` claim).
 *
 * `node:fs` is a test-time repository read, the boundary `card-page.test.ts` and
 * `carousel-page.test.ts` already use.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { extendTheme } from "@gpuixui/tokens";
import { BREADCRUMB_LINK, classesToStyle } from "@gpuixui/tw";
import { describe, expect, it } from "vitest";
import { lightTheme } from "./internal/theme.js";

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const breadcrumbPage = read("../docs/breadcrumb.mdx");

/** One page section, without the heading that follows it. */
const section = (page: string, heading: string): string => {
  const start = page.indexOf(`\n${heading}\n`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = page.slice(start + heading.length + 1);
  const end = rest.indexOf("\n## ");
  return (end < 0 ? rest : rest.slice(0, end)).replace(/\s+/g, " ");
};

/** A brand that restyles the `caption` role the page used to name. */
const themeWithCaption = extendTheme(lightTheme, {
  typography: { caption: { fontSize: 24 } },
});

describe("the Breadcrumb page", () => {
  it("keeps the trail on the same fixed type step", () => {
    const style = classesToStyle(BREADCRUMB_LINK, lightTheme).style;
    expect(style.fontSize).toBe(12);
    expect(style.lineHeight).toBe(16);
    expect(
      classesToStyle(BREADCRUMB_LINK, themeWithCaption).style.fontSize,
    ).toBe(12);

    const text = section(breadcrumbPage, "## Theming");
    expect(text).toContain("fixed 12/16");
    expect(text).toContain("`text-xs`");
    expect(text).not.toContain("`caption` type role");
  });
});
