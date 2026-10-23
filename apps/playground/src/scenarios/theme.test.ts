/**
 * Guards the samples the `theme-look` probe paints.
 *
 * The probe asserts each look's painted mono family, `primary` fill, `lg` radius
 * and `md` control height against `retroTheme`. That only proves the merge rule
 * ran if those values differ from the base theme — a look that inherited the
 * base would make the probe pass while `applyStyle` did nothing. The bug this
 * catches: a look collapsed onto the house identity, or every look collapsed
 * onto one value. Two looks may share a radius (the Omarchy and Luna looks both
 * use 3), so the radius rule is "none paints the base's, and as many steps as the
 * styles author" while the mono family and the fill carry the per-look
 * distinctness. The README's `theme-look` row is held to the same samples, so the
 * prose cannot list a set of looks the gallery no longer paints.
 *
 * `node:fs` is deliberate, as in the other fixtures: this reads the repository's
 * own README, never a runtime path.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import {
  getTheme,
  retroNames,
  retroStyles,
  retroTheme,
  type Theme,
} from "@gpuixui/tokens";

const base = getTheme("dark");
const looks = Arr.map(retroNames, (look) => ({
  look,
  theme: retroTheme(base, look),
}));

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

/** The README's `theme-look` table row, or `""` when it is gone. */
const row = Option.getOrElse(
  Arr.findFirst(Str.split(readme, "\n"), Str.includes("| `theme-look` |")),
  () => "",
);

/** The row's `a / b / c` list of `pick` for every look, in registry order. */
const listOf = (pick: (theme: Theme) => number): string =>
  Arr.join(
    Arr.map(looks, ({ theme }) => `${pick(theme)}`),
    " / ",
  );

describe("the theme-look probe's samples", () => {
  it("paints as many distinct lg steps as the looks author", () => {
    const radii = Arr.map(looks, ({ theme }) => theme.radius.lg);
    expect(radii).not.toContain(base.radius.lg);
    // A look that fell back to the base would drop a step the styles' own table
    // authors; two looks sharing one is a design choice (Luna and Omarchy both
    // author 3), so the comparison is against that table, not the look count.
    const authored = Arr.map(retroNames, (look) => retroStyles[look].radius.lg);
    expect(Arr.dedupe(authored).length).toBeGreaterThan(1);
    expect(Arr.dedupe(radii)).toHaveLength(Arr.dedupe(authored).length);
  });

  it("gives every look a primary fill the base and its sibling do not paint", () => {
    const fills = Arr.map(looks, ({ theme }) => theme.colors.primary);
    expect(fills).not.toContain(base.colors.primary);
    expect(Arr.dedupe(fills)).toHaveLength(looks.length);
  });

  it("gives every look a mono family of its own", () => {
    const families = Arr.map(looks, ({ theme }) => theme.typography.mono);
    expect(Arr.dedupe(families)).toHaveLength(looks.length);
  });

  it("gives at least one look a control height the base density does not", () => {
    const heights = Arr.map(
      looks,
      ({ theme }) => theme.density.controlHeight.md,
    );
    expect(heights).not.toEqual(
      Arr.map(looks, () => base.density.controlHeight.md),
    );
  });

  it("names every look, its mono family and its own samples in the README", () => {
    // The row listed two looks and their two radii long after `omarchy` shipped,
    // so a reader was told the gallery paints a set it no longer paints.
    expect(row).not.toBe("");
    Arr.forEach(looks, ({ theme }) =>
      expect(row).toContain(theme.typography.mono),
    );
    expect(row).toContain(listOf((theme) => theme.radius.lg));
    expect(row).toContain(listOf((theme) => theme.density.controlHeight.md));
  });
});
