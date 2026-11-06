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
const inventory = read("../../../.agents/slop/COMPONENTS.md");
const readme = read("../README.md");

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
    expect(pointerWashTransitions).toEqual([
      { wash: "accent", replaced: "selected" },
      { wash: "active", replaced: "accent" },
      { wash: "active", replaced: "hover" },
    ]);
  });

  it("records the derived press beside the placement", () => {
    expect(
      decorativeSurfaces.some(
        ({ surface, role, over }) =>
          surface === "stateWash" && role === "accent" && over === "selected",
      ),
    ).toBe(true);
  });

  it("paints a palette that already answers the pointer as it is", () => {
    expect(pointerWash(lightTheme, "active", "accent")).toBe(
      lightTheme.colors.active,
    );
    expect(
      contrastRatio(lightTheme.colors.active, lightTheme.colors.accent),
    ).toBeGreaterThanOrEqual(decorativeFloor);
  });

  it("separates a press that is the wash it replaces", () => {
    expect(flatPressBrand.colors.active).toBe(flatPressBrand.colors.accent);
    expect(
      contrastRatio(flatPressBrand.colors.active, flatPressBrand.colors.accent),
    ).toBeCloseTo(1, 3);

    const derived = pressWash(flatPressBrand, "accent");

    expect(derived).toBeDefined();
    expect(derived).not.toBe(flatPressBrand.colors.accent);
    expect(pressSeparation(flatPressBrand, "accent")).toBeGreaterThanOrEqual(
      decorativeFloor,
    );
  });

  it("keeps the labels the wash plays at their floor", () => {
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
    const failures = pointerWashFailures(invisiblePressBrand);

    expect(
      failures.filter(({ over }) => over === "accent").length,
    ).toBeGreaterThan(0);
    expect(failures[0]?.surface).toBe("pointerWash");
    expect(failures[0]?.ratio).toBeCloseTo(1, 3);
  });

  it("fails the gate on that brand, through the decorative report", () => {
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

    expect(tightest.name).toBe("Dark · macOS");
    expect(tightest.pair).toBe("active on accent");
    expect(tightest.ratio).toBeGreaterThanOrEqual(decorativeFloor);
    expect(tightest.ratio).toBeCloseTo(1.0516, 3);
  });

  it("keeps the veil and every raised level visible over the press a row derives", () => {
    const raised = [
      ...new Set(
        decorativeSurfaces.flatMap(({ surface, level }) =>
          surface === "elevation" && level !== undefined ? [level] : [],
        ),
      ),
    ];

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

    const cells = measured.flatMap(({ ratios }) => ratios);
    expect(cells).toHaveLength(everyStyle.length * 2 * (1 + raised.length));

    expect(tightest.name).toBe("High contrast dark");
    expect(tightest.ratio.toFixed(2)).toBe("1.08");

    expect(flat(catalogue)).toContain(`All ${cells.length} placements`);
    expect(flat(designSystem)).toContain(`all ${cells.length} placements`);
    const pages: ReadonlyArray<readonly [string, string]> = [
      ["docs/tokens.md", catalogue],
      ["docs/design-system.md", designSystem],
    ];
    pages.forEach(([name, document]) => {
      expect(flat(document), name).not.toContain("128 placements");
    });

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

    [table, tree].forEach((source, index) => {
      const name = index === 0 ? "table/table.tsx" : "tree/row.tsx";

      expect(source, name).toContain('pointerWash(theme, "active", "accent")');
      expect(source, name).toContain('pointerWash(theme, "active", "hover")');
      expect(source, name).toMatch(/\?\?\s*(\w+\.)*active\b/);
    });
  });

  it("names every package whose rows derive the press", () => {
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

    expect(adopters.map(({ name }) => name)).toEqual([...packages]);

    adopters.forEach(({ name, calls }) => {
      const named = calls.some(([path]) =>
        catalogue.replace(/\s+/g, " ").includes(path),
      );

      expect(named, `docs/tokens.md does not name a ${name} painter`).toBe(
        true,
      );
    });

    [readme, inventory, catalogue, designSystem].forEach((document, index) => {
      const page = [
        "packages/tokens/README.md",
        ".agents/slop/COMPONENTS.md",
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
      const page = ["packages/tokens/README.md", ".agents/slop/COMPONENTS.md"][
        index
      ];
      const text = document.replace(/\s+/g, " ");

      expect(text.includes("`TableRow`"), `${page} TableRow`).toBe(true);
      expect(text.includes("`TreeRow`"), `${page} TreeRow`).toBe(true);
    });

    expect(
      inventory.replace(/\s+/g, " ").includes("still the open half"),
      ".agents/slop/COMPONENTS.md still calls a primitives recipe the open half",
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
    [catalogue, designSystem, inventory, readme].forEach((document) => {
      const text = document.replace(/\s+/g, " ");

      expect(text.includes("pointerWash"), "pointerWash").toBe(true);
      expect(text.includes("1.052:1"), "1.052:1").toBe(true);
    });
  });

  it("says the press is derived rather than painted from the role", () => {
    expect(
      catalogue
        .replace(/\s+/g, " ")
        .includes("smallest move toward the theme's `foreground`"),
    ).toBe(true);
  });

  it("says the painters derive it, and that the veil sits on the derived paint", () => {
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

const flat = (document: string): string => document.replace(/\s+/g, " ");

describe("the arithmetic the press prints", () => {
  const rawMisses = everyStyle.flatMap(([name, theme]) =>
    pointerWashTransitions.flatMap(({ wash, replaced }) => {
      const ratio = contrastRatio(theme.colors[wash], theme.colors[replaced]);
      return ratio === undefined || ratio < decorativeFloor
        ? [{ name, wash, replaced }]
        : [];
    }),
  );

  const misfitStyles = [...new Set(rawMisses.map(({ name }) => name))];

  const styles = 4 + platformNames.length * 2 + retroNames.length * 2;

  it("counts the styles its sweep walks, not the set before the third look", () => {
    expect(everyStyle).toHaveLength(styles);
    expect(spoken[styles]).toBe("eighteen");
  });

  it("prints the set and the count it measures on every page that teaches it", () => {
    const count = spoken[misfitStyles.length];
    const pages: ReadonlyArray<readonly [string, string, string]> = [
      ["docs/tokens.md", catalogue, `invisible in **${count}** of them`],
      ["docs/design-system.md", designSystem, `invisible in **${count}**`],
      ["packages/tokens/README.md", readme, `invisible in **${count}**`],
      [
        ".agents/slop/COMPONENTS.md",
        inventory,
        `invisible in **${count}** of the ${spoken[styles]} shipped styles`,
      ],
    ];

    pages.forEach(([page, document, phrase]) => {
      expect(flat(document), page).toContain(phrase);
    });

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
    [catalogue, designSystem, readme, inventory].forEach((document, page) => {
      const name = [
        "docs/tokens.md",
        "docs/design-system.md",
        "packages/tokens/README.md",
        ".agents/slop/COMPONENTS.md",
      ][page];
      const text = flat(document);

      expect(text, name).toContain("that shipped at the time");
      expect(text, name).not.toContain("eleven of the sixteen shipped styles");
      expect(text, name).not.toContain("six of the sixteen");
      expect(text, name).not.toContain("over the sixteen shipped");
    });
  });
});
