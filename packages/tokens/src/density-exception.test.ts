/**
 * Guards the one density claim the two design documents make about consumers.
 *
 * The bug: both pages promised that a density preset moves every control —
 * "Density changes control height, horizontal padding and row height only" and
 * "Components read `controlHeight(theme, size)` … instead of hardcoding
 * numbers" — while the shipped `primitives` field family is one 36 px box and
 * its `Button` is 32 / 36 / 40 at every preset (`primitives` plans `370` and
 * `372`). Nothing read either paragraph, so a compact theme could paint a 36 px
 * field beside a 24–32 px `Toggle` while the design system said otherwise. The
 * exception paragraph is the fix; this suite holds it to the preset arithmetic
 * it cites and fails if the unconditional claim returns.
 *
 * `node:fs` is deliberate, the same way `docs.test.ts` and `docs-links.test.ts`
 * state: this is a documentation test over the tree's own files and the package
 * ships no runtime dependency.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { controlSizes, densityNames, densityPresets } from "./scale.js";

const root = new URL("../../../", import.meta.url);

/** The density section of a document, or `""` when the heading is gone. */
const densitySection = (document: string, heading: string): string => {
  const source = readFileSync(new URL(document, root), "utf8");
  const start = source.indexOf(heading);
  if (start < 0) return "";
  const rest = source.slice(start + heading.length);
  const end = rest.search(/^## /m);
  return end < 0 ? rest : rest.slice(0, end);
};

const documents = ["docs/tokens.md", "docs/design-system.md"] as const;

/** The section of each document this suite holds. */
const sections: Readonly<Record<(typeof documents)[number], string>> = {
  "docs/tokens.md": densitySection("docs/tokens.md", "## Density"),
  "docs/design-system.md": densitySection(
    "docs/design-system.md",
    "## 6. Spacing and density",
  ),
};

const normalize = (text: string): string => text.replace(/\s+/g, " ");

/** The prose of a section with paragraphs collapsed to one line. */
const proseOf = (document: (typeof documents)[number]): string =>
  normalize(sections[document]);

/**
 * The shipped `primitives` heights, an external consumer fact rather than a
 * token value: `INPUT_BASE` is `h-9`, `BUTTON_SIZES` is `h-8`/`h-9`/`h-10`.
 */
const pinnedFieldHeight = 36;
const pinnedButtonHeights = [32, 36, 40] as const;

const ladder = (preset: (typeof densityNames)[number]): ReadonlyArray<number> =>
  controlSizes.map((size) => densityPresets[preset].controlHeight[size]);

describe("the density consumer exception", () => {
  it("states the exception in both documents", () => {
    for (const document of documents) {
      const prose = proseOf(document);
      expect(prose, `${document} has a density section`).not.toBe("");
      expect(prose, `${document} names the package`).toContain("primitives");
      expect(prose, `${document} names the field family`).toMatch(
        /field family/i,
      );
      expect(prose, `${document} states the field height`).toContain(
        `${pinnedFieldHeight} px`,
      );
      expect(prose, `${document} states the Button heights`).toContain(
        pinnedButtonHeights.join(" / "),
      );
      expect(prose, `${document} names the preset the heights match`).toMatch(
        /spacious.{0,40}steps/,
      );
    }
  });

  it("quotes the preset the package actually ships", () => {
    expect(ladder("spacious")).toEqual([...pinnedButtonHeights]);
    expect(densityPresets.spacious.controlHeight.md).toBe(pinnedFieldHeight);
  });

  it("keeps the claim meaningful in the other presets", () => {
    for (const preset of densityNames) {
      if (preset === "spacious") continue;
      expect(ladder(preset), `${preset} is not the pinned ladder`).not.toEqual([
        ...pinnedButtonHeights,
      ]);
      expect(
        densityPresets[preset].controlHeight.md,
        `${preset} does not already paint the field height`,
      ).not.toBe(pinnedFieldHeight);
    }
  });

  it("names what still follows the preset", () => {
    for (const document of documents) {
      const prose = proseOf(document);
      expect(prose, `${document} names Toggle`).toContain("Toggle");
      expect(prose, `${document} names ToggleGroup`).toContain("ToggleGroup");
      expect(prose, `${document} names the option row's metric`).toContain(
        "controlHeight.sm",
      );
    }
  });

  it("no longer promises that every control moves", () => {
    const retired = [
      "Density changes control height, horizontal padding and row height only",
      "instead of hardcoding numbers",
    ];
    for (const document of documents) {
      for (const claim of retired) {
        expect(
          proseOf(document),
          `${document} still says "${claim}"`,
        ).not.toContain(claim);
      }
    }
  });

  it("keeps the three preset rows beside the exception", () => {
    for (const document of documents) {
      const prose = proseOf(document);
      for (const preset of densityNames) {
        expect(prose, `${document} keeps ${preset}`).toContain(preset);
      }
    }
  });
});
