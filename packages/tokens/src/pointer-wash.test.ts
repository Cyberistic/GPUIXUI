/**
 * Guards the wash a row paints in a pointer state.
 *
 * The bug this holds: a row's state is a **wash**, and a wash is measured
 * against the strip it sits on — the page, a card, a popover, a toolbar. The
 * state a row is *in* was never measured: a list row tints `accent` under the
 * pointer and paints `active` while the press is down, and a menu row tints
 * `hover` and repaints `active`. So a row's press was a role on a strip, and
 * the strip under a row is the page — the one surface every wash passes.
 *
 * Measured on the sixteen shipped, high-contrast, platform and authored styles,
 * the press was invisible in six of them: macOS light's `active` sat 1.026:1
 * from its `accent` and macOS dark's 1.011:1, Linux dark's 1.015:1, Windows
 * dark's 1.044:1, Luna light's 1.016:1 and Aero light's 1.020:1 — and macOS
 * light's press in its hover at 1.037:1. A row that does not change when the
 * pointer goes down is a row that does not answer the press.
 *
 * A palette cannot close it: macOS dark's `accent` carries a 7:1 label and a
 * 3:1 primary tick and its `selectedForeground` is pinned at 7:1 on the
 * lightened `active`, so the three roles have no room between them. The step
 * therefore has to be **derived** — `filledHover`'s rule applied to a wash: the
 * smallest move toward the theme's `foreground` that clears the perceptibility
 * floor against the wash the row already wears, and never one that costs a
 * label the floor it holds on the role the wash plays.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditTheme } from "./audit.js";
import type { ThemeColors } from "./color.js";
import {
  contrastFloorsFor,
  contrastPairs,
  contrastRatio,
  type ContrastFloors,
} from "./contrast.js";
import {
  decorativeFailures,
  decorativeFloor,
  pointerWash,
  pointerWashFailures,
  pointerWashTransitions,
} from "./decorative.js";
import { platformNames } from "./platforms.js";
import {
  flatPressBrand,
  invisiblePressBrand,
  pressSeparation,
  pressWash,
  reportPointerWashes,
} from "./pointer-wash.example.js";
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

/** The pairs the table holds on a role — the labels a wash playing it carries. */
const labelsOn = (
  role: keyof ThemeColors,
): ReadonlyArray<{
  foreground: keyof ThemeColors;
  floor: keyof ContrastFloors;
}> =>
  contrastPairs
    .filter(({ background }) => background === role)
    .map(({ foreground, floor }) => ({ foreground, floor }));

