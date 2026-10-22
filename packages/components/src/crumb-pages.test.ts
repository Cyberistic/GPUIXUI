/**
 * The trail and pager pages' paint claims, held to the source and the compiler.
 *
 * Two bugs of one class. `docs/pagination.mdx` said the page numbers other than
 * the current one "are ghost buttons with `colors.mutedForeground`", while
 * `PaginationItem` renders the package's local `Button` at `variant="ghost"` and
 * `actionOnColor` paints a ghost action's label `colors.foreground` — the muted
 * role is the ellipsis's. Both pages also called their 12/16 type "the `caption`
 * type role", while the recipe reads `text-xs`, which `@gpuixui/tw` compiles
 * against its **fixed** shadcn scale: the theme's `caption` role never reaches
 * them (the same class as the Carousel page's `radius.lg` claim).
 *
 * `node:fs` is a test-time repository read, the boundary `card-page.test.ts` and
 * `carousel-page.test.ts` already use.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { contrastFloors, contrastRatio, extendTheme } from "@gpuixui/tokens";
import { PAGINATION_ELLIPSIS, classesToStyle } from "@gpuixui/tw";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { actionOnColor } from "./internal/button.js";
import { darkTheme, lightTheme } from "./internal/theme.js";

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const paginationPage = read("../docs/pagination.mdx");
const paginationSource = read("./pagination.tsx");

/** One page section, without the heading that follows it. */
const section = (page: string, heading: string): string => {
  const start = page.indexOf(`\n${heading}\n`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = page.slice(start + heading.length + 1);
  const end = rest.indexOf("\n## ");
  return (end < 0 ? rest : rest.slice(0, end)).replace(/\s+/g, " ");
};

/** A brand that restyles the `caption` role the pages used to name. */
const themeWithCaption = extendTheme(lightTheme, {
  typography: { caption: { fontSize: 24 } },
});

describe("the Pagination page", () => {
  it("paints a page number's label in the role its variant carries", () => {
    // The premise: the ghost label and the muted role are different colours, so
    // a page that swapped them sends a reader to the wrong token.
    expect(paginationSource).toContain(
      'variant={isCurrent ? "primary" : "ghost"}',
    );
    expect(paginationSource).toContain("color={theme.colors.mutedForeground}");
    expect(actionOnColor(lightTheme, "ghost")).toBe(
      lightTheme.colors.foreground,
    );
    expect(actionOnColor(lightTheme, "ghost")).not.toBe(
      lightTheme.colors.mutedForeground,
    );

    // A page number is body text on the page it sits on.
    Arr.forEach([lightTheme, darkTheme], (theme) => {
      expect(actionOnColor(theme, "ghost")).toBe(theme.colors.foreground);
      expect(
        contrastRatio(theme.colors.foreground, theme.colors.background) ?? 0,
      ).toBeGreaterThanOrEqual(contrastFloors.body);
    });

    const text = section(paginationPage, "## Theming");
    expect(text).toContain("`colors.foreground`");
    expect(text).not.toContain("ghost buttons with `colors.mutedForeground`");
    // The muted role is still taught, for the one part that paints it.
    expect(text).toContain("`colors.mutedForeground`");
    expect(text).toContain("ellipsis");
  });

  it("keeps the ellipsis on the fixed type step, not the theme's caption role", () => {
    const style = classesToStyle(PAGINATION_ELLIPSIS, lightTheme).style;
    expect(style.fontSize).toBe(12);
    expect(style.lineHeight).toBe(16);

    // The premise: the theme's `caption` role moved and the ellipsis did not.
    expect(themeWithCaption.typography.caption.fontSize).toBe(24);
    expect(
      classesToStyle(PAGINATION_ELLIPSIS, themeWithCaption).style.fontSize,
    ).toBe(12);

    const text = section(paginationPage, "## Theming");
    expect(text).toContain("fixed 12/16");
    expect(text).toContain("`text-xs`");
    expect(text).not.toContain("caption type role");
  });
});
