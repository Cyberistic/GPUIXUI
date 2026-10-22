/**
 * The Carousel page's paint claims, held to the recipe and the source it
 * documents.
 *
 * The bug these guard: `docs/carousel.mdx` said the track used "`card` with a
 * `border` edge and `radius.lg`". `radius.lg` is not what the track paints —
 * `CAROUSEL_TRACK` is `rounded-lg`, and the tw registry compiles that against
 * its **fixed** shadcn scale (8px), not the theme's `radius` group, which a
 * platform style moves (macOS `lg` is 10). The page also had to settle which
 * role the edge paints: the recipe reads `border-input`, which `@gpuixui/tw`
 * resolves to the **`border` role** — shadcn's `--input` names a border, while
 * this library's `input` role is the field fill, the card's own white in the
 * base light theme — so a page that read the class name literally would teach a
 * surface the renderer never paints.
 *
 * The control, the dot geometry and the suite's size are held for the same
 * reason: each is a number or a role a reader could follow to the wrong place.
 *
 * `node:fs` is a test-time repository read, the boundary `docs.test.ts` and
 * `card-page.test.ts` already use.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { platformTheme } from "@gpuixui/tokens";
import {
  CAROUSEL_TRACK,
  classesToStyle,
  cn,
} from "@gpuixui/tw";
import { describe, expect, it } from "vitest";
import { actionOnColor } from "./internal/button.js";
import { recipeStyle } from "./internal/recipe.js";
import { darkTheme, lightTheme, targetSize } from "./internal/theme.js";

const read = (path: string): string =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const page = read("../docs/carousel.mdx");
const source = read("./carousel.tsx");

/** One page section, without the heading that follows it. */
const section = (heading: string): string => {
  const start = page.indexOf(`\n${heading}\n`);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = page.slice(start + heading.length + 1);
  const end = rest.indexOf("\n## ");
  return end < 0 ? rest : rest.slice(0, end);
};

/** The compiled surface of the track recipe. */
const track = (theme = lightTheme) =>
  recipeStyle(cn(CAROUSEL_TRACK), theme);

/** The number a `const` in the carousel source is declared with. */
const constant = (name: string): number | undefined => {
  const at = source.indexOf(`const ${name} = `);
  if (at === -1) return undefined;
  const value = source.slice(at + `const ${name} = `.length);
  const digits = value.slice(0, value.search(/[^0-9]/));
  return digits === "" ? undefined : Number(digits);
};

describe("the Carousel page", () => {
  it("paints the track's edge in the border role the compiler resolves", () => {
    const style = track();

    // The premise: the two roles are different colours, and the compiler maps
    // the recipe's `border-input` to `border` — our `input` role is the field
    // fill, which is the card's own white.
    expect(lightTheme.colors.input).not.toBe(lightTheme.colors.border);
    expect(style.borderColor).toBe(lightTheme.colors.border);
    expect(style.borderWidth).toBe(lightTheme.borderWidth.thin);
    expect(style.backgroundColor).toBe(lightTheme.colors.card);
    // The guard on the guard: read the compiler's own mapping rather than this
    // package's cached seam, so a page cannot pass by naming a treatment the
    // registry stopped resolving.
    expect(
      classesToStyle("border border-input", lightTheme).style.borderColor,
    ).toBe(lightTheme.colors.border);

    const text = section("## Theming").replace(/\s+/g, " ");
    expect(text).toContain("border-input");
    expect(text).toContain("`border` role");
    expect(text).not.toContain("in the `input` role");
    expect(text).toContain("`card` fill");
  });

  it("keeps the track's corner on the fixed 8px step, not the theme's radius", () => {
    const mac = platformTheme(lightTheme, "darwin");

    // The premise: macOS moves `radius.lg` to 10, so a track that read the
    // theme's group would round differently on that platform.
    expect(mac.radius.lg).not.toBe(8);
    expect(track().borderRadius).toBe(8);
    expect(track(mac).borderRadius).toBe(8);
    expect(track(darkTheme).borderRadius).toBe(8);

    const text = section("## Theming").replace(/\s+/g, " ");
    expect(text).toContain("fixed 8px");
    expect(text).toContain("`rounded-lg`");
    expect(text).not.toContain("radius.lg");
  });

  it("paints the chevron in the control's own label role", () => {
    // The control is pinned to one variant, so its chevron and its fill are one
    // decision: `actionOnColor` answers the fill's on-colour for that variant.
    expect(source).toContain('const CONTROL_VARIANT = "secondary" as const;');
    expect(source).toContain(
      "color={actionOnColor(theme, CONTROL_VARIANT)}",
    );
    expect(actionOnColor(lightTheme, "secondary")).toBe(
      lightTheme.colors.secondaryForeground,
    );
    expect(actionOnColor(darkTheme, "secondary")).not.toBe(
      darkTheme.colors.primaryForeground,
    );

    const text = section("## Theming").replace(/\s+/g, " ");
    expect(text).toContain("`secondary` fill");
    expect(text).toContain("`secondaryForeground`");
    expect(text).toContain("never a role chosen for another fill");
  });

  it("quotes the dot geometry and the press floor the source builds", () => {
    const height = constant("DOT_HEIGHT");
    const rest = constant("DOT_REST_WIDTH");
    const active = constant("DOT_ACTIVE_WIDTH");

    expect(height).toBeDefined();
    expect(rest).toBe(height);
    expect(active).toBeDefined();
    expect(active ?? 0).toBeGreaterThan(rest ?? 0);
    expect(source).toContain("width: targetSize.minimum");

    const text = page.replace(/\s+/g, " ");
    expect(text).toContain(`${rest ?? 0}px drawing`);
    expect(text).toContain(
      `${targetSize.minimum} × ${targetSize.minimum} px`,
    );
    // The active dot is wider, not only a different hue.
    expect(text).toContain("wider pill");
  });

  it("prints the size of the suite that proves it", () => {
    const suite = "./behaviour/carousel.test.tsx";
    const cases = (read(suite).match(/\bit\(/g) ?? []).length;

    expect(cases).toBeGreaterThan(0);
    const printed = /\((\d+) tests\)/.exec(section("## Verification"))?.[1];
    expect(printed, "the page prints no suite size").toBe(String(cases));
  });
});
