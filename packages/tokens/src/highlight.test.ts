import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alpha, alphaOf, blend } from "./color.js";
import { contrastFloorsFor, contrastRatio } from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import {
  activeSeparation,
  invisibleHighlightBrand,
  lowHeadroomBrand,
  matchSeparation,
  reportHighlights,
  searchHighlight,
} from "./highlight.example.js";
import {
  findHighlight,
  highlightFailures,
  highlightShares,
  highlightSurfaces,
  type FindHighlightSource,
  type HighlightSurface,
} from "./highlight.js";
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
const readme = read("../README.md");
const inventory = read("../../../.agents/slop/COMPONENTS.md");

const inventoryRow = (title: string): string =>
  (
    inventory.split("\n").find((line) => line.startsWith(`| ${title} |`)) ?? ""
  ).replace(/\s+/g, " ");

const section = (heading: string): string => {
  const start = catalogue.indexOf(heading);
  const end = catalogue.indexOf("\n## ", start + 1);
  return catalogue.slice(start, end).replace(/\s+/g, " ");
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

const shareOf = (wash: string): number => alphaOf(wash);

const over = (theme: Theme, surface: HighlightSurface, wash: string): string =>
  blend(theme.colors[surface], wash, alphaOf(wash));

const runtimeDefault = (
  theme: Theme,
  surface: HighlightSurface,
  state: keyof typeof highlightShares,
): string =>
  blend(theme.colors[surface], theme.colors.primary, highlightShares[state]);

const withoutColour = (theme: Theme, role: keyof Theme["colors"]) => {
  const colors = { ...theme.colors };
  delete colors[role];
  return { colors };
};

const ratioOf = (
  foreground: string | undefined,
  background: string | undefined,
) =>
  foreground === undefined || background === undefined
    ? undefined
    : contrastRatio(foreground, background);

describe("the pair a theme can carry", () => {
  it("starts from the runtime's own strengths, not a second palette", () => {
    expect(highlightShares).toEqual({ match: 0.3, active: 0.65 });

    const wash = findHighlight(lightTheme);

    expect(wash.color).toBe(alpha(lightTheme.colors.primary, 0.3));
    expect(shareOf(wash.activeColor)).toBeGreaterThan(shareOf(wash.color));
  });

  it("keeps the matched run readable on every strip of every style", () => {
    const under = everyStyle.flatMap(([name, theme]) => {
      const floors = contrastFloorsFor(theme);
      const wash = findHighlight(theme);
      return highlightSurfaces.flatMap((surface) => {
        const match = over(theme, surface, wash.color);
        const active = over(theme, surface, wash.activeColor);
        const checks: ReadonlyArray<
          readonly [string, number | undefined, number]
        > = [
          [
            `${name} match on ${surface}`,
            ratioOf(match, theme.colors[surface]),
            decorativeFloor,
          ],
          [
            `${name} active on ${surface}`,
            ratioOf(active, theme.colors[surface]),
            decorativeFloor,
          ],
          [
            `${name} match text on ${surface}`,
            ratioOf(theme.colors.foreground, match),
            floors.body,
          ],
          [
            `${name} active text on ${surface}`,
            ratioOf(theme.colors.foreground, active),
            floors.secondary,
          ],
        ];
        return checks
          .filter(([, ratio, floor]) => ratio === undefined || ratio < floor)
          .map(
            ([label, ratio, floor]) => `${label}: ${ratio} (needs ${floor})`,
          );
      });
    });

    expect(under).toEqual([]);
    expect(
      everyStyle.filter(([, theme]) => highlightFailures(theme).length > 0),
    ).toEqual([]);
  });

  it("steps the resting match down where the runtime's 30% is under the body floor", () => {
    const under = everyStyle
      .map(([name, theme]) => ({
        name,
        theme,
        worst: Math.min(
          ...highlightSurfaces.map(
            (surface) =>
              ratioOf(
                theme.colors.foreground,
                runtimeDefault(theme, surface, "match"),
              ) ?? 0,
          ),
        ),
      }))
      .filter(({ worst }) => worst < contrastFloorsFor(lightTheme).body)
      .map(({ name, theme, worst }) => ({
        name,
        share: Number(shareOf(findHighlight(theme).color).toFixed(2)),
        worst: worst.toFixed(2),
      }));

    expect(under).toEqual([
      { name: "Dark · Linux", share: 0.22, worst: "6.14" },
      { name: "Dark · Windows", share: 0.27, worst: "6.54" },
      { name: "Dark · Windows XP (Luna)", share: 0.23, worst: "6.09" },
      { name: "Dark · Windows 7 (Aero)", share: 0.26, worst: "6.55" },
      { name: "Dark · Omarchy", share: 0.13, worst: "5.16" },
    ]);

    expect(
      everyStyle
        .filter(
          ([, theme]) =>
            Number(shareOf(findHighlight(theme).color).toFixed(2)) ===
            highlightShares.match,
        )
        .map(([name]) => name),
    ).toEqual(
      everyStyle
        .map(([name]) => name)
        .filter((name) => !under.some(({ name: stepped }) => stepped === name)),
    );
  });

  it("measures the runtime's active share under the body floor in every style", () => {
    const cells = everyStyle.flatMap(([name, theme]) =>
      highlightSurfaces.map((surface) => ({
        name,
        surface,
        ratio:
          ratioOf(
            theme.colors.foreground,
            runtimeDefault(theme, surface, "active"),
          ) ?? 0,
        floor: contrastFloorsFor(theme).body,
      })),
    );
    const under = cells.filter(({ ratio, floor }) => ratio < floor);
    const worst = cells.reduce((low, cell) =>
      cell.ratio < low.ratio ? cell : low,
    );

    expect(new Set(under.map(({ name }) => name)).size).toBe(everyStyle.length);
    expect(`${worst.name} ${worst.surface}`).toBe("Dark · Omarchy muted");
    expect(worst.ratio.toFixed(2)).toBe("2.72");

    const label = `${worst.name}'s \`${worst.surface}\` strip`;
    const printed = `${worst.ratio.toFixed(2)}:1`;
    const surfaces = [
      catalogue,
      readme,
      read("../../../.agents/slop/COMPONENTS.md"),
    ];

    surfaces.forEach((page, at) => {
      expect(page.replace(/\s+/g, " "), `surface ${at}`).toContain(label);
      expect(page.replace(/\s+/g, " "), `surface ${at}`).toContain(printed);
    });
  });

  it("tells the active match apart from the ones around it", () => {
    const apart = everyStyle.flatMap(([name, theme]) => {
      const wash = findHighlight(theme);
      return highlightSurfaces.map((surface) => ({
        name,
        surface,
        ratio:
          ratioOf(
            over(theme, surface, wash.activeColor),
            over(theme, surface, wash.color),
          ) ?? 0,
      }));
    });
    const tightest = apart.reduce((lowest, placement) =>
      placement.ratio < lowest.ratio ? placement : lowest,
    );

    expect(apart.every(({ ratio }) => ratio >= decorativeFloor)).toBe(true);

    expect(tightest.name).toBe("Dark · macOS");
    expect(tightest.surface).toBe("popover");
    expect(tightest.ratio.toFixed(3)).toBe("1.077");

    const printed = `${tightest.ratio.toFixed(3)}:1`;
    const surfaces: ReadonlyArray<readonly [string, string]> = [
      ["docs/tokens.md", section("## Find highlights")],
      [".agents/slop/COMPONENTS.md", inventoryRow("Find highlights")],
    ];
    surfaces.forEach(([name, page]) => {
      expect(page, name).toContain(printed);
      expect(page, name).toContain(tightest.name);
      expect(page, name).toContain(`\`${tightest.surface}\``);
      expect(page, name).not.toContain("1.150");
    });
  });

  it("returns the tightest corner the radius scale carries", () => {
    expect(findHighlight(lightTheme).radius).toBe(lightTheme.radius.sm);
    expect(findHighlight(retroTheme(themes.dark, "luna")).radius).toBe(1);
    expect(findHighlight(lightTheme).radius).not.toBe(2);
  });
});

describe("an accent the surfaces cannot carry", () => {
  it("reports a wash painted in the strip it marks", () => {
    const failures = highlightFailures(invisibleHighlightBrand);
    const invisible = failures.filter(({ kind }) => kind === "visibility");

    expect(invisible.map(({ state, surface }) => [state, surface])).toEqual(
      highlightSurfaces.flatMap((surface) =>
        (["match", "active"] as const).map((state) => [state, surface]),
      ),
    );
    expect(
      invisible.every(
        ({ ratio, floor }) => ratio !== undefined && ratio < floor,
      ),
    ).toBe(true);

    expect(
      failures
        .filter(({ kind }) => kind === "distinct")
        .map(({ surface }) => surface),
    ).toEqual([...highlightSurfaces]);
    expect(reportHighlights(invisibleHighlightBrand)).toContain(
      "match visibility on background: 1.00 (needs 1.05)",
    );
  });

  it("reports a body pair with no headroom for a wash", () => {
    const floors = contrastFloorsFor(lowHeadroomBrand);

    expect(
      contrastRatio(
        lowHeadroomBrand.colors.foreground,
        lowHeadroomBrand.colors.background,
      )?.toFixed(2),
    ).toBe("7.00");
    const lines = reportHighlights(lowHeadroomBrand);

    expect(lines).toContain("match legibility on background: 4.48 (needs 7)");
    expect(lines).toContain(
      `active legibility on background: 4.48 (needs ${floors.secondary})`,
    );
    expect(lines).toContain("active distinct on background: 1.00 (needs 1.05)");
  });

  it("holds a high-contrast accent to the variant's floors", () => {
    const high = highlightFailures({
      colors: withoutColour(highContrastLightTheme, "primary").colors,
      contrast: "high",
    });
    const standard = highlightFailures({
      colors: withoutColour(lightTheme, "primary").colors,
    });

    expect(
      high.every(
        ({ ratio, wash }) => ratio === undefined && wash === undefined,
      ),
    ).toBe(true);
    const floorsOf = (report: typeof high) =>
      new Set(
        report
          .filter(({ kind }) => kind === "legibility")
          .map(({ state, floor }) => `${state}:${floor}`),
      );

    expect(floorsOf(high)).toEqual(new Set(["active:7", "match:7"]));
    expect(floorsOf(standard)).toEqual(new Set(["active:4.5", "match:7"]));
  });

  it("reads a stored theme as absence rather than throwing", () => {
    expect(() => highlightFailures({ colors: {} })).not.toThrow();
    expect(
      highlightFailures({ colors: {} }).every(
        ({ ratio }) => ratio === undefined,
      ),
    ).toBe(true);

    const noPage = highlightFailures({ colors: { primary: "#5F4BDB" } });
    expect(noPage.every(({ wash }) => wash === undefined)).toBe(true);
  });

  it("reads a stored variant and a nulled scale without a cast", () => {
    const high: FindHighlightSource = {
      colors: withoutColour(lightTheme, "primary").colors,
      contrast: "HIGH",
    };
    const floors = new Set(
      highlightFailures(high)
        .filter(({ kind }) => kind === "legibility")
        .map(({ state, floor }) => `${state}:${floor}`),
    );
    expect(floors).toEqual(new Set(["active:7", "match:7"]));

    expect(
      findHighlight({
        colors: lightTheme.colors,
        radius: lightTheme.radius,
        contrast: "HIGH",
      }),
    ).toBeDefined();
    expect(
      findHighlight({ colors: lightTheme.colors, radius: null }),
    ).toBeUndefined();
  });
});

describe("the pair a stored theme cannot derive", () => {
  const absence = "lost the accent, the ink, a strip or the corner";

  it("answers no pair for a theme that lost a role it derives from, not a throw", () => {
    expect(findHighlight({})).toBeUndefined();

    const lost = (
      ["primary", "foreground", ...highlightSurfaces] as const
    ).filter((role) => {
      const stored = { ...lightTheme, ...withoutColour(lightTheme, role) };
      return findHighlight(stored) !== undefined;
    });

    expect(lost).toEqual([]);
    expect(findHighlight({ ...lightTheme, radius: undefined })).toBeUndefined();

    const unanswered = everyStyle
      .filter(([, theme]) => findHighlight(theme) === undefined)
      .map(([name]) => name);

    expect(unanswered).toEqual([]);
    expect(findHighlight(lightTheme)?.radius).toBe(lightTheme.radius.sm);
    expect(findHighlight(lightTheme)?.color).toBe(
      alpha(lightTheme.colors.primary, highlightShares.match),
    );

    const unansweredPages = [catalogue, readme, designSystem].filter(
      (page) => !page.includes(absence),
    ).length;

    expect(unansweredPages).toBe(0);
  });
});

describe("the call site a consumer copies", () => {
  it("hands a host the theme's pair and radius", () => {
    const spec = searchHighlight(darkTheme);

    expect(spec.color).toBe(alpha(darkTheme.colors.primary, 0.3));
    expect(spec.radius).toBe(darkTheme.radius.sm);
    expect(shareOf(spec.activeColor)).toBeGreaterThan(shareOf(spec.color));
  });

  it("measures the wash on the strip the host paints it over", () => {
    expect(matchSeparation(darkTheme, "card")?.toFixed(2)).toBe("1.88");
    expect(activeSeparation(darkTheme, "card")?.toFixed(2)).toBe("3.02");
  });
});

describe("what the pages teach", () => {
  const page = section("## Find highlights");

  it("names the contract, its shares and its strips", () => {
    expect(page).toContain("findHighlight");
    expect(page).toContain("highlightFailures");
    expect(page).toContain(`${highlightShares.match * 100}%`);
    expect(page).toContain(`${highlightShares.active * 100}%`);
    for (const surface of highlightSurfaces) {
      expect(page, surface).toContain(`\`${surface}\``);
    }
    expect(page).toContain("text/search.rs");
    expect(page).toContain("radius.sm");
  });

  it("states which floor each wash answers to, and the report the gate returns", () => {
    expect(page).toContain("secondary");
    expect(page).toContain("audit.highlight");
    expect(designSystem).toContain("findHighlight");
    expect(readme).toContain("findHighlight");
    expect(inventory).toContain("Find highlights");
  });

  it("prints the numbers the suite measures", () => {
    const worst = everyStyle
      .flatMap(([name, theme]) =>
        highlightSurfaces.map((surface) => ({
          name,
          surface,
          ratio:
            ratioOf(
              theme.colors.foreground,
              runtimeDefault(theme, surface, "active"),
            ) ?? 0,
        })),
      )
      .reduce((low, cell) => (cell.ratio < low.ratio ? cell : low));

    expect(page).toContain(worst.ratio.toFixed(2));
    expect(page).toContain("6.14");
    expect(page).toContain("1.077");
  });

  it("prints the case count this file runs", () => {
    const cases = read("./highlight.test.ts").match(/\bit\(/g)?.length ?? 0;

    expect(cases).toBeGreaterThan(10);
    expect(inventoryRow("Find highlights")).toContain(
      `\`highlight.test.ts\` (${cases} cases)`,
    );
  });

  it("names every style whose resting share the derivation steps", () => {
    const stepped = everyStyle
      .map(([name, theme]) => ({
        name: name.split(" · ").at(-1) ?? name,
        share: Math.round(shareOf(findHighlight(theme).color) * 100),
      }))
      .filter(({ share }) => share !== Math.round(highlightShares.match * 100));

    expect(stepped.map(({ share }) => share)).toEqual([22, 27, 23, 26, 13]);
    expect(page).toContain("Five dark styles step");
    expect(readme).toContain("five dark styles");
    const unprinted = stepped.flatMap(({ name, share }) =>
      [
        page.includes(name) ? [] : [`docs/tokens.md: ${name}`],
        page.includes(`**${share}%**`) ? [] : [`docs/tokens.md: ${share}%`],
        readme.includes(name) ? [] : [`README: ${name}`],
        readme.includes(`${share}%`) ? [] : [`README: ${share}%`],
      ].flat(),
    );
    expect(unprinted).toEqual([]);
  });

  it("tracks the adoption the component and the playground carry", () => {
    const wash = read("../../components/src/highlight-text/wash.ts");
    const search = [
      "../../../apps/playground/src/scenarios/search-highlights.tsx",
      "../../../apps/playground/src/scenarios/search-virtual-document.tsx",
    ].map(read);
    const probe = read("../../../apps/playground/src/live/find-highlight.ts");
    const checks = Number(
      /export const FIND_CHECKS = (\d+)/.exec(probe)?.[1] ?? Number.NaN,
    );

    expect(wash).toMatch(/findHighlight\(\s*\w+\s*\)/);
    expect(wash).toContain("input.color ?? derived.color");
    expect(wash).toContain("input.activeColor ?? derived.activeColor");
    expect(
      search
        .map((scenario) => scenario.includes("findHighlight(theme)"))
        .filter((spread) => !spread),
    ).toEqual([]);

    expect(page).toContain(
      "The shipped `HighlightText` takes the derived pair",
    );
    expect(page).toContain("`selection` role");
    expect(page).toContain(`${checks} checks`);
    expect(page).not.toContain("interlock row");
    expect(designSystem).toContain("`HighlightText` takes that pair");
    expect(designSystem).toContain(`${checks} checks`);
    expect(designSystem).not.toContain("still takes the `selection` role");
    expect(readme).toContain("`HighlightText` takes this pair as its default");
    expect(inventory).toContain(
      "the shipped `HighlightText` defaults to the pair",
    );
  });
});
