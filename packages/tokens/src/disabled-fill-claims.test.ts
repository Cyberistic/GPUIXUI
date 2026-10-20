/**
 * Guards the three current-state passages plan `737` left behind when it made
 * the `disabled` fill a measured surface. `disabledFillPairs` holds the fill to
 * the 1.05:1 floor on the five surfaces a control is placed on, and the
 * catalogue, the design system's history section, the README and the
 * `disabledControl` JSDoc all say so — but the public `ThemeColors.disabled`
 * JSDoc, the design system's inactive-control rule and the catalogue's
 * high-contrast role row still stated the exemption plan `737` refuted: the fill
 * is "deliberately allowed to sit near the panel" because "no neutral clears
 * both a white card and the quiet panel". A consumer reading the type or the
 * design system was told the fill may equal its panel while `themeFailures`
 * rejects exactly that theme.
 *
 * The cases read the shipped sentences and derive the surface list from
 * `disabledFillPairs`, so restoring the old reason, dropping the owner or
 * narrowing the list fails here until the prose follows. They anchor on the
 * role rows, the JSDoc block and the inactive paragraph rather than searching
 * the whole file, because both documents legitimately quote the old reason
 * while refuting it.
 *
 * `node:fs` is deliberate, as in the other tree-local documentation guards.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { disabledFillPairs, stateFillSurfaces } from "./index.js";

const source = readFileSync(new URL("./color.ts", import.meta.url), "utf8");
const catalogueSource = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);
const designSystemSource = readFileSync(
  new URL("../../../docs/design-system.md", import.meta.url),
  "utf8",
);

const collapse = (text: string): string => text.replace(/\s+/g, " ");

const catalogue = collapse(catalogueSource);
const designSystem = collapse(designSystemSource);

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

/** Every role-table row for the `disabled` role. */
const roleRows = catalogueSource
  .split("\n")
  .filter((line) => line.startsWith("| `disabled` |"));

/** The surfaces the contract measures the fill on, from the pair list. */
const surfaces = disabledFillPairs.map(([, background]) => background);

describe("the disabled fill's exemption reason", () => {
  it("measures the fill on the five surfaces a control is placed on", () => {
    expect(surfaces).toEqual([...stateFillSurfaces]);
    expect(disabledFillPairs).toEqual(
      stateFillSurfaces.map((background) => [
        "disabled",
        background,
        "surface",
      ]),
    );
  });

  it("has the public role name its check", () => {
    const block = docBlockAbove("readonly disabled: string;");

    expect(block).toContain("disabledFillPairs");
    expect(block).not.toContain("deliberately allowed");
    expect(block).not.toContain("no neutral clears");
    expect(block).not.toContain("sit near the panel");
  });

  it("describes the measured fill in both catalogue role rows", () => {
    expect(roleRows).toHaveLength(2);
    roleRows.forEach((row) => {
      expect(row).toContain("disabledFillPairs");
      surfaces.forEach((surface) => {
        expect(row, surface).toContain(`\`${surface}\``);
      });
      expect(row).not.toContain("kept near the panel");
    });
  });

  it("states the measured fill in the design system's inactive rule", () => {
    const anchor = "An inactive control is not an opacity composite";
    const at = designSystem.indexOf(anchor);

    expect(at).toBeGreaterThan(-1);
    const paragraph = designSystem.slice(at, at + 700);
    expect(paragraph).toContain("disabledFillPairs");
    surfaces.forEach((surface) => {
      expect(paragraph, surface).toContain(`\`${surface}\``);
    });
    expect(paragraph).not.toContain("allowed to sit within");
    expect(paragraph).not.toContain("no neutral clears");
  });

  it("keeps the narrative that refutes the exemption", () => {
    expect(catalogue).toContain(
      "The `disabled` fill is a fill, not an exemption",
    );
    expect(designSystem).toContain("but that is not true of these palettes");
  });
});
