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
 * Measured on the eighteen shipped, high-contrast, platform and authored styles,
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
 *
 * The pages are read synchronously, like every guard in this package: the core
 * is deliberately dependency-free (no `effect` here), so the sources and the
 * documents a claim lives in are read from disk rather than through a service.
 */

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditTheme } from "./audit.js";
import { alphaOf, blend, type ThemeColors } from "./color.js";
import {
  contrastFloorsFor,
  contrastPairs,
  contrastRatio,
  type ContrastFloors,
} from "./contrast.js";
import {
  decorativeFailures,
  decorativeFloor,
  decorativeSurfaces,
  pointerWash,
  pointerWashFailures,
  pointerWashTransitions,
} from "./decorative.js";
import { elevationShadow } from "./elevation.js";
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
  extendTheme,
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

  it("records the derived press beside the placement", () => {
    // The table's own comment sent a reader to `TODO.md` for the two transitions
    // the derivation answers, so the placement read as a contract for a paint
    // nothing made. The source and the table have to agree.
    const source = readFileSync(
      new URL("./decorative.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("derived by `pointerWash`");
    expect(source).not.toContain("is recorded in `TODO.md`");
    expect(
      decorativeSurfaces.some(
        ({ surface, role, over }) =>
          surface === "stateWash" && role === "accent" && over === "selected",
      ),
    ).toBe(true);
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

  it("keeps the veil and every raised level visible over the press a row derives", () => {
    // A context menu, a confirmation dialog or a command palette opens **from**
    // the row the press landed on, so the veil recedes the press and each raised
    // level's shadow falls on it (`decorativeSurfaces` names the strip `active`).
    // The table names the role; the row wears the derived wash, whose step moves
    // toward `foreground` — the colour a veil is usually built from — so the
    // derived paint is where a veil has the least to work with, and nothing
    // measured the two together.
    const raised = [
      ...new Set(
        decorativeSurfaces.flatMap(({ surface, level }) =>
          surface === "elevation" && level !== undefined ? [level] : [],
        ),
      ),
    ];
    /** The ratio a veil or a level keeps against the press it is painted over. */
    const overPress = (press: string, painted: string): number | undefined =>
      contrastRatio(blend(press, painted, alphaOf(painted)), press);
    const measured = everyStyle.map(([name, theme]) => {
      const ratios = (["accent", "hover"] as const).flatMap((replaced) => {
        const press = pressWash(theme, replaced);
        if (press === undefined) {
          return [];
        }
        return [
          {
            placement: `${name}/${replaced}/veil`,
            ratio: overPress(press, theme.colors.overlay),
          },
          ...raised.map((level) => {
            const shadow = elevationShadow(theme, level);
            return {
              placement: `${name}/${replaced}/${level}`,
              ratio:
                shadow === undefined
                  ? undefined
                  : overPress(press, shadow.color),
            };
          }),
        ];
      });
      return { name, ratios };
    });
    const unmeasured = measured.flatMap(({ ratios }) =>
      ratios.flatMap(({ placement, ratio }) =>
        ratio === undefined ? [placement] : [],
      ),
    );
    const hidden = measured.flatMap(({ ratios }) =>
      ratios.flatMap(({ placement, ratio }) =>
        ratio !== undefined && ratio < decorativeFloor ? [placement] : [],
      ),
    );
    const tightest = measured
      .map(({ name, ratios }) => ({
        name,
        ratio: Math.min(...ratios.map(({ ratio }) => ratio ?? 0)),
      }))
      .reduce((closest, next) => (next.ratio < closest.ratio ? next : closest));

    expect(unmeasured).toEqual([]);
    expect(hidden).toEqual([]);
    // The tightest is the high-contrast dark press, where the veil has the least
    // room: the press is already the lightest wash in the palette.
    expect(tightest.name).toBe("High contrast dark");
    expect(tightest.ratio.toFixed(2)).toBe("1.08");

    // The case can fail: a brand whose shadow *is* the press it falls on casts no
    // shadow there, exactly the defect the placement measures.
    const press = pressWash(lightTheme, "accent");
    const flatShadow = extendTheme(lightTheme, {
      colors: { shadow: press ?? lightTheme.colors.shadow },
    });
    const flatPaint = elevationShadow(flatShadow, "lg")?.color;
    expect(press).toBeDefined();
    expect(flatPaint).toBeDefined();
    expect(
      press !== undefined && flatPaint !== undefined
        ? overPress(press, flatPaint)
        : undefined,
    ).toBe(1);
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
    // The placements exist because every row the library paints wears them: the
    // components' list row tints `accent` and presses past it, its menu row and
    // `Collapsible` trigger tint `hover` and press past that, and the data
    // package's table and tree rows wear both transitions — a chosen row derives
    // over `accent`, a pointed one over `hover`. Every one of them asks the
    // derivation rather than painting the raw `active` role.
    const list = read("../../components/src/list.tsx");
    const menu = read("../../components/src/menu/item.tsx");
    const collapsible = read("../../components/src/collapsible.tsx");
    const recipe = read("../../primitives/src/recipe/index.ts");
    const table = read("../../data/src/table/table.tsx");
    const tree = read("../../data/src/tree/row.tsx");

    expect(list).toContain("backgroundColor: theme.colors.accent");
    expect(list).toContain('pressWash(theme, "accent")');
    expect(list).not.toContain("backgroundColor: theme.colors.active");
    expect(menu).toContain("theme.colors.hover");
    expect(menu).toContain('pressWash(theme, "hover")');
    expect(menu).not.toContain("backgroundColor: theme.colors.active");
    expect(collapsible).toContain('pressWash(theme, "hover")');
    expect(recipe).toContain("hover:bg-hover active:bg-active");
    // The data package's two workspace rows read the helper directly: a chosen
    // row repaints over the `accent` it hovers with and a pointed one over
    // `hover`, and neither falls back to the raw role while it can derive.
    [table, tree].forEach((source, index) => {
      const name = index === 0 ? "table/table.tsx" : "tree/row.tsx";

      expect(source, name).toContain('pointerWash(theme, "active", "accent")');
      expect(source, name).toContain('pointerWash(theme, "active", "hover")');
      expect(source, name).toContain("?? theme.colors.active");
    });
  });

  it("names every package whose rows derive the press", () => {
    // The adopters are what makes the placements live, and both pages taught them
    // as two packages' work long after the data package's table and tree rows
    // asked for the helper — the README even said the raw roles were what a row
    // painted "until a row asks". The set is derived from the sources, so a
    // fourth package adopting the helper has to be named, and the two workspace
    // rows are required by name because they are the newest adopters.
    const packageSources = (name: string): ReadonlyArray<[string, string]> => {
      const root = new URL(`../../${name}/src/`, import.meta.url).pathname;
      return readdirSync(root, { recursive: true, withFileTypes: true })
        .filter(
          (entry) =>
            entry.isFile() &&
            /\.(ts|tsx)$/.test(entry.name) &&
            !/\.(test|example)\./.test(entry.name),
        )
        .map((entry) => {
          const file = `${entry.parentPath}/${entry.name}`;
          return [file.slice(root.length), readFileSync(file, "utf8")] as const;
        });
    };
    const packages = ["components", "primitives", "data"] as const;
    const adopters = packages.flatMap((name) => {
      const calls = packageSources(name).filter(([, source]) =>
        /pointerWash\(|pressWash\(/.test(source),
      );
      return calls.length === 0 ? [] : [{ name, calls }];
    });

    // The premise: each package paints a row and asks for the derivation.
    expect(adopters.map(({ name }) => name)).toEqual([...packages]);

    // The catalogue names a file from each adopter's own tree, so a package
    // cannot adopt the helper while the page describes two packages' work.
    adopters.forEach(({ name, calls }) => {
      const named = calls.some(([path]) =>
        catalogue.replace(/\s+/g, " ").includes(path),
      );

      expect(named, `docs/tokens.md does not name a ${name} painter`).toBe(
        true,
      );
    });

    // The README and the inventory name the two workspace rows — the adopters
    // that were missing — and no page returns to the claim that none asks.
    [readme, inventory, catalogue, designSystem].forEach((document, index) => {
      const page = [
        "packages/tokens/README.md",
        "COMPONENTS.md",
        "docs/tokens.md",
        "docs/design-system.md",
      ][index];
      const text = document.replace(/\s+/g, " ");

      expect(
        text.includes("until a row asks for the helper"),
        `${page} still says no row asks`,
      ).toBe(false);
    });

    [readme, inventory].forEach((document, index) => {
      const page = ["packages/tokens/README.md", "COMPONENTS.md"][index];
      const text = document.replace(/\s+/g, " ");

      expect(text.includes("`TableRow`"), `${page} TableRow`).toBe(true);
      expect(text.includes("`TreeRow`"), `${page} TreeRow`).toBe(true);
    });

    expect(
      inventory.replace(/\s+/g, " ").includes("still the open half"),
      "COMPONENTS.md still calls a primitives recipe the open half",
    ).toBe(false);
    expect(
      designSystem.replace(/\s+/g, " ").includes("both packages derive it"),
      "docs/design-system.md still says two packages derive the press",
    ).toBe(false);
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

  it("says the painters derive it, and that the veil sits on the derived paint", () => {
    // The pages taught the derivation as an owed painter change until both
    // packages adopted it; a reader following that sentence duplicates a paint
    // that is already wired. The veil and the shadow are measured on the derived
    // wash rather than the role, which is the composition this suite measures.
    [catalogue, designSystem].forEach((document, page) => {
      const text = document.replace(/\s+/g, " ");
      const name = page === 0 ? "docs/tokens.md" : "docs/design-system.md";

      expect(text.includes('pressWash(theme, "accent")'), name).toBe(true);
      expect(text.includes("1.08:1"), name).toBe(true);
      expect(
        text.includes("until a row asks for the helper") ||
          text.includes("The painters are the components' workstreams"),
        name,
      ).toBe(false);
    });
  });
});

/** How a count reads in prose: the pages print the set in words, or in digits. */
const spoken = [
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
] as const;

/** A document with its wrapping removed, so a phrase is one line. */
const flat = (document: string): string => document.replace(/\s+/g, " ");

describe("the arithmetic the press prints", () => {
  /**
   * Every press before the derivation: the role against the wash it replaces.
   *
   * One entry per placement a theme answers with nothing — the measurement the
   * pages report as "the raw press was invisible in six".
   */
  const rawMisses = everyStyle.flatMap(([name, theme]) =>
    pointerWashTransitions.flatMap(({ wash, replaced }) => {
      const ratio = contrastRatio(theme.colors[wash], theme.colors[replaced]);
      return ratio === undefined || ratio < decorativeFloor
        ? [{ name, wash, replaced }]
        : [];
    }),
  );

  /** The styles that miss on any transition — the count the pages print. */
  const misfitStyles = [...new Set(rawMisses.map(({ name }) => name))];

  /** The set the sweep walks, built the way `everyStyle` builds it. */
  const styles = 4 + platformNames.length * 2 + retroNames.length * 2;

  it("counts the styles its sweep walks, not the set before the third look", () => {
    // The bug this holds: the Omarchy look added two styles and this suite's
    // sweep grew to eighteen, while the seam's JSDoc and this file's own header
    // still told a reader sixteen — the denominator the pages had already
    // moved. A count a document prints is derived from the list the sweep
    // builds, never retyped from the release it was written in.
    expect(everyStyle).toHaveLength(styles);
    expect(spoken[styles]).toBe("eighteen");

    expect(read("./decorative.ts")).toContain(
      `six of the ${spoken[styles]} shipped styles`,
    );
    expect(read("./pointer-wash.test.ts")).toContain(
      `the ${spoken[styles]} shipped, high-contrast, platform and authored styles`,
    );
  });

  it("prints the set and the count it measures on every page that teaches it", () => {
    const count = spoken[misfitStyles.length];
    const pages: ReadonlyArray<readonly [string, string, string]> = [
      ["docs/tokens.md", catalogue, `invisible in **${count}** of them`],
      ["docs/design-system.md", designSystem, `invisible in **${count}**`],
      ["packages/tokens/README.md", readme, `invisible in **${count}**`],
      [
        "COMPONENTS.md",
        inventory,
        `invisible in **${count}** of the ${spoken[styles]} shipped styles`,
      ],
    ];

    pages.forEach(([page, document, phrase]) => {
      expect(flat(document), page).toContain(phrase);
    });

    // The numeral form three of them print beside the word form.
    [catalogue, designSystem, readme].forEach((document, page) => {
      const name = [
        "docs/tokens.md",
        "docs/design-system.md",
        "packages/tokens/README.md",
      ][page];

      expect(flat(document), name).toContain(
        `${styles} shipped, high-contrast, platform and authored styles`,
      );
    });
  });

  it("marks the repaired palette's figure as the set it was measured on", () => {
    // Eleven of the sixteen was measured before the palettes moved and before
    // Omarchy shipped, and today every one of the eighteen carries a step. A
    // reader must not take the historical count for the current sweep, so the
    // four documents state the set it belongs to.
    [catalogue, designSystem, readme, inventory].forEach((document, page) => {
      const name = [
        "docs/tokens.md",
        "docs/design-system.md",
        "packages/tokens/README.md",
        "COMPONENTS.md",
      ][page];
      const text = flat(document);

      expect(text, name).toContain("that shipped at the time");
      expect(text, name).not.toContain("eleven of the sixteen shipped styles");
      expect(text, name).not.toContain("six of the sixteen");
      expect(text, name).not.toContain("over the sixteen shipped");
    });
  });
});
