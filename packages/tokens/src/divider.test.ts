/**
 * Guards the rule a row draws on the state it is in.
 *
 * The bug this holds: a table row paints its own rule *inside* the row — the
 * thin `border` role, on the row's own fill (`packages/data/src/table/table.tsx`)
 * — and a row is a wash. A selected row fills `selected`, a pointed one tints
 * `hover`, a chosen one tints `accent` under the pointer and repaints the
 * derived press wash while the button is down. The divider placements measured
 * `border` on the four content strips only, so the grid a reader actually looks
 * at was measured against the page under the row rather than the state the row
 * is in.
 *
 * Measured over the sixteen shipped, high-contrast, platform and authored
 * styles, the raw role is under the 1.05:1 perceptibility floor on **17 of the
 * 64** wash placements — the base light theme's and the base dark theme's
 * `accent` at 1.001:1 and 1.004:1, macOS dark's `active` at 1.000:1 — so the
 * grid vanishes on exactly the row the reader chose. A palette cannot close it:
 * the same `border` carries the page and the card under every quiet row, so
 * raising it to clear a saturated wash draws a grid everywhere else.
 *
 * The rule is therefore derived — `border` stepped toward `borderStrong`, the
 * functional boundary and the strongest line a theme owns, by the smallest 2%
 * that clears the floor — and `dividerFailures` reports a palette whose own
 * strongest line cannot answer a wash. The data package's table does not ask for
 * the helper yet; the tokens half is this file.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast.js";
import {
  decorativeFailures,
  decorativeFloor,
  dividerFailures,
  dividerOn,
  dividerWashes,
} from "./decorative.js";
import {
  reportRules,
  rowRule,
  ruleSeparation,
  swallowedRuleBrand,
} from "./divider.example.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import {
  darkTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  themes,
  type Theme,
} from "./theme.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const catalogue = read("../../../docs/tokens.md");
const designSystem = read("../../../docs/design-system.md");
const inventory = read("../../../COMPONENTS.md");
const table = read("../../data/src/table/table.tsx");

/** Every shipped, high-contrast, platform and authored style, named. */
const everyStyle: ReadonlyArray<readonly [string, Theme]> = [
  [lightTheme.name, lightTheme],
  [darkTheme.name, darkTheme],
  [highContrastLightTheme.name, highContrastLightTheme],
  [highContrastDarkTheme.name, highContrastDarkTheme],
  ...platformNames.flatMap(
    (name) =>
      [
        [
          platformTheme(themes.light, name).name,
          platformTheme(themes.light, name),
        ],
        [
          platformTheme(themes.dark, name).name,
          platformTheme(themes.dark, name),
        ],
      ] as const,
  ),
  ...retroNames.flatMap(
    (name) =>
      [
        [retroTheme(themes.light, name).name, retroTheme(themes.light, name)],
        [retroTheme(themes.dark, name).name, retroTheme(themes.dark, name)],
      ] as const,
  ),
];

/** The four washes, named once so a missing one fails by name. */
const washes = ["hover", "active", "accent", "selected"] as const;

/** What a store hands back for a role it did not save: `JSON` has no `undefined`. */
const stored = (overrides: Partial<Record<keyof Theme, unknown>>): Theme =>
  ({ ...lightTheme, ...overrides }) as Theme;

const ratioOf = (colour: string, over: string): number | undefined =>
  contrastRatio(colour, over);

/** One derived rule per shipped style and wash, measured on the wash it crosses. */
const placements = everyStyle.flatMap(([name, theme]) =>
  washes.map((wash) => {
    const rule = dividerOn(theme, theme.colors[wash]);
    return {
      name,
      wash,
      rule,
      authored: theme.colors.border,
      ratio: rule === undefined ? undefined : ratioOf(rule, theme.colors[wash]),
    };
  }),
);

