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
const inventory = read("../../../.agents/slop/COMPONENTS.md");
const readme = read("../README.md");
const table = read("../../data/src/table/table.tsx");

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

const spelled = (count: number): string =>
  count < 20
    ? (ones[count] ?? String(count))
    : `${tens[Math.floor(count / 10)] ?? ""}-${ones[count % 10] ?? ""}`;

const pressWash = (theme: Theme, replaced: (typeof dividerPresses)[number]) =>
  pointerWash(theme, "active", replaced);

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

const measured = placements.map((placement) => {
  const rule = dividerOn(placement.theme, placement.wash);
  return {
    ...placement,
    rule,
    ratio: ratioOf(rule, placement.wash),
    ceiling: ratioOf(placement.theme.colors.borderStrong, placement.wash),
  };
});

const missed = measured.filter(({ theme, wash }) =>
  underFloor(ratioOf(theme.colors.border, wash)),
);

describe("a rule on the row it crosses", () => {
  it("names the states a row wears and the press it derives", () => {
    expect(dividerWashes).toEqual(["hover", "accent", "selected"]);
    expect(dividerPresses).toEqual(["accent", "hover"]);

    everyStyle.forEach(([name, theme]) =>
      expect(
        dividerFailures(theme).map(({ over }) => over),
        name,
      ).not.toContain("active"),
    );
  });

  it("measures the wash the press paints, not the role it derives from", () => {
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
    expect(dividerOn(lightTheme, lightTheme.colors.selected)).toBe(
      lightTheme.colors.border,
    );
    expect(
      ratioOf(lightTheme.colors.border, lightTheme.colors.selected),
    ).toBeGreaterThanOrEqual(decorativeFloor);
  });

  it("steps the rule where the role cannot be seen", () => {
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
    expect(missed).toHaveLength(22);
  });

  it("clears every wash in every shipped style", () => {
    expect(measured.filter(({ ratio }) => underFloor(ratio))).toEqual([]);
    const tightest = measured.reduce((least, placement) =>
      (placement.ratio ?? 0) < (least.ratio ?? 0) ? placement : least,
    );

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
    measured.forEach(({ name, state, ratio, ceiling }) => {
      expect(ratio, `${name} ${state}`).toBeGreaterThanOrEqual(decorativeFloor);
      expect(ratio, `${name} ${state}`).toBeLessThanOrEqual(ceiling ?? 0);
    });

    const tightest = measured.reduce((least, placement) =>
      (placement.ceiling ?? 0) < (least.ceiling ?? 0) ? placement : least,
    );
    expect(tightest.name).toBe("Light · Windows");
    expect(tightest.state).toBe("press over accent");
    expect(tightest.ceiling?.toFixed(2)).toBe("3.73");
  });

  it("reports a press the strongest line cannot answer", () => {
    expect(dividerFailures(swallowedPressBrand)).toContainEqual({
      surface: "pressedDivider",
      role: "border",
      over: "hover",
      ratio: 1,
      floor: decorativeFloor,
    });

    expect(decorativeFailures(swallowedPressBrand)).toContainEqual(
      expect.objectContaining({ surface: "pressedDivider", over: "hover" }),
    );
  });

  it("reads absence as absence, not a guess", () => {
    expect(dividerOn(lightTheme, "rgba(0, 0, 0, 0.5)")).toBe(
      lightTheme.colors.border,
    );
    expect(dividerOn(lightTheme, undefined)).toBe(lightTheme.colors.border);

    expect(dividerOn({ colors: {} }, "#ffffff")).toBeUndefined();
    expect(
      dividerOn({ colors: { border: "#101010" } }, "#ffffff"),
    ).toBeUndefined();

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
    const washCells = everyStyle.flatMap(([, theme]) =>
      (["hover", "active", "accent", "selected"] as const).map((wash) =>
        ratioOf(theme.colors.secondary, theme.colors[wash]),
      ),
    );
    const washMisses = washCells.filter(underFloor);

    expect(moved).toHaveLength(7);
    expect(derivedPresses).toHaveLength(6);
    expect(washMisses).toHaveLength(36);

    const prose = catalogue.replace(/\s+/g, " ");
    expect(prose).toContain(
      `measured over the ${spelled(everyStyle.length)} styles`,
    );
    expect(prose).not.toContain("measured over the sixteen styles");

    expect(inventory).toContain(
      `the ${missed.length}/${placements.length} premise`,
    );
    expect(inventory).not.toContain("20/80");
  });

  it("holds the premise to the painter and the pages", () => {
    expect(table).toContain('pointerWash(theme, "active", "accent")');
    expect(table).toContain('pointerWash(theme, "active", "hover")');
    expect(table).toContain("dividerOn(theme, surface)");

    expect(
      table.includes("borderBottomWidth: theme.borderWidth.thin") ||
        table.includes('borderBottomWidth: borderWidthOf(theme, "thin")'),
    ).toBe(true);

    const presses = everyStyle.length * dividerPresses.length;

    expect(placements).toHaveLength(everyStyle.length * 5);

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

    expect(inventory).toContain("pressedDivider");
  });
});
