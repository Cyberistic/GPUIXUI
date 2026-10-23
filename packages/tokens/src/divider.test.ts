/**
 * Guards the rule a row draws on the state it is in.
 *
 * The bug this holds: a table row paints its own rule *inside* the row — the
 * thin `border` role, on the row's own fill (`packages/data/src/table/table.tsx`)
 * — and a row is a wash. A chosen row fills `selected`, a pointed one tints
 * `hover`, a chosen one tints `accent` under the pointer and every row repaints
 * the **derived** press wash while the button is down. The divider placements
 * measured `border` on the raw `active` role, and that role is not what a
 * pressed row paints: all three packages that paint a row (components,
 * primitives and data) derive the press with
 * `pointerWash(theme, "active", replaced)`, so seven of the thirty-six press
 * placements in the shipped styles are a colour the role does not name (macOS
 * light's press over `accent` is `#D6D6DE` against a `#DEDEE6` role, macOS
 * dark's is `#3E3E44` against `#3A3A40`, and the authored looks move theirs the
 * same way). The contract measured a fill those rows do not paint and left the
 * one they do paint unnamed — so a brand whose rule family could not answer the
 * derived press was measured against the role instead.
 *
 * The raw role is under the 1.05:1 perceptibility floor on **22 of the 90**
 * placements — the base themes' `accent` at 1.001:1 and 1.004:1, and six of the
 * presses the rows paint (macOS dark's over `hover` at 1.000:1) — so the grid
 * vanishes on exactly the row the reader chose. A palette cannot close it: the
 * same `border` carries the page and the card under every quiet row, so raising
 * it to clear a saturated wash draws a grid everywhere else.
 *
 * The rule is therefore derived — `border` stepped toward `borderStrong`, the
 * functional boundary and the strongest line a theme owns, by the smallest 2%
 * that clears the floor — and `dividerFailures` reports a palette whose own
 * strongest line cannot answer a wash. The data package's table asks for the
 * helper with the fill the row wears, the derived press included.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast.js";
import {
  decorativeFailures,
  decorativeFloor,
  dividerFailures,
  dividerOn,
  dividerPresses,
  dividerWashes,
  pointerWash,
} from "./decorative.js";
import {
  pressRule,
  pressSeparation,
  reportRules,
  rowRule,
  ruleSeparation,
  swallowedPressBrand,
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
const readme = read("../README.md");
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

/** What a store hands back for a role it did not save: `JSON` has no `undefined`. */
const stored = (overrides: Partial<Record<keyof Theme, unknown>>): Theme =>
  ({ ...lightTheme, ...overrides }) as Theme;

const ratioOf = (colour: string | undefined, over: string | undefined) =>
  colour === undefined || over === undefined
    ? undefined
    : contrastRatio(colour, over);

const underFloor = (ratio: number | undefined): boolean =>
  ratio === undefined || ratio < decorativeFloor;

const ones = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
] as const;
const tens = ["", "", "twenty", "thirty", "forty", "fifty"] as const;

/** The spelled count the contract's own prose prints, or the numeral past the list. */
const spelled = (count: number): string =>
  count < 20
    ? (ones[count] ?? String(count))
    : `${tens[Math.floor(count / 10)] ?? ""}-${ones[count % 10] ?? ""}`;

/** The wash a press paints, or the role it derives from when the source cannot derive one. */
const pressWash = (theme: Theme, replaced: (typeof dividerPresses)[number]) =>
  pointerWash(theme, "active", replaced);

/**
 * Every placement a rule is drawn on, in the order the table lists them: the
 * three washes a row wears and the two presses it derives.
 */
const placements = everyStyle.flatMap(([name, theme]) => [
  ...dividerWashes.map((wash) => ({
    name,
    theme,
    state: wash,
    authored: theme.colors.border,
    wash: theme.colors[wash],
  })),
  ...dividerPresses.map((replaced) => ({
    name,
    theme,
    state: `press over ${replaced}`,
    authored: theme.colors.border,
    wash: pressWash(theme, replaced),
  })),
]);

