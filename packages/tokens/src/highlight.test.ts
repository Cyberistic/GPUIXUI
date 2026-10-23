/**
 * Guards the wash a find bar paints.
 *
 * GPUix marks a search's matches with a **wash behind the text**, and a host
 * given no colour paints the runtime theme's `accent` at **30%** for every match
 * and **65%** for the active one, with a **2px** corner
 * (`packages/native/src/text/search.rs` at the pinned `@gpuix/native@0.11.0`).
 * A library application passes no window theme, so that accent is the runtime's
 * built-in violet — the one text surface still painted from a palette this
 * package does not own. Measured over the sixteen shipped, high-contrast,
 * platform and authored styles, the 65% active wash left body text under the
 * 7:1 floor in **all fourteen** (3.05:1 on Windows dark's popover) and the
 * resting 30% wash was under it in four dark ones (Dark · Linux 6.14:1 on its
 * popover), so a reader's own query could hide the result they searched for.
 * `findHighlight` derives the pair the theme can carry and
 * `highlightFailures` reports an accent that cannot.
 */

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
const inventory = read("../../../COMPONENTS.md");

/** One `## ` section of the catalogue, whitespace flattened. */
const section = (heading: string): string => {
  const start = catalogue.indexOf(heading);
  const end = catalogue.indexOf("\n## ", start + 1);
  return catalogue.slice(start, end).replace(/\s+/g, " ");
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

/** The share a derived wash carries, read back from its alpha channel. */
const shareOf = (wash: string): number => alphaOf(wash);

/** The colour a reader sees where a wash meets a strip. */
const over = (theme: Theme, surface: HighlightSurface, wash: string): string =>
  blend(theme.colors[surface], wash, alphaOf(wash));

/** What a host paints when nobody names a colour: the runtime's own default. */
const runtimeDefault = (
  theme: Theme,
  surface: HighlightSurface,
  state: keyof typeof highlightShares,
): string =>
  blend(theme.colors[surface], theme.colors.primary, highlightShares[state]);

/** A role a store did not save is absent, not `undefined`-keyed. */
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
    // The pair is the theme's accent family: a brand's hue reaches a find bar
    // the way it reaches every other mark.
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

    // The derivation holds by construction; this is the proof, not the report,
    // and the report is empty for the same reason.
    expect(under).toEqual([]);
    expect(
      everyStyle.filter(([, theme]) => highlightFailures(theme).length > 0),
    ).toEqual([]);
  });

  it("steps the resting match down where the runtime's 30% is under the body floor", () => {
    // The four dark styles the default share left under 7:1, read from the
    // runtime's own pair. The worst is Dark · Linux's popover.
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
      { name: "Dark · Windows", share: 0.26, worst: "6.33" },
      { name: "Dark · Windows XP (Luna)", share: 0.23, worst: "6.09" },
      { name: "Dark · Windows 7 (Aero)", share: 0.26, worst: "6.55" },
    ]);
    // Every other style keeps the runtime's 30%: the step is the exception.
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
    // Printed on the catalogue: the high-contrast dark pair is the closest.
    expect(tightest.name).toBe("High contrast dark");
    expect(tightest.surface).toBe("muted");
    expect(tightest.ratio.toFixed(3)).toBe("1.150");
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

    // Both states are the strip itself on the page it shares (1.00:1), and
    // every other strip is a step away at most — none of them can show a match.
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
    // The active match cannot stand apart either, because there is only one
    // colour left to paint.
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
    // The pair itself passes the contrast contract at 7.00:1 — the wash is the
    // only thing that cannot fit behind it.
    expect(
      contrastRatio(
        lowHeadroomBrand.colors.foreground,
        lowHeadroomBrand.colors.background,
      )?.toFixed(2),
    ).toBe("7.00");
    const lines = reportHighlights(lowHeadroomBrand);

    // The strongest wash that is still visible drops the text to 4.48:1, and
    // no stronger one can be told apart from it, so every job is reported.
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

    // A missing role is the absence it is: every placement is unmeasurable,
    // and the floors the report was holding it to are still named.
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
    // A theme with the accent but no page is just as absent: the strip it
    // would be painted on is the missing half.
    const noPage = highlightFailures({ colors: { primary: "#5F4BDB" } });
    expect(noPage.every(({ wash }) => wash === undefined)).toBe(true);
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
    // The page the playground's search probes paint over a card.
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

  it("states which floor each wash answers to, and where it sits beside the gate", () => {
    expect(page).toContain("secondary");
    expect(page).toContain("beside the gate");
    expect(designSystem).toContain("findHighlight");
    expect(readme).toContain("findHighlight");
    expect(inventory).toContain("Find highlights");
  });

  it("prints the numbers the suite measures", () => {
    // The runtime's own active share on the worst style, and the closest the
    // derived pair gets to being indistinguishable.
    expect(page).toContain("3.05");
    expect(page).toContain("6.14");
    expect(page).toContain("1.150");
  });
});
