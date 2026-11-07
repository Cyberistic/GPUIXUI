import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  invisibleFeedbackBrand,
  reportFeedback,
} from "./action-feedback.example.js";
import { auditTheme } from "./audit.js";
import { lightColors, type ThemeColors } from "./color.js";
import { contrastRatio } from "./contrast.js";
import {
  actionFeedbackFailures,
  actionFeedbackPlacements,
  decorativeFailures,
  decorativeFloor,
} from "./decorative.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import { filledFeedback, filledFeedbackStates, filledRoles } from "./styles.js";
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

const section = (document: string, heading: string): string => {
  const start = document.indexOf(heading);
  const end = document.indexOf("\n## ", start + 1);
  return document
    .slice(start, end === -1 ? undefined : end)
    .replace(/\s+/g, " ");
};

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

const step = (
  theme: Theme,
  role: (typeof filledRoles)[number],
  state: (typeof filledFeedbackStates)[number],
): number | undefined =>
  contrastRatio(filledFeedback(theme, role, state), theme.colors[role]);

describe("the pointer feedback a filled role paints", () => {
  it("measures both states of every filled role", () => {
    const measured = actionFeedbackPlacements.map(
      ({ role, state }) => `${role}/${state}`,
    );

    expect(measured).toEqual(
      filledRoles.flatMap((role) =>
        filledFeedbackStates.map((state) => `${role}/${state}`),
      ),
    );
  });

  it("holds the tightest step over every shipped style to the floor", () => {
    const tightest = everyStyle
      .flatMap(([name, theme]) =>
        actionFeedbackPlacements.map(({ role, state }) => ({
          name,
          role,
          state,
          ratio: step(theme, role, state) ?? 0,
        })),
      )
      .reduce((lowest, placement) =>
        placement.ratio < lowest.ratio ? placement : lowest,
      );

    expect(tightest.name).toBe("Dark · Omarchy");
    expect(`${tightest.role}/${tightest.state}`).toBe("destructive/hover");
    expect(tightest.ratio).toBeGreaterThanOrEqual(decorativeFloor);
    expect(section(catalogue, "## Action fills")).toContain(
      `${tightest.ratio.toFixed(2)}:1`,
    );
  });

  it("prints the Windows step it repaired", () => {
    const windows = platformTheme(themes.dark, "win32");
    const hover = step(windows, "primary", "hover");
    const pressed = step(windows, "primary", "pressed");
    const before = contrastRatio(
      filledFeedback(
        {
          colors: { ...windows.colors, primary: "#60CDFF" },
          contrast: windows.contrast,
        },
        "primary",
        "hover",
      ),
      "#60CDFF",
    );
    const page = section(catalogue, "## Action fills");

    expect(before).toBeLessThan(decorativeFloor);
    expect(page).toContain(`${before?.toFixed(2)}:1`);
    expect(page).toContain(`${hover?.toFixed(3)}:1 hover`);
    expect(page).toContain(`${pressed?.toFixed(3)}:1 press`);
  });

  it("reports a brand whose pointer step lands on its own fill", () => {
    const failures = actionFeedbackFailures(invisibleFeedbackBrand);

    expect(failures).toHaveLength(2);
    expect(
      failures.map(({ surface, role, over }) => ({ surface, role, over })),
    ).toEqual([
      { surface: "actionFeedback", role: "primary", over: "primary" },
      { surface: "actionFeedback", role: "primary", over: "primary" },
    ]);
    expect(failures[0]?.ratio).toBeCloseTo(1, 2);
    expect(failures[1]?.ratio).toBeCloseTo(1, 2);
    expect(reportFeedback(invisibleFeedbackBrand)).toEqual([
      "primary: 1.00",
      "primary: 1.00",
    ]);
  });

  it("fails the gate on that brand, through the decorative report", () => {
    const audit = auditTheme(invisibleFeedbackBrand);

    expect(
      audit.decorative.some(({ surface }) => surface === "actionFeedback"),
    ).toBe(true);
    expect(audit.passed).toBe(false);
  });

  it("reports a stored theme that lost its action role as unmeasurable", () => {
    const { primary: _primary, ...withoutPrimary } = lightColors;
    const stored: { colors: Partial<ThemeColors> } = {
      colors: withoutPrimary,
    };

    expect(
      decorativeFailures(stored).filter(
        ({ surface }) => surface === "actionFeedback",
      ),
    ).toEqual([
      expect.objectContaining({
        role: "primary",
        over: "primary",
        ratio: undefined,
      }),
      expect.objectContaining({
        role: "primary",
        over: "primary",
        ratio: undefined,
      }),
    ]);
  });

  it("reads the painters that carry the derived fills", () => {
    const primitives = read("../../primitives/src/recipe/index.ts");
    const variants = read("../../primitives/src/core/variants.ts");
    const button = read("../../components/src/internal/button.tsx");

    expect(button).toContain("@gpuixui/primitives/button");
    expect(primitives).toContain("hover:fill-secondary");
    expect(primitives).toContain("active:fill-secondary-pressed");
    expect(variants).toContain("filledHover(theme, action)");
    expect(variants).toContain("filledPressed(theme, action)");
    expect(variants).toContain('...filled("primary")');
    expect(variants).toContain('...filled("destructive")');
  });
});

describe("the secondary variant paints the derived fills", () => {
  const variants = read("../../primitives/src/core/variants.ts");
  const secondary = variants.slice(
    variants.indexOf("const secondary: ControlVariant"),
    variants.indexOf("const washed:"),
  );
  const filled = variants.slice(
    variants.indexOf("const filled = ("),
    variants.indexOf("const primary: ControlVariant"),
  );

  it("paints both pointer states from the fill it replaces", () => {
    expect(secondary).toContain('...filled("secondary")');
    expect(filled).toContain("filledHover(theme, action)");
    expect(filled).toContain("filledPressed(theme, action)");
    expect(secondary, "the wash the fix replaced").not.toContain(
      "theme.colors.hover",
    );
    expect(secondary, "the wash the fix replaced").not.toContain(
      "theme.colors.active",
    );
  });

  it("clears the floor in every shipped style", () => {
    everyStyle.forEach(([name, theme]) => {
      (["hover", "pressed"] as const).forEach((state) => {
        expect(
          step(theme, "secondary", state),
          `${name} ${state}`,
        ).toBeGreaterThanOrEqual(decorativeFloor);
      });
    });
  });

  it("holds the four documents to the fixed paint", () => {
    const row = inventory.slice(
      inventory.indexOf("| Action fills |"),
      inventory.indexOf("\n", inventory.indexOf("| Action fills |")),
    );

    [catalogue, designSystem, row, readme].forEach((document) => {
      const text = document.replace(/\s+/g, " ");

      expect(text).toContain("15 of its 32 pointer placements");
      expect(text).toContain("derives");
      expect(text, "the retracted deviation").not.toContain("still swaps");
      expect(text, "the retracted deviation").not.toContain(
        "still does, so 15",
      );
    });
  });
});

describe("the catalogue's example", () => {
  it("reports the brand and passes the shipped theme", () => {
    expect(actionFeedbackFailures(lightTheme)).toEqual([]);
    expect(actionFeedbackFailures(invisibleFeedbackBrand)).toHaveLength(2);
    expect(reportFeedback(lightTheme)).toEqual([]);
  });

  it("is the brand the catalogue names", () => {
    expect(section(catalogue, "## Action fills")).toContain(
      "invisibleFeedbackBrand",
    );
  });
});