/** Each placement with the rule derived over the wash it crosses. */
const measured = placements.map((placement) => {
  const rule = dividerOn(placement.theme, placement.wash);
  return {
    ...placement,
    rule,
    ratio: ratioOf(rule, placement.wash),
    ceiling: ratioOf(placement.theme.colors.borderStrong, placement.wash),
  };
});

/** The placements the raw `border` role cannot be seen on. */
const missed = measured.filter(({ theme, wash }) =>
  underFloor(ratioOf(theme.colors.border, wash)),
);

describe("a rule on the row it crosses", () => {
  it("names the states a row wears and the press it derives", () => {
    expect(dividerWashes).toEqual(["hover", "accent", "selected"]);
    expect(dividerPresses).toEqual(["accent", "hover"]);
    // `active` is a fill a ghost action paints, not a state a row with a rule
    // wears: the press is derived, so no report names the role as a surface.
    everyStyle.forEach(([name, theme]) =>
      expect(
        dividerFailures(theme).map(({ over }) => over),
        name,
      ).not.toContain("active"),
    );
  });

  it("measures the wash the press paints, not the role it derives from", () => {
    // The role is the press only where the palette's own `active` already
    // answers the pointer; a style that needs a step paints a colour the role
    // does not name, and the contract has to follow the paint.
    const stepped = everyStyle.flatMap(([name, theme]) =>
      dividerPresses.flatMap((replaced) => {
        const wash = pressWash(theme, replaced);
        return wash === undefined || wash === theme.colors.active
          ? []
          : [{ name, replaced, role: theme.colors.active, wash }];
      }),
    );

    expect(stepped).toHaveLength(7);
    expect(stepped).toContainEqual({
      name: "Light · macOS",
      replaced: "accent",
      role: "#DEDEE6",
      wash: "#D6D6DE",
    });
    expect(stepped).toContainEqual({
      name: "Dark · macOS",
      replaced: "accent",
      role: "#3A3A40",
      wash: "#3E3E44",
    });
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
    // The placements that forced the helper: a chosen row's hover repaints the
    // fill the rule was measured on, and a press paints a wash the role is not.
    // These are the values the shipped palettes carry, so a palette edit that
    // closes one moves the premise.
    expect(
      ratioOf(lightTheme.colors.border, lightTheme.colors.accent),
    ).toBeCloseTo(1.001, 2);
    expect(
      ratioOf(darkTheme.colors.border, darkTheme.colors.accent),
    ).toBeCloseTo(1.004, 2);
    const macOSDark = platformTheme(themes.dark, "darwin");
    expect(
      ratioOf(
        macOSDark.colors.border,
        pressWash(macOSDark, "hover") ?? macOSDark.colors.active,
      ),
    ).toBeCloseTo(1, 2);
  });

  it("counts the placements the raw role misses", () => {
    // 22 of 90 over the eighteen styles. The count is the measurement both
    // pages print; a palette or a style added to the set moves it and the pages
    // with it.
    expect(missed).toHaveLength(22);
  });

  it("clears every wash in every shipped style", () => {
    expect(measured.filter(({ ratio }) => underFloor(ratio))).toEqual([]);
    const tightest = measured.reduce((least, placement) =>
      (placement.ratio ?? 0) < (least.ratio ?? 0) ? placement : least,
    );
    // The tightest placement is a press: a row that must answer the pointer and
    // keep its grid has the least room in the palette, and macOS light lands one
    // 2% step above the floor. Both pages print this.
    expect(tightest.name).toBe("Light · macOS");
    expect(tightest.state).toBe("press over hover");
    expect(tightest.ratio?.toFixed(3)).toBe("1.050");
    const stepped = measured.filter(({ rule, authored }) => rule !== authored);
    const untouched = measured.filter(
      ({ rule, authored }) => rule === authored,
    );
    const authoredTightest = untouched.reduce((least, placement) =>
      (placement.ratio ?? 0) < (least.ratio ?? 0) ? placement : least,
    );
    expect(authoredTightest.name).toBe("Dark · macOS");
    expect(authoredTightest.state).toBe("selected");
    expect(authoredTightest.ratio?.toFixed(3)).toBe("1.053");
    const ratios = stepped.map(({ ratio }) => ratio ?? 0);
    expect(stepped).toHaveLength(22);
    expect(Math.min(...ratios).toFixed(3)).toBe("1.050");
    expect(Math.max(...ratios).toFixed(3)).toBe("1.081");
  });

  it("never paints heavier than the functional boundary", () => {
    // `borderStrong` is the ceiling: a row's rule may become visible, it may not
    // become the control boundary reserved for fields and outlined actions.
    measured.forEach(({ name, state, ratio, ceiling }) => {
      expect(ratio, `${name} ${state}`).toBeGreaterThanOrEqual(decorativeFloor);
      expect(ratio, `${name} ${state}`).toBeLessThanOrEqual(ceiling ?? 0);
    });
    // The premise for the ceiling: the strongest line clears every placement, so
    // the derivation always has room to move. The tightest is a press.
    const tightest = measured.reduce((least, placement) =>
      (placement.ceiling ?? 0) < (least.ceiling ?? 0) ? placement : least,
    );
    expect(tightest.name).toBe("Light · Windows");
    expect(tightest.state).toBe("press over accent");
    expect(tightest.ceiling?.toFixed(2)).toBe("3.73");
  });

  it("reports a press the strongest line cannot answer", () => {
    // The brand is macOS light with its whole rule family painted the wash its
    // press derives: the pressed row's rule is the pressed row. Measured before
    // the placement existed, this report stayed empty — the contract was reading
    // the `active` role instead.
    expect(dividerFailures(swallowedPressBrand)).toContainEqual({
      surface: "pressedDivider",
      role: "border",
      over: "hover",
      ratio: 1,
      floor: decorativeFloor,
    });
    // The report rides the decorative one, so the gate holds it without a new
    // contract: the same brand's `decorative` report carries the placement.
    expect(decorativeFailures(swallowedPressBrand)).toContainEqual(
      expect.objectContaining({ surface: "pressedDivider", over: "hover" }),
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
    // A press cannot be derived without a foreground, so the placement is
    // reported unmeasurable rather than skipped.
    const noInk = stored({
      colors: { ...lightTheme.colors, foreground: undefined },
    });
    expect(
      dividerFailures(noInk)
        .filter(({ surface }) => surface === "pressedDivider")
        .map(({ over, ratio }) => ({ over, ratio })),
    ).toEqual([
      { over: "accent", ratio: undefined },
      { over: "hover", ratio: undefined },
    ]);
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

  it("is clean for every shipped style", () => {
    everyStyle.forEach(([name, theme]) =>
      expect(dividerFailures(theme), name).toEqual([]),
    );
  });

  it("executes the example the catalogue documents", () => {
    // The rule a consumer copies: the authored role on a quiet row, a step on
    // the one a chosen row hovers, and the wash the press actually paints.
    expect(rowRule(lightTheme, "selected")).toBe(lightTheme.colors.border);
    expect(ruleSeparation(lightTheme, "accent")).toBeGreaterThanOrEqual(
      decorativeFloor,
    );
    const macOSLight = platformTheme(themes.light, "darwin");
    expect(pressRule(macOSLight, "hover")).toBe("#D7D7DE");
    expect(pressSeparation(macOSLight, "hover")).toBeCloseTo(1.0502115, 5);
    expect(pressSeparation(lightTheme, "accent")).toBeGreaterThanOrEqual(
      decorativeFloor,
    );
    expect(reportRules(swallowedRuleBrand)).toEqual([
      "border on hover is 1.04",
      "border on accent is 1.00",
    ]);
    expect(reportRules(swallowedPressBrand)).toEqual([
      "border on accent is 1.01",
      "border on the press over hover is 1.00",
    ]);
  });

  it("prints the counts it measures in its own documentation", () => {
    // The contract publishes its measurement in prose, and two style additions
    // outgrew it: the rule doc still said sixteen styles, "20 of the 80" and
    // "seven of the thirty-two" presses while the table measured eighteen, 90
    // and 36. The numbers here are derived from the same tables the report
    // walks, so a style or a placement added to the contract fails the prose
    // that publishes it.
    const source = read("./decorative.ts")
      .replace(/^\s*\*\s?/gm, "")
      .replace(/\s+/g, " ");
    const derivedPresses = everyStyle.filter(([, theme]) =>
      dividerPresses.some((replaced) => {
        const wash = pressWash(theme, replaced);
        return wash !== undefined && wash !== theme.colors.active;
      }),
    );
    const moved = everyStyle.flatMap(([, theme]) =>
      dividerPresses.filter((replaced) => {
        const wash = pressWash(theme, replaced);
        return wash !== undefined && wash !== theme.colors.active;
      }),
    );
    const presses = everyStyle.length * dividerPresses.length;
    // The tonal action's wash claim is a count beside the rule's: the fill of a
    // `secondary` action on the four washes a row wears.
    const washCells = everyStyle.flatMap(([, theme]) =>
      (["hover", "active", "accent", "selected"] as const).map((wash) =>
        ratioOf(theme.colors.secondary, theme.colors[wash]),
      ),
    );
    const washMisses = washCells.filter(underFloor);

    expect(moved).toHaveLength(7);
    expect(derivedPresses).toHaveLength(6);
    expect(washMisses).toHaveLength(36);
    expect(source).toContain(
      `**${missed.length} of the ${placements.length}**`,
    );
    expect(source).toContain(`all ${placements.length} placements`);
    expect(source).toContain(
      `of the ${spelled(presses)} press placements in the ${spelled(everyStyle.length)} shipped`,
    );
    expect(source).toContain(
      `**${washMisses.length} of the ${washCells.length}** wash placements`,
    );
    expect(source).not.toContain("20 of the 80");
    expect(source).not.toContain("all 80 placements");
    expect(source).not.toContain("thirty-two");
    // The inventory row names the same premise the guard holds, so the count a
    // reader checks there cannot stay on the previous style set.
    expect(inventory).toContain(
      `the ${missed.length}/${placements.length} premise`,
    );
    expect(inventory).not.toContain("20/80");
  });

  it("holds the premise to the painter and the pages", () => {
    // The table derives its rule from the fill it wears, the derived press
    // included: a fill it stops deriving for is a placement that outlives its
    // paint.
    expect(table).toContain('pointerWash(theme, "active", "accent")');
    expect(table).toContain('pointerWash(theme, "active", "hover")');
    expect(table).toContain("dividerOn(theme, surface)");
    expect(table).toContain("borderBottomWidth: theme.borderWidth.thin");
    // Both pages teach the helper, the press and the counts. The totals are
    // derived, not typed: a rule is drawn on every style × (three washes + two
    // presses), so a style or a state added to the table fails here until the
    // pages print the set they now measure — the previous total (88) survived a
    // look being added because the guard pinned it.
    const presses = everyStyle.length * dividerPresses.length;

    expect(placements).toHaveLength(everyStyle.length * 5);
    // The denominator is 36 in prose, so the word is pinned beside the count it
    // stands for: a style added to the set fails on the number first.
    expect(presses).toBe(36);
    [catalogue, designSystem].forEach((page) => {
      expect(page).toContain("dividerOn");
      expect(page).toContain("pressedDivider");
      expect(page).toContain(
        `**${missed.length} of the ${placements.length}**`,
      );
      expect(page).toContain("seven of the thirty-six press placements");
    });
    expect(inventory).toContain(`${missed.length} of the ${placements.length}`);
    expect(readme).toContain(
      `${missed.length} of the ${placements.length} shipped placements`,
    );
    expect(catalogue).toContain("dividerPresses");
    expect(catalogue).toContain("dividerFailures");
    expect(catalogue).toContain("1.050");
    // The inventory row names the press placement beside the contract's file.
    expect(inventory).toContain("pressedDivider");
  });
});
