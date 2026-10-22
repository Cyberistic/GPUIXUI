/**
 * The two composite fields' pages, held to the paint and the rule they teach.
 *
 * The bugs these guard: `docs/search-input.mdx` said the field painted
 * `radius.md` and `spacing.md`, while `SEARCH_INPUT` compiles the default
 * registry's fixed 6px radius and 8px padding (only the height follows density,
 * so a platform style never rounds the field); and both field pages said a
 * disabled field simply dims, while `readOnly` still receives keys — Escape
 * cleared a disabled search field and Enter committed the draft a caller had
 * disabled mid-edit. The pages now state the fixed metrics and the inert rule,
 * and this suite reads the compiled recipe, the tokens and the sources so a
 * sentence cannot outlive them.
 *
 * `node:fs` is a test-time repository read, the boundary `card-page.test.ts` and
 * `docs-counts.test.ts` already use.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { iconSize, platformTheme, targetSize } from "@gpuixui/tokens";
import { SEARCH_INPUT, SEARCH_INPUT_CLEAR, TAG_INPUT_ROOT } from "@gpuixui/tw";
import { describe, expect, it } from "vitest";
import { recipeStyle } from "./internal/recipe.js";
import { lightTheme } from "./internal/theme.js";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const page = (name: string): string => read(`../docs/${name}.mdx`);

/** A page's words with its line wrapping removed, for a phrase check. */
const flat = (source: string): string => source.replace(/\s+/g, " ");

/** One page section, without the heading that follows it. */
const section = (source: string, heading: string): string => {
  const start = source.indexOf(`\n${heading}\n`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = source.slice(start + heading.length + 1);
  const end = rest.indexOf("\n## ");
  return end < 0 ? rest : rest.slice(0, end);
};

describe("the composite fields' pages", () => {
  it("teach the search field's fixed metrics, not theme tokens", () => {
    const field = recipeStyle(SEARCH_INPUT, lightTheme);
    const clear = recipeStyle(SEARCH_INPUT_CLEAR, lightTheme);

    expect(field.borderRadius).toBe(6);
    expect(field.paddingLeft).toBe(8);
    expect(field.paddingRight).toBe(8);
    expect(clear.borderRadius).toBe(4);

    // The premise: a platform style ships its own `md`, so a page naming the
    // token would teach a Windows field rounded to 4px — which it never is.
    expect(platformTheme(lightTheme, "win32").radius.md).not.toBe(
      field.borderRadius,
    );
    // The `sm` glyph the clear control paints, and the target around it.
    expect(iconSize.sm).toBe(14);
    expect(targetSize.minimum).toBe(24);

    const theming = flat(section(page("search-input"), "## Theming"));
    expect(theming).toContain("6px radius");
    expect(theming).toContain("8px");
    expect(theming).toContain("ADR 0006");
    expect(theming).toContain("14px");
    expect(theming).toContain("24px");
    expect(theming).not.toContain("radius.md");
    expect(theming).not.toContain("spacing.md");
    expect(theming).not.toContain("glyph inside is 16px");
  });

  it("teach the tag group's fixed metrics and its chip radius", () => {
    const group = recipeStyle(TAG_INPUT_ROOT, lightTheme);

    expect(group.borderRadius).toBe(6);
    expect(group.paddingLeft).toBe(6);
    expect(group.paddingTop).toBe(2);

    const theming = flat(section(page("tag-input"), "## Theming"));
    expect(theming).toContain("6px radius");
    expect(theming).toContain("6px / 2px");
    expect(theming).toContain("14px");
    // The field declares the keyboard outline, never the unconditional shadow.
    expect(theming).not.toContain("focusRing");
    expect(theming).not.toContain("radius.md");
  });

  it("state the disabled rule both sources implement", () => {
    const search = read("../src/search-input.tsx");
    // The guard comes before the value check, so Escape cannot clear.
    expect(search).toContain("if (disabled) return;");
    expect(search).toContain("tabIndex={disabled ? -1 : 0}");
    expect(search).toContain('cursor: disabled ? "not-allowed" : "pointer"');
    expect(search).toContain("hover: disabled");

    const tags = read("../src/tag-input.tsx");
    // Commit, comma-typing and removal are the three entry points into the
    // caller's list, so all three refuse while the group is disabled.
    expect(tags.match(/if \(disabled\) return;/g)).toHaveLength(3);
    expect(tags).toContain("tabIndex={disabled ? -1 : 0}");

    const searchPage = flat(page("search-input"));
    expect(searchPage).toContain("## Disabled");
    expect(searchPage).toContain("out of the tab order");
    expect(searchPage).toContain("`Escape` does nothing");
    expect(searchPage).toContain("not-allowed");

    const tagPage = flat(page("tag-input"));
    expect(tagPage).toContain("tabIndex: -1");
    expect(tagPage).toContain("leave the tab order");
    expect(tagPage).toContain("cannot commit the draft");
  });
});