describe("a rule on the row it crosses", () => {
  it("names the four row states it is drawn on", () => {
    expect(dividerWashes).toEqual(["hover", "active", "accent", "selected"]);
  });

  it("paints the authored role where it already reads", () => {
    // A resting row is not the problem: the base light theme's `border` clears
    // `selected`, so the derivation must not touch it.
    expect(dividerOn(lightTheme, lightTheme.colors.selected)).toBe(
      lightTheme.colors.border,
    );
    expect(
      ratioOf(lightTheme.colors.border, lightTheme.colors.selected),
    ).toBeGreaterThanOrEqual(decorativeFloor);
  });

  it("steps the rule where the role cannot be seen", () => {
    // The placement that forced the helper: a chosen row's hover repaints the
    // fill the rule was measured on. These are the values the shipped palettes
    // carried, so a palette edit that closes one moves the premise.
    expect(
      ratioOf(lightTheme.colors.border, lightTheme.colors.accent),
    ).toBeCloseTo(1.001, 2);
    expect(
      ratioOf(darkTheme.colors.border, darkTheme.colors.accent),
    ).toBeCloseTo(1.004, 2);
    expect(
      ratioOf(
        platformTheme(themes.dark, "darwin").colors.border,
        platformTheme(themes.dark, "darwin").colors.active,
      ),
    ).toBeCloseTo(1, 2);
  });

  it("counts the placements the raw role misses", () => {
    // 17 of 64 over the sixteen styles. The count is the measurement the
    // catalogue prints; it moves only when a palette or a style changes, and
    // then the page moves with it.
    const missed = everyStyle.flatMap(([, theme]) =>
      washes.filter((wash) => {
        const ratio = ratioOf(theme.colors.border, theme.colors[wash]);
        return ratio === undefined || ratio < decorativeFloor;
      }),
    );

    expect(missed).toHaveLength(17);
  });

  it("clears every wash in every shipped style", () => {
    expect(
      placements.filter(
        ({ ratio }) => ratio === undefined || ratio < decorativeFloor,
      ),
    ).toEqual([]);
    const tightest = placements.reduce((least, placement) =>
      (placement.ratio ?? 0) < (least.ratio ?? 0) ? placement : least,
    );
    // The authored role already clears some washes, so the tightest placement
    // overall is one the derivation did not touch; the step range is the lines it
    // had to move. Both pages print these.
    expect(tightest.name).toBe("Dark · macOS");
    expect(tightest.wash).toBe("selected");
    expect(tightest.ratio?.toFixed(3)).toBe("1.053");
    const stepped = placements.filter(
      ({ rule, authored }) => rule !== authored,
    );
    const ratios = stepped.map(({ ratio }) => ratio ?? 0);
    expect(Math.min(...ratios).toFixed(3)).toBe("1.057");
    expect(Math.max(...ratios).toFixed(3)).toBe("1.080");
  });

  it("never paints heavier than the functional boundary", () => {
    // `borderStrong` is the ceiling: a row's rule may become visible, it may not
    // become the control boundary reserved for fields and outlined actions.
    everyStyle.forEach(([name, theme]) =>
      washes.forEach((wash) => {
        const rule = dividerOn(theme, theme.colors[wash]);
        const step =
          rule === undefined ? undefined : ratioOf(rule, theme.colors[wash]);
        const ceiling = ratioOf(theme.colors.borderStrong, theme.colors[wash]);
        if (step === undefined || ceiling === undefined) return;
        expect(step, `${name} ${wash}`).toBeLessThanOrEqual(ceiling);
        expect(step, `${name} ${wash}`).toBeGreaterThanOrEqual(decorativeFloor);
      }),
    );
    // The premise for the ceiling: the strongest line clears every wash, so the
    // derivation always has room to move.
    everyStyle.forEach(([name, theme]) =>
      washes.forEach((wash) => {
        expect(
          ratioOf(theme.colors.borderStrong, theme.colors[wash]),
          `${name} ${wash}`,
        ).toBeGreaterThanOrEqual(decorativeFloor);
      }),
    );
  });

  it("reads absence as absence, not a guess", () => {
    // A surface that cannot be measured keeps the authored role.
    expect(dividerOn(lightTheme, "rgba(0, 0, 0, 0.5)")).toBe(
      lightTheme.colors.border,
    );
    expect(dividerOn(lightTheme, undefined)).toBe(lightTheme.colors.border);
    // A theme with no rule family has no colour to hand back.
    expect(dividerOn({ colors: {} }, "#ffffff")).toBeUndefined();
    expect(
      dividerOn({ colors: { border: "#101010" } }, "#ffffff"),
    ).toBeUndefined();
    // A theme a store wrote hands back `null` for a role it did not save; the
    // report names it unmeasurable instead of throwing on it.
    const lost = stored({
      colors: { ...lightTheme.colors, border: null },
    });
    expect(() => dividerFailures(lost)).not.toThrow();
    expect(
      dividerFailures(lost).every(({ ratio }) => ratio === undefined),
    ).toBe(true);
  });

  it("reports a wash the strongest line cannot answer", () => {
    expect(dividerFailures(swallowedRuleBrand)).toContainEqual({
      surface: "derivedDivider",
      role: "border",
      over: "accent",
      ratio: 1,
      floor: decorativeFloor,
    });
    // The report rides the decorative one, so the gate holds it without a new
    // contract: the same brand's `decorative` report carries the placement.
    expect(decorativeFailures(swallowedRuleBrand)).toContainEqual(
      expect.objectContaining({ surface: "derivedDivider", over: "accent" }),
    );
  });

  it("is clean for every shipped style", () => {
    everyStyle.forEach(([name, theme]) =>
      expect(dividerFailures(theme), name).toEqual([]),
    );
  });

  it("executes the example the catalogue documents", () => {
    // The row rule a consumer copies: the authored role on a quiet row, a step
    // on the one a chosen row hovers.
    expect(rowRule(lightTheme, "selected")).toBe(lightTheme.colors.border);
    expect(ruleSeparation(lightTheme, "accent")).toBeGreaterThanOrEqual(
      decorativeFloor,
    );
    expect(reportRules(swallowedRuleBrand)).toEqual([
      "border on hover is 1.04",
      "border on accent is 1.00",
    ]);
  });

  it("holds the premise to the painter and the pages", () => {
    // The table paints the raw role on the header and every row, so the measured
    // placements are live until the data half adopts the helper.
    expect(table).toContain("borderColor: theme.colors.border");
    // Both pages teach the helper, the count and the four surfaces.
    [catalogue, designSystem].forEach((page) => {
      expect(page).toContain("dividerOn");
      expect(page).toContain("17");
    });
    expect(catalogue).toContain("dividerWashes");
    expect(catalogue).toContain("dividerFailures");
    expect(catalogue).toContain("1.057");
    // The inventory row names the new placement beside the contract's file.
    expect(inventory).toContain("derivedDivider");
  });
});
