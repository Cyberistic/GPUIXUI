/**
 * Guards the surface claims of the `placeholder` role. Plan `317` measured the
 * hint on the four `Surface` tones, plan `527` on the four row washes, plan
 * `651` added the pressed `selectedActive` fill and plan `659` the four soft
 * status fills a field inside a status panel paints, so the contract holds it
 * on fourteen surfaces (`placeholder-surfaces.test.ts` pins every pair). The
 * public `ThemeColors.placeholder` JSDoc and the catalogue role tables did not
 * follow: the type still named nine surfaces — the `input` fill, the four
 * `Surface` tones and the four row washes — and the high-contrast table row said
 * only "placeholder text", so a consumer reading the type or the AAA table was
 * told a copied theme is held to a narrower contract than `themeFailures`
 * enforces. This is plan `747`'s defect for the hint role.
 *
 * The cases derive the surface list from `contrastPairs` rather than retyping
 * it, so a fifteenth surface fails here until the prose names it, and anchor on
 * the JSDoc block and the `| `placeholder` |` rows instead of searching the
 * documents, because both documents legitimately mention the hint in their
 * change history.
 *
 * `node:fs` is deliberate, as in the other tree-local documentation guards.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastPairs } from "./index.js";

const source = readFileSync(new URL("./color.ts", import.meta.url), "utf8");
const catalogueSource = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);

const collapse = (text: string): string => text.replace(/\s+/g, " ");

const catalogue = collapse(catalogueSource);

/** The JSDoc block directly above a module-level declaration, collapsed. */
const docBlockAbove = (declaration: string): string => {
  const at = source.indexOf(declaration);
  expect(at, declaration).toBeGreaterThan(-1);
  const start = source.lastIndexOf("/**", at);
  return collapse(
    source
      .slice(start, source.indexOf("*/", start))
      .replace(/^[ \t]*\*[ \t]?/gm, ""),
  );
};

/** Every role-table row for the `placeholder` role. */
const roleRows = catalogueSource
  .split("\n")
  .filter((line) => line.startsWith("| `placeholder` |"));

/** The surfaces the contract measures the hint on, from the pair list. */
const surfaces = contrastPairs
  .filter(([foreground]) => foreground === "placeholder")
  .map(([, background]) => background);

describe("the placeholder role's surface claims", () => {
  it("measures the hint on fourteen distinct surfaces", () => {
    expect(surfaces).toHaveLength(14);
    expect(new Set(surfaces).size).toBe(surfaces.length);
    expect(
      contrastPairs
        .filter(([foreground]) => foreground === "placeholder")
        .map(([, , pairClass]) => pairClass),
    ).toEqual(surfaces.map(() => "secondary"));
  });

  it("has the public role name every surface", () => {
    const block = docBlockAbove("readonly placeholder: string;");

    expect(block).toContain("softFieldPairs");
    expect(block).toContain("fourteen");
    surfaces.forEach((surface) => {
      expect(block, surface).toContain(`\`${surface}\``);
    });
  });

  it("describes the measured hint in both catalogue role rows", () => {
    expect(roleRows).toHaveLength(2);
    roleRows.forEach((row) => {
      expect(row).toContain("softFieldPairs");
      surfaces.forEach((surface) => {
        expect(row, surface).toContain(`\`${surface}\``);
      });
      expect(row).not.toContain("| placeholder text |");
    });
  });

  it("keeps the catalogue's fourteen-surface narrative", () => {
    expect(catalogue).toContain(
      "The placeholder is held to the same secondary floor on that same fourteen-surface list",
    );
  });
});
