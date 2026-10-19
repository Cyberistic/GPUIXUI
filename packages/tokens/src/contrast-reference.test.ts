/**
 * Guards the defect plan 391 fixes: the published JSDoc for
 * `themeContrastFailures` restated the contract's surfaces and families instead
 * of naming its lists, so it still said "the nine surfaces a disabled control
 * paints" after plan 307 grew `inactiveSurfaces` to thirteen, and named three
 * filled families after plan 382 derived the inverse veil from
 * `filledControlFamilies` and added `accent`. `snippets.test.ts` reads the
 * `@example` fences and `docs.test.ts` the Markdown pages, so nothing read this
 * prose while it shipped to the API reference.
 *
 * Each case fails on the pre-fix paragraph: it names only one of the lists,
 * lists no family index and repeats a count. Plan 504 moved the inverse veil's
 * index from `filledControlFamilies` to `selectionFillRoles`, which also owns the
 * solid status chips and `softAction`; the guard names whichever index the
 * paragraph uses. `node:fs` is deliberate, as in the other tree-local
 * documentation guards.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./contrast.ts", import.meta.url), "utf8");

const functionAt = source.indexOf("export function themeContrastFailures");
const blockStart = source.lastIndexOf("/**", functionAt);
const block = source.slice(
  blockStart + "/**".length,
  source.indexOf("*/", blockStart),
);

/** The prose before the executable example, whitespace-normalised. */
const prose = block
  .slice(0, block.indexOf("@example"))
  .replace(/^[ \t]*\*[ \t]?/gm, "")
  .replace(/\s+/g, " ")
  .trim();

const appliedLists = [
  "contrastPairs",
  "selectionPairs",
  "selectionStatusPairs",
  "selectionInactivePairs",
  "selectionWashPairs",
  "selectionSoftPairs",
  "selectionSoftWashPairs",
  "selectionInputPairs",
  "selectionFillPairs",
  "selectionFillInactivePairs",
  "selectionFillWashPairs",
  "selectionLinkPairs",
  "skeletonPulsePairs",
  "overlayWashPairs",
  "dialogSurfacePairs",
  "elevationSurfaces",
] as const;

describe("the themeContrastFailures reference", () => {
  it("finds the published block", () => {
    expect(blockStart).toBeGreaterThan(-1);
    expect(prose.startsWith("Every documented pair a theme misses.")).toBe(
      true,
    );
  });

  it("names every list the function applies", () => {
    appliedLists.forEach((list) => {
      expect(prose, list).toContain(`\`${list}\``);
    });
  });

  it("names the fill index instead of the families", () => {
    expect(prose).toContain("`selectionFillRoles`");
    expect(prose).not.toContain("`primary`, `secondary` and `destructive`");
  });

  it("states no drifting surface or family count", () => {
    const counts =
      /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen)\b[^.]*\b(surfaces?|families|pairs)\b/i;
    expect(prose).not.toMatch(counts);
  });
});