describe("the wash a pointer state paints", () => {
  it("names the three states a row takes", () => {
    // A chosen list row is filled `selected` and tints `accent` when the pointer
    // arrives, then `active` while the press is down; a menu row, a ghost action
    // or a table row tints `hover` and repaints `active` under the press. Every
    // one of them replaces a wash the row is already wearing.
    expect(pointerWashTransitions).toEqual([
      { wash: "accent", replaced: "selected" },
      { wash: "active", replaced: "accent" },
      { wash: "active", replaced: "hover" },
    ]);
  });

  it("paints a palette that already answers the pointer as it is", () => {
    // The base light theme's own press clears the floor against the wash the row
    // wears (1.099:1), so the derivation paints the role the theme authored —
    // a derivation that always moved a palette would repaint a correct wash.
    expect(pointerWash(lightTheme, "active", "accent")).toBe(
      lightTheme.colors.active,
    );
    expect(
      contrastRatio(lightTheme.colors.active, lightTheme.colors.accent),
    ).toBeGreaterThanOrEqual(decorativeFloor);
  });

  it("separates a press that is the wash it replaces", () => {
    // The brand's press *is* its hover, so the raw role answers nothing.
    expect(flatPressBrand.colors.active).toBe(flatPressBrand.colors.accent);
    expect(
      contrastRatio(flatPressBrand.colors.active, flatPressBrand.colors.accent),
    ).toBeCloseTo(1, 3);

    // The derived press moves off it and clears the floor.
    const derived = pressWash(flatPressBrand, "accent");

    expect(derived).toBeDefined();
    expect(derived).not.toBe(flatPressBrand.colors.accent);
    expect(pressSeparation(flatPressBrand, "accent")).toBeGreaterThanOrEqual(
      decorativeFloor,
    );
  });

  it("keeps the labels the wash plays at their floor", () => {
    // The derived wash plays a role, so it is held to the labels the table
    // measures on that role: the row's own text, the secondary line beside it,
    // a checked row's tick, and the ring and edge that hug the fill.
    everyStyle.forEach(([name, theme]) => {
      const floors = contrastFloorsFor(theme);
      pointerWashTransitions.forEach(({ wash, replaced }) => {
        const painted = pointerWash(theme, wash, replaced);
        labelsOn(wash).forEach(({ foreground, floor }) => {
          const ratio = contrastRatio(theme.colors[foreground], painted);
          expect(
            ratio,
            `${name} ${wash} on ${replaced}: ${foreground}`,
          ).toBeGreaterThanOrEqual(floors[floor]);
        });
      });
    });
  });

  it("reports a press no step can separate", () => {
    // The derivation moves the press toward the theme's `foreground`, so a
    // palette whose text colour *is* the hover wash has nowhere to move.
    const failures = pointerWashFailures(invisiblePressBrand);

    expect(
      failures.filter(({ over }) => over === "accent").length,
    ).toBeGreaterThan(0);
    expect(failures[0]?.surface).toBe("pointerWash");
    expect(failures[0]?.ratio).toBeCloseTo(1, 3);
  });

  it("fails the gate on that brand, through the decorative report", () => {
    // No new `ThemeAudit` key: the derived wash is a decorative surface, so the
    // report a brand already runs covers it and the docs site's readout needs no
    // twelfth formatter.
    const audit = auditTheme(invisiblePressBrand);

    expect(
      audit.decorative.some(({ surface }) => surface === "pointerWash"),
    ).toBe(true);
    expect(audit.passed).toBe(false);
  });

  it("answers the pointer in every shipped, platform and authored style", () => {
    const tightest = everyStyle
      .flatMap(([name, theme]) =>
        pointerWashTransitions.map(({ wash, replaced }) => {
          const painted = pointerWash(theme, wash, replaced);
          const ratio =
            painted === undefined
              ? undefined
              : contrastRatio(painted, theme.colors[replaced]);
          return { name, pair: `${wash} on ${replaced}`, ratio };
        }),
      )
      .reduce((closest, placement) =>
        placement.ratio !== undefined &&
        (closest.ratio === undefined || placement.ratio < closest.ratio)
          ? {
              name: placement.name,
              pair: placement.pair,
              ratio: placement.ratio,
            }
          : closest,
      );

    everyStyle.forEach(([name, theme]) => {
      expect(pointerWashFailures(theme), name).toEqual([]);
    });
    // The tightest placement is the macOS dark press on its own hover, which the
    // derivation moves off the wash it replaces.
    expect(tightest.name).toBe("Dark · macOS");
    expect(tightest.pair).toBe("active on accent");
    expect(tightest.ratio).toBeGreaterThanOrEqual(decorativeFloor);
    expect(tightest.ratio).toBeCloseTo(1.0516, 3);
  });

  it("reports a stored theme that lost its wash as unmeasurable", () => {
    // A theme restored from storage can predate the role; the placement is
    // reported rather than skipped, the same rule every other contract follows.
    const stored = { colors: { ...lightTheme.colors, active: undefined } };

    expect(
      decorativeFailures(stored).filter(
        ({ surface }) => surface === "pointerWash",
      ),
    ).toEqual([
      expect.objectContaining({
        role: "active",
        over: "accent",
        ratio: undefined,
      }),
      expect.objectContaining({
        role: "active",
        over: "hover",
        ratio: undefined,
      }),
    ]);
  });

  it("reads the painters that wear the washes", () => {
    // The placements exist because three painters wear them: the components'
    // list row tints `accent` and presses `active`, the components' menu row
    // tints `hover` and presses `active`, and the primitives' recipe hands the
    // same two washes to a ghost action. The two component painters ask the
    // derivation for the press rather than the raw role, so the wash they
    // replace is named at the call site.
    const list = read("../../components/src/list.tsx");
    const menu = read("../../components/src/menu/item.tsx");
    const recipe = read("../../primitives/src/recipe/index.ts");

    expect(list).toContain("backgroundColor: theme.colors.accent");
    expect(list).toContain('pressWash(theme, "accent")');
    expect(list).not.toContain("backgroundColor: theme.colors.active");
    expect(menu).toContain("theme.colors.hover");
    expect(menu).toContain('pressWash(theme, "hover")');
    expect(menu).not.toContain("backgroundColor: theme.colors.active");
    expect(recipe).toContain("hover:bg-hover active:bg-active");
  });
});

describe("the catalogue's example", () => {
  it("reports the brand and passes the shipped theme", () => {
    expect(reportPointerWashes(lightTheme)).toEqual([]);
    expect(reportPointerWashes(flatPressBrand)).toEqual([]);
    expect(reportPointerWashes(invisiblePressBrand).length).toBeGreaterThan(0);
  });
});

describe("the pages that teach the wash", () => {
  it("names the helper, the states and the measurement", () => {
    // The assertions are booleans on purpose: a failure here prints the name
    // that is missing, not the whole catalogue.
    [catalogue, designSystem, inventory, readme].forEach((document) => {
      const text = document.replace(/\s+/g, " ");

      expect(text.includes("pointerWash"), "pointerWash").toBe(true);
      expect(text.includes("1.052:1"), "1.052:1").toBe(true);
    });
  });

  it("says the press is derived rather than painted from the role", () => {
    // The page has to teach the rule, not just name the helper: a reader who
    // only sees the name cannot tell what the derivation does.
    expect(
      catalogue
        .replace(/\s+/g, " ")
        .includes("smallest move toward the theme's `foreground`"),
    ).toBe(true);
  });
});
