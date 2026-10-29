import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `/accessibility` published the ARIA budget and stopped there. Two
 * accessibility facts the library measures had no page on the site: the
 * **pressable-target floors** (`targetSize`, `targetInset`) that a control
 * smaller than its hit box reserves, and the **keyboard dim** the runtime
 * applies to every other focusable element (`keyboardFocusDimOpacity`) together
 * with the `keyboardFocusDim: false` opt-out a filled action and a field
 * declare.
 *
 * This guard holds the two new sections to the package: the floors and the
 * worked inset are interpolated rather than printed, so a token edit cannot
 * leave the page teaching an old number; every cited proof must exist and read
 * the floor it claims to measure; and the dim's share, floor and opt-out must
 * be the ones the source declares in both packages.
 *
 * The reads are synchronous because this is a test boundary, like the rest of
 * the site's Markdown guards.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const exists = (path: string): boolean => existsSync(new URL(path, root));

const page = read("apps/docs/content/docs/accessibility.mdx").replace(
  /\s+/g,
  " ",
);

const scale = read("packages/tokens/src/scale.ts");
const focusDim = read("packages/tokens/src/focus-dim.ts");
const decorative = read("packages/tokens/src/decorative.ts");
const primitivesFocus = read("packages/primitives/src/core/focus.ts");
const componentsTheme = read("packages/components/src/internal/theme.ts");
const primitivesButton = read("packages/primitives/src/components/Button.tsx");

/** The suites the page cites for the target adoption, and where each lives. */
const targetProofs: ReadonlyArray<readonly [name: string, path: string]> = [
  ["targets.test.tsx", "packages/components/src/behaviour/targets.test.tsx"],
  [
    "selection-targets.runtime.test.tsx",
    "packages/primitives/runtime/selection-targets.runtime.test.tsx",
  ],
  [
    "groups.runtime.test.tsx",
    "packages/primitives/runtime/groups.runtime.test.tsx",
  ],
  ["Rating.test.tsx", "packages/primitives/src/components/Rating.test.tsx"],
];

describe("the accessibility page's measured floors", () => {
  it("interpolates the target floors the package declares", () => {
    // Bug guarded: the page named neither token, so a reader learned the ARIA
    // budget and nothing about the box a pointer has to hit.
    const floors =
      /export const targetSize: TargetSize = \{ minimum: \d+, comfortable: \d+ \};/.exec(
        scale,
      );

    expect(floors).not.toBeNull();
    expect(scale).toContain("export function targetInset");
    expect(page).toContain("{targetSize.minimum}");
    expect(page).toContain("{targetSize.comfortable}");
    expect(page).toContain("`targetInset(visual, floor)`");
    expect(page).toContain("`targetSize.minimum`");
    expect(page).toContain("`targetSize.comfortable`");
  });

  it("teaches the rounding and the worked inset the function performs", () => {
    // A printed inset would drift from the scale the moment an icon step moved;
    // the worked example is the function's own answer.
    expect(scale).toContain("Math.ceil((floor - visual) / 2)");
    expect(page).toContain("rounded up");
    expect(page).toContain("touch rather than overlap");
    expect(page).toContain("{targetInset(iconSize.md)}");
    expect(page).toContain(
      "{targetInset(iconSize.md, targetSize.comfortable)}",
    );
  });

  it("cites only proofs that exist and read the floor", () => {
    // A page that cites a suite which does not measure the floor would send a
    // reader to evidence for a claim the file never makes.
    const missing = targetProofs.filter(
      ([name, path]) =>
        !page.includes(name) ||
        !exists(path) ||
        !read(path).includes("targetSize.minimum"),
    );

    expect(targetProofs.length).toBeGreaterThanOrEqual(4);
    expect(missing.map(([name]) => name)).toEqual([]);
  });

  it("prints the dim the runtime paints, and the floor it is held to", () => {
    expect(focusDim).toContain("export const keyboardFocusDimOpacity = 0.4;");
    expect(decorative).toContain("export const decorativeFloor = 1.05;");
    expect(page).toContain("{keyboardFocusDimOpacity * 100}");
    expect(page).toContain("`keyboardFocusDimOpacity`");
    expect(page).toContain("`keyboardDimFailures`");
    expect(page).toContain("{decorativeFloor}:1");
  });

  it("teaches the opt-out both packages declare, and where it stops", () => {
    // The opt-out is the difference between a filled action whose label stays
    // readable and a control that fades into its own fill.
    expect(primitivesFocus).toContain("{ keyboardFocusDim: false }");
    expect(componentsTheme).toContain("{ keyboardFocusDim: false }");
    expect(primitivesButton).toContain(
      "paintsFilledSurface(variant) ? mergeStyle(base, keepContent)",
    );
    expect(page).toContain("`keyboardFocusDim: false`");
    expect(page).toContain("`keepContent`");
    expect(page).toContain("filled actions");
    expect(page).toContain("`outline`");
    expect(page).toContain("`ghost`");
  });
});
