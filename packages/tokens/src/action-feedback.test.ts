/**
 * Guards the one surface a control cannot do without: the fill it paints
 * between the pointer arriving and the press landing.
 *
 * The bug this holds: `filledHover` / `filledPressed` derive their step by
 * moving an action role 12% / 18% of the way toward the theme's `foreground`,
 * and **nothing measured the result**. The contrast table measures roles on
 * strips; `decorativeSurfaces` measures roles on strips; a derived fill is
 * neither — so a theme whose `foreground` sits on its own action role painted a
 * hover that was the fill it replaced while every report stayed empty. That is
 * reachable, not hypothetical: `invisibleFeedbackBrand` is a brand built in one
 * hue, where the page copy reads and the action carries its own label.
 *
 * The contract also found a shipped step on the floor: Windows dark's primary
 * `#60CDFF` hovered to **1.05:1**, under the 1.05 perceptibility floor — a
 * primary button on a Windows window that did not answer the pointer — so the
 * platform carries `#59C9FF` (1.059:1) now.
 *
 * And it measured the deviation the pages had been describing as adoption: the
 * components package's action used to paint the derived fills for `primary` and
 * `danger` while its `secondary` variant painted the `hover` / `active` role
 * washes over the `secondary` fill — **1.000:1** hovered in the two
 * high-contrast variants and macOS light, and 1.000:1 pressed in Windows dark,
 * where the wash *is* the fill. That painter belongs to another package, which
 * has since delegated the action to `@gpuixui/primitives` (plan 160); the
 * variant table the primitives own is where the derivation now lives, and this
 * suite holds the documents to that painter in both directions.
 */

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
const inventory = read("../../../COMPONENTS.md");
const readme = read("../README.md");

const section = (document: string, heading: string): string => {
  const start = document.indexOf(heading);
  const end = document.indexOf("\n## ", start + 1);
  return document
    .slice(start, end === -1 ? undefined : end)
    .replace(/\s+/g, " ");
};

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

/** The measured step of one role in one state, as the report reads it. */
const step = (
  theme: Theme,
  role: (typeof filledRoles)[number],
  state: (typeof filledFeedbackStates)[number],
): number | undefined =>
  contrastRatio(filledFeedback(theme, role, state), theme.colors[role]);

describe("the pointer feedback a filled role paints", () => {
  it("measures both states of every filled role", () => {
    // A control has two pointer states and four faces (the three actions and a
    // toggle's accent): a placement table that drops one leaves that face's cue
    // unmeasured, which is exactly how the contract's predecessor missed every
    // derived fill.
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
    // The tightest placement is the claim a brand has to beat, so the page
    // prints the number this computes rather than a remembered one.
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

    expect(tightest.name).toBe("High contrast dark");
    expect(`${tightest.role}/${tightest.state}`).toBe("primary/hover");
    expect(tightest.ratio).toBeGreaterThanOrEqual(decorativeFloor);
    expect(section(catalogue, "## Action fills")).toContain(
      `${tightest.ratio.toFixed(2)}:1`,
    );
  });

  it("prints the Windows step it repaired", () => {
    // The catalogue quotes the painted values, so a palette or helper edit that
    // moves them fails here rather than leaving the page teaching an old step.
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
    // One hue, so the page copy reads and the action carries its own white
    // label, while both pointer steps move toward text that is the fill's own
    // colour — the hover and the press collapse together.
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
    // No new `ThemeAudit` key: the derived fill is a decorative surface, so the
    // report a brand already runs covers it and the docs site's readout needs no
    // eleventh formatter.
    const audit = auditTheme(invisibleFeedbackBrand);

    expect(
      audit.decorative.some(({ surface }) => surface === "actionFeedback"),
    ).toBe(true);
    expect(audit.passed).toBe(false);
  });

  it("reports a stored theme that lost its action role as unmeasurable", () => {
    // A theme restored from storage can predate the role; the placement is
    // reported rather than skipped, the same rule every other contract follows.
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
    // The placements exist because two packages paint these helpers: the
    // primitives' registry asks for `fill-<action>` / `fill-<action>-pressed`,
    // and the action's own variant table derives the step outright. The
    // components' action delegates to the primitives' button (plan 160), so the
    // painter a contract is held to is that table.
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
  // The variant swapped its fill to the `hover` / `active` role washes, and a
  // wash is often the fill it replaces: 15 of its 32 pointer placements sat
  // under the floor, 1.000:1 in the variants a reader selects for clarity. It
  // derives both states from the `secondary` fill now, like the other actions,
  // so its label keeps an opaque step the filled-role contract measures.
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
    // The deviation was printed as a measured fact in all four, so the same
    // four have to carry its closure: the history stays (a reader can check the
    // claim) and the retracted "still swaps" sentence does not.
    [catalogue, designSystem, inventory, readme].forEach((document) => {
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
