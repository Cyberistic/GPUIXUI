import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alphaOf, blend, isColorRole, lightColors, palette } from "./color.js";
import {
  contrastFloors,
  contrastRatio,
  highContrastFloors,
} from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import { selectionFailures, selectionOn, selectionPairs } from "./selection.js";
import {
  invisibleSelectionBrand,
  report,
  selectionWashesAreReadable,
  tintSelectionWashes,
  unreadableSelectionBrand,
} from "./selection.example.js";
import { statusTones } from "./styles.js";
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

const shippedThemes = [
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  highContrastDarkTheme,
] as const;

const platformThemes = platformNames.flatMap((name) => [
  platformTheme(themes.light, name),
  platformTheme(themes.dark, name),
]);

const retroThemes = retroNames.flatMap((look) => [
  retroTheme(themes.light, look),
  retroTheme(themes.dark, look),
]);

const measured = (over: string): boolean =>
  selectionPairs.some((pair) => pair.background === over);

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const everySurface = (): Readonly<Record<string, string>> => ({
  "docs/tokens.md": read("../../../docs/tokens.md"),
  "docs/design-system.md": read("../../../docs/design-system.md"),
  "packages/tokens/README.md": read("../README.md"),
  ".agents/slop/COMPONENTS.md": read("../../../.agents/slop/COMPONENTS.md"),
});

const flat = (text: string): string => text.replace(/\s+/g, " ");

const restingText: Readonly<Record<string, string>> = {
  input: "inputForeground",
  background: "foreground",
  card: "cardForeground",
  popover: "popoverForeground",
  muted: "foreground",
};

const secondarySurfaces = ["background", "card", "popover"] as const;

describe("the pairs a selection is measured on", () => {
  it("covers every content surface body text is selected from", () => {
    const missing = Object.keys(restingText).filter((over) => !measured(over));

    expect(missing).toEqual([]);
  });

  it("keeps the text role each surface already carries", () => {
    const wrong = selectionPairs
      .filter(({ foreground }) => foreground !== "mutedForeground")
      .filter(
        ({ background, foreground }) => restingText[background] !== foreground,
      )
      .map(({ background }) => background);

    expect(wrong).toEqual([]);
  });

  it("measures secondary text on every prose surface at its own floor", () => {
    const secondary = selectionPairs.filter(
      ({ foreground }) => foreground === "mutedForeground",
    );

    expect(secondary.map(({ background }) => background)).toEqual([
      ...secondarySurfaces,
    ]);
    expect(secondary.map(({ floor }) => floor)).toEqual([
      "secondary",
      "secondary",
      "secondary",
    ]);
  });
});

describe("every theme the library ships", () => {
  it("keeps its selection visible and its text readable", () => {
    [...shippedThemes, ...platformThemes, ...retroThemes].forEach((theme) => {
      expect(selectionFailures(theme), theme.name).toEqual([]);
    });
  });

  it("is a real set, so a scan that stopped iterating cannot pass", () => {
    expect(
      shippedThemes.length + platformThemes.length + retroThemes.length,
    ).toBeGreaterThanOrEqual(16);
  });

  it("keeps the tightest bubble readable and prints that ratio", () => {
    const ratios = [...shippedThemes, ...platformThemes, ...retroThemes].map(
      (theme) => {
        const wash = blend(
          theme.colors.muted,
          theme.colors.selection,
          alphaOf(theme.colors.selection),
        );
        return contrastRatio(theme.colors.foreground, wash) ?? 0;
      },
    );
    const tightest = Math.min(...ratios);

    expect(tightest).toBeCloseTo(7.2, 2);
    Object.entries(everySurface()).forEach(([document, text]) => {
      expect(flat(text), document).toContain(`${tightest.toFixed(2)}:1`);

      expect(flat(text), document).toContain("6.74:1");
    });
  });
});

describe("selectionFailures", () => {
  it("reports the wash Linux dark shipped before this contract existed", () => {
    const before = {
      colors: {
        ...platformTheme(themes.dark, "linux").colors,
        selection: "#78AEED4D",
      },
    };
    const failure = selectionFailures(before).find(
      ({ kind, background }) => kind === "legibility" && background === "card",
    );

    expect(failure?.floor).toBe(7);
    expect(failure?.ratio).toBeCloseTo(6.63, 2);
  });

  it("reports the wash Aero dark painted over its own message bubble", () => {
    const before = {
      colors: {
        ...retroTheme(themes.dark, "aero").colors,
        selection: "#5FB6F24D",
      },
    };
    const failure = selectionFailures(before).find(
      ({ kind, background }) => kind === "legibility" && background === "muted",
    );

    expect(failure?.floor).toBe(7);
    expect(failure?.ratio).toBeCloseTo(6.74, 2);
    expect(selectionFailures(retroTheme(themes.dark, "aero"))).toEqual([]);
  });

  it("holds the pair to the bubble that paints it", () => {
    const recipes = read("../../tw/src/recipes.ts");
    const style = read("../../primitives/src/core/style.ts");

    expect(recipes).toContain('muted: "bg-muted text-foreground"');
    expect(style).toContain('muted: (theme) => colorRole(theme, "muted")');
    expect(style).toContain(
      'style.selectionColor = colorRole(theme, "selection");',
    );
  });

  it("reports a wash that hides the text it selects", () => {
    const failures = selectionFailures(unreadableSelectionBrand);

    expect(failures.map(({ kind }) => kind)).toEqual([
      "legibility",
      "legibility",
      "legibility",
      "legibility",
      "legibility",
      "legibility",
      "legibility",
      "legibility",
    ]);
    expect(failures.map(({ background }) => background)).toEqual([
      "input",
      "background",
      "card",
      "popover",
      "muted",
      "background",
      "card",
      "popover",
    ]);
  });

  it("reports secondary text the wash buries, which its resting pair passes", () => {
    const before = {
      colors: {
        ...platformTheme(themes.light, "darwin").colors,
        mutedForeground: palette.neutral[600],
      },
    };
    const resting = platformTheme(themes.light, "darwin").colors;
    const failure = selectionFailures(before).find(
      ({ foreground, background }) =>
        foreground === "mutedForeground" && background === "background",
    );

    expect(failure?.kind).toBe("legibility");
    expect(failure?.floor).toBe(contrastFloors.secondary);
    expect(failure?.ratio).toBeCloseTo(4.3, 1);

    expect(
      contrastRatio(resting.mutedForeground, resting.background),
    ).toBeGreaterThanOrEqual(contrastFloors.secondary);
  });

  it("reports a wash the reader cannot find", () => {
    const failures = selectionFailures(invisibleSelectionBrand);

    expect(failures.map(({ kind }) => kind)).toEqual([
      "visibility",
      "visibility",
      "visibility",
      "visibility",
      "visibility",
      "visibility",
      "visibility",
      "visibility",
    ]);
    failures.forEach(({ ratio, floor }) => {
      expect(ratio).toBe(1);
      expect(floor).toBe(decorativeFloor);
    });
  });

  it("reports a surface it cannot measure rather than skipping it", () => {
    const broken = {
      colors: { ...lightColors, background: "#F6F8FA80" },
    };
    const failure = selectionFailures(broken).find(
      ({ kind, background }) =>
        kind === "visibility" && background === "background",
    );

    expect(failure).toBeDefined();
    expect(failure?.ratio).toBeUndefined();
  });

  it("takes a floor set, so a stricter brand can run the check it needs", () => {
    const strict = { body: 21, secondary: 21, boundary: 21, disabled: 21 };

    expect(selectionFailures(lightTheme, strict).length).toBe(
      selectionPairs.length,
    );
  });

  it("passes the default floors a theme with no variant declares", () => {
    expect(selectionFailures(lightTheme, contrastFloors)).toEqual([]);
  });
});

describe("the documented example", () => {
  it("passes the shipped theme and reports both broken brands", () => {
    expect(selectionWashesAreReadable(lightTheme)).toBe(true);
    expect(selectionWashesAreReadable(unreadableSelectionBrand)).toBe(false);
    expect(selectionWashesAreReadable(invisibleSelectionBrand)).toBe(false);
    expect(report(lightTheme)).toEqual([]);
    expect(report(unreadableSelectionBrand)).toContain(
      "legibility: cardForeground on card is 1.00",
    );
    expect(report(invisibleSelectionBrand)).toContain(
      "visibility: foreground on background is 1.00",
    );
  });
});

describe("the documents describe the contract they are held to", () => {
  it("documents the check, every floor and the surfaces", () => {
    const catalogue = read("../../../docs/tokens.md");
    const design = read("../../../docs/design-system.md");
    const readme = read("../README.md");

    expect(catalogue).toContain("selectionFailures");
    expect(catalogue).toContain("## Text selection");
    expect(catalogue).toContain(`${decorativeFloor}:1`);

    expect(catalogue).toContain("message bubble");
    expect(catalogue).toContain("BUBBLE_VARIANTS.muted");
    expect(design).toContain("message bubble");
    expect(readme).toContain("message bubble");

    expect(catalogue).toContain("mutedForeground");
    expect(catalogue).toContain(`${contrastFloors.secondary}:1`);
    expect(catalogue).toContain(lightColors.mutedForeground);
    expect(design).toContain("selection wash");
    expect(design).toContain("secondary text inside the selection wash");
    expect(readme).toContain("mutedForeground");
    expect(readme).toContain(lightColors.mutedForeground);
  });
});

describe("the tones the wash is painted on", () => {
  const style = read("../../primitives/src/core/style.ts");
  const declared = [
    ...(
      /\bSURFACE_TONES = \[([\s\S]*?)\] as const/.exec(style)?.[1] ?? ""
    ).matchAll(/"([a-z]+)"/g),
  ].flatMap(([, tone]) => (tone === undefined ? [] : [tone]));

  const contentTones = [
    "background",
    "card",
    "popover",
    "muted",
    "accent",
    "selected",
  ] as const;

  const washedTones = ["background", "card", "popover", "muted"] as const;

  const saturatedTones = ["accent", "selected"] as const;

  const excludedPairs = [
    { foreground: "foreground", over: "accent", floor: "body" },
    { foreground: "foreground", over: "selected", floor: "body" },
    { foreground: "mutedForeground", over: "accent", floor: "secondary" },
    { foreground: "mutedForeground", over: "selected", floor: "secondary" },
    { foreground: "selectedForeground", over: "selected", floor: "body" },
  ] as const;

  const tones = (all: ReadonlyArray<string>, measured: ReadonlyArray<string>) =>
    all.filter((tone) => !measured.includes(tone));

  const measuredOn: ReadonlyArray<string> = [...washedTones];

  const placements = [
    ...shippedThemes,
    ...platformThemes,
    ...retroThemes,
  ].flatMap((theme) =>
    excludedPairs.map(({ foreground, over, floor }) => {
      const wash = blend(
        theme.colors[over],
        theme.colors.selection,
        alphaOf(theme.colors.selection),
      );
      const floors =
        theme.contrast === "high" ? highContrastFloors : contrastFloors;
      return {
        theme: theme.name,
        pair: `${foreground} on ${over}`,
        resting:
          contrastRatio(theme.colors[foreground], theme.colors[over]) ?? 0,
        washed: contrastRatio(theme.colors[foreground], wash) ?? 0,
        floor: floors[floor],
      };
    }),
  );

  it("reads the tones the container resolves from", () => {
    expect(declared).toEqual(["none", ...contentTones, "skeleton"]);
  });

  it("measures the wash on every neutral content tone", () => {
    expect(measuredOn).toEqual([...washedTones]);

    expect(tones(contentTones, measuredOn)).toEqual([...saturatedTones]);
    expect(tones([...contentTones, "secondary"], measuredOn)).toEqual([
      ...saturatedTones,
      "secondary",
    ]);
  });

  it("loses contrast on a saturated tone in every style", () => {
    const improved = placements.filter(
      ({ resting, washed }) => washed >= resting,
    );

    expect(placements.length).toBe(
      [...shippedThemes, ...platformThemes, ...retroThemes].length *
        excludedPairs.length,
    );

    expect(improved).toEqual([]);
  });

  it("leaves most of them under the floor they were already promised", () => {
    const under = placements.filter(({ washed, floor }) => washed < floor);

    const tightest = placements.reduce((a, b) => (b.washed < a.washed ? b : a));
    const tightestBody = placements
      .filter(({ floor }) => floor === 7)
      .reduce((a, b) => (b.washed < a.washed ? b : a));

    expect(under.length).toBe(43);
    expect(tightest.pair).toBe("mutedForeground on selected");
    expect(tightest.theme).toBe("Light · Omarchy");
    expect(tightest.washed).toBeCloseTo(3.38, 2);
    expect(tightestBody.pair).toBe("selectedForeground on selected");
    expect(tightestBody.theme).toBe("Dark");
    expect(tightestBody.washed).toBeCloseTo(5.11, 2);
  });

  it("states the scope and the numbers on every surface", () => {
    const catalogue = read("../../../docs/tokens.md");
    const design = read("../../../docs/design-system.md");
    const readme = read("../README.md");
    const inventory = read("../../../.agents/slop/COMPONENTS.md");

    const under = placements.filter(({ washed, floor }) => washed < floor);
    const printed = `${under.length} of the ${placements.length} placements`;

    expect(catalogue).toContain(printed);

    expect(catalogue).toContain(
      `every one of the ${placements.length} placements`,
    );
    expect(design).toContain(
      `every one of the ${placements.length} placements`,
    );
    expect(design).toContain(`leaves ${under.length} of them under the floor`);
    expect(inventory).toContain(`all ${placements.length} placements`);
    expect(inventory).toContain(`leaves ${under.length} under the floor`);
    expect(readme.replace(/\s+/g, " ")).toContain(
      `all ${placements.length} placements`,
    );
    expect(readme.replace(/\s+/g, " ")).toContain(
      `leaves ${under.length} under the floor`,
    );
    expect(catalogue).toContain(
      `**${under.length} of the ${placements.length} under the floor`,
    );
    expect(catalogue).toContain("3.38");
    expect(catalogue).toContain("5.11");
    expect(catalogue).toContain("saturated");
    expect(design).toContain("saturated");
    expect(design).toContain("content tone");
    expect(readme).toContain("saturated");
    expect(inventory).toContain("saturated");
  });

  it("names the style each printed tightest placement belongs to", () => {
    const tightest = placements.reduce((a, b) => (b.washed < a.washed ? b : a));
    const phrase = "secondary line on a selected row";

    Object.entries(everySurface()).forEach(([document, text]) => {
      const prose = flat(text);
      const at = prose.indexOf(phrase);
      expect(at, document).toBeGreaterThan(-1);

      const clause = prose.slice(Math.max(0, at - 240), at + 240);
      expect(clause, document).toContain(tightest.theme);
      expect(clause, document).toContain(tightest.washed.toFixed(2));

      expect(prose, document).not.toContain(
        "Luna light's secondary line on a selected row",
      );
    });
  });
});

describe("the wash a status message can carry", () => {
  const styles = [...shippedThemes, ...platformThemes, ...retroThemes];
  const softTints = statusTones.map((tone) => `${tone}Soft` as const);

  const copyInk = (theme: (typeof styles)[number], tint: string): string =>
    theme.colors[`${tint}Foreground` as keyof typeof theme.colors] as string;

  const over = (
    theme: (typeof styles)[number],
    tint: (typeof softTints)[number],
    wash: string,
  ) => {
    const fill = theme.colors[tint];
    const composed = blend(fill, wash, alphaOf(wash));
    const floors =
      theme.contrast === "high" ? highContrastFloors : contrastFloors;
    return {
      theme,
      tint,

      body: contrastRatio(theme.colors.foreground, composed) ?? 0,

      copy: contrastRatio(copyInk(theme, tint), composed) ?? 0,
      visible: contrastRatio(composed, fill) ?? 0,
      floor: floors.body,
    };
  };

  const pageInkWash = (
    theme: (typeof styles)[number],
    tint: (typeof softTints)[number],
  ): string => {
    const fill = theme.colors[tint];
    const floor =
      theme.contrast === "high" ? highContrastFloors.body : contrastFloors.body;
    const carried = (candidate: string): boolean => {
      const composed = blend(fill, candidate, alphaOf(candidate));
      const legible = contrastRatio(theme.colors.foreground, composed);
      const visible = contrastRatio(composed, fill);
      return (
        (legible === undefined || legible >= floor) &&
        (visible === undefined || visible >= decorativeFloor)
      );
    };
    return (
      Array.from({ length: 51 }, (_, step) =>
        blend(theme.colors.selection, theme.colors.background, step / 50),
      ).find(carried) ?? theme.colors.selection
    );
  };

  it("paints the alert's copy on the tint it measures", () => {
    const recipes = read("../../tw/src/recipes.ts");
    const alert = read("../../components/src/alert.tsx");
    const description =
      /export const ALERT_DESCRIPTION =\s*"([^"]*)"/.exec(recipes)?.[1] ?? "";

    expect(description).toContain("text-foreground");
    expect(alert).toContain("color={theme.colors.foreground}");
    statusTones.forEach((tone) => {
      expect(recipes).toContain(`bg-${tone}Soft`);
    });
    expect(softTints).toHaveLength(statusTones.length);
  });

  it("finds the designed wash burying the copy on the dark tints", () => {
    const before = styles.flatMap((theme) =>
      softTints.map((tint) => ({
        mode: theme.mode,
        ...over(theme, tint, theme.colors.selection),
      })),
    );
    const under = before.filter(({ body, floor }) => body < floor);
    const tightest = under.reduce((a, b) => (b.body < a.body ? b : a));

    expect(under.filter(({ mode }) => mode === "light")).toEqual([]);
    expect(under).toHaveLength(32);
    expect(tightest.tint).toBe("warningSoft");
    expect(tightest.theme.name).toBe("Dark · Windows");
    expect(tightest.body).toBeCloseTo(5.21, 2);
  });

  it("reads the ink a message's title paints, not the page's only", () => {
    const before = styles.flatMap((theme) =>
      softTints.map((tint) => ({
        mode: theme.mode,
        ...over(theme, tint, pageInkWash(theme, tint)),
      })),
    );
    const buried = before.filter(({ copy, floor }) => copy < floor);
    const tightest = buried.reduce((a, b) => (b.copy < a.copy ? b : a));

    expect(buried).toHaveLength(35);
    expect(
      buried.filter(({ mode }) => mode === "light").length,
    ).toBeGreaterThan(0);
    expect(tightest.tint).toBe("successSoft");
    expect(tightest.theme.name).toBe("Light · Omarchy");
    expect(tightest.copy).toBeCloseTo(5.71, 2);

    const designed = styles.flatMap((theme) =>
      softTints.map((tint) => over(theme, tint, theme.colors.selection)),
    );
    expect(designed.filter(({ copy, floor }) => copy < floor)).toHaveLength(43);
  });

  it("derives a wash the copy can be selected with", () => {
    const after = styles.flatMap((theme) =>
      softTints.map((tint) => over(theme, tint, selectionOn(theme, tint))),
    );
    const broken = after.filter(
      ({ body, copy, floor, visible }) =>
        body < floor || copy < floor || visible < decorativeFloor,
    );
    const tightestBody = after.reduce((a, b) => (b.body < a.body ? b : a));
    const tightestCopy = after.reduce((a, b) => (b.copy < a.copy ? b : a));
    const tightestWash = after.reduce((a, b) =>
      b.visible < a.visible ? b : a,
    );

    expect(broken).toEqual([]);
    expect(after).toHaveLength(styles.length * softTints.length);
    expect(tightestBody.body).toBeCloseTo(7, 1);
    expect(tightestCopy.copy).toBeCloseTo(7, 1);
    expect(tightestWash.visible).toBeCloseTo(decorativeFloor, 1);
  });

  it("keeps the designed wash wherever it already carries the surface", () => {
    const content = ["input", "background", "card", "muted"] as const;

    styles.forEach((theme) => {
      content.forEach((surface) => {
        expect(selectionOn(theme, surface)).toBe(theme.colors.selection);
      });
    });

    const moved = styles
      .filter(
        (theme) => selectionOn(theme, "popover") !== theme.colors.selection,
      )
      .map((theme) => theme.name);
    expect(moved).toEqual(["Dark · Linux", "Dark · Windows XP (Luna)"]);

    const kept = styles.flatMap((theme) =>
      softTints.filter(
        (tint) => selectionOn(theme, tint) === theme.colors.selection,
      ),
    );
    expect(kept).toHaveLength(28);
  });

  it("keeps the designed share and moves only toward the page", () => {
    styles.forEach((theme) => {
      softTints.forEach((tint) => {
        const wash = selectionOn(theme, tint);
        const steps = Array.from({ length: 51 }, (_, index) =>
          blend(theme.colors.selection, theme.colors.background, index / 50),
        );

        expect(alphaOf(wash)).toBeCloseTo(alphaOf(theme.colors.selection), 5);
        expect(steps).toContain(wash);
      });
    });
  });

  it("keeps the designed wash when no step can serve the surface", () => {
    expect(selectionOn(invisibleSelectionBrand, "infoSoft")).toBe(
      invisibleSelectionBrand.colors.selection,
    );
    expect(selectionFailures(invisibleSelectionBrand)).not.toEqual([]);
  });

  it("executes the example's per-tone washes", () => {
    const washes = tintSelectionWashes(darkTheme);

    expect(Object.keys(washes)).toEqual([...statusTones]);
    expect(washes.warning).toBe(selectionOn(darkTheme, "warningSoft"));

    expect(washes.warning).not.toBe(darkTheme.colors.selection);
    expect(tintSelectionWashes(lightTheme).warning).toBe(
      lightTheme.colors.selection,
    );
  });

  it("states the tint contract and its numbers on every page", () => {
    const catalogue = read("../../../docs/tokens.md");
    const design = read("../../../docs/design-system.md");
    const readme = read("../README.md");
    const inventory = read("../../../.agents/slop/COMPONENTS.md");
    const designed = styles.flatMap((theme) =>
      softTints.map((tint) => ({
        mode: theme.mode,
        ...over(theme, tint, theme.colors.selection),
      })),
    );

    const dark = designed.filter(({ mode }) => mode === "dark");
    const buried = dark.filter(({ body, floor }) => body < floor);
    const buriedClaim = `${buried.length} of the ${dark.length} dark`;
    const derived = styles.flatMap((theme) =>
      softTints.map((tint) => ({
        mode: theme.mode,
        ...over(theme, tint, selectionOn(theme, tint)),
      })),
    );
    const tightestBody = derived.reduce((a, b) => (b.body < a.body ? b : a));
    const tightestWash = derived.reduce((a, b) =>
      b.visible < a.visible ? b : a,
    );
    const steps = derived
      .filter(({ mode }) => mode === "dark")
      .map(({ theme, tint }) => {
        const wash = selectionOn(theme, tint);
        return Array.from({ length: 51 }, (_, index) =>
          blend(theme.colors.selection, theme.colors.background, index / 50),
        ).indexOf(wash);
      });
    const reach = `${Math.max(...steps) * 2}%`;

    const buriedCopy = designed.filter(({ copy, floor }) => copy < floor);
    const tightestCopy = buriedCopy.reduce((a, b) => (b.copy < a.copy ? b : a));
    const beforeCopy = styles
      .flatMap((theme) =>
        softTints.map((tint) => over(theme, tint, pageInkWash(theme, tint))),
      )
      .filter(({ copy, floor }) => copy < floor);
    const tightestBefore = beforeCopy.reduce((a, b) =>
      b.copy < a.copy ? b : a,
    );
    const kept = styles.flatMap((theme) =>
      softTints.filter(
        (tint) => selectionOn(theme, tint) === theme.colors.selection,
      ),
    ).length;

    [catalogue, design, readme, inventory].forEach((page) => {
      const prose = flat(page);
      expect(prose).toContain("selectionOn");
      expect(prose).toContain(buriedClaim);
      expect(prose).toContain("5.21");

      expect(prose).toContain(`All ${derived.length} tint placements resolve`);
      expect(prose).not.toContain("30 of the 32");
      expect(prose).not.toContain("All 64 tint");

      expect(prose).toContain(`${tightestCopy.copy.toFixed(2)}:1`);
      expect(prose).toContain(`${buriedCopy.length} of the ${derived.length}`);
      expect(prose).toContain(`${beforeCopy.length} of the ${derived.length}`);
      expect(prose).toContain(tightestBefore.copy.toFixed(2));
      expect(prose).toContain(tightestBefore.tint);
      expect(prose).toContain(`${kept} of the ${derived.length}`);

      expect(prose).not.toContain("light tints keep the designed role");
      expect(prose).not.toContain(
        "(the light tints keep the theme's own wash)",
      );
    });

    [catalogue, design, readme].forEach((page) => {
      const prose = flat(page);
      expect(prose).toContain("6.82");
      expect(prose).toContain("6.90");
      expect(prose).toContain("#B2CAFF");
      expect(prose).toContain("7.48");
    });

    const omarchy = retroTheme(themes.dark, "omarchy");
    expect(
      contrastRatio(omarchy.colors.infoSoftForeground, omarchy.colors.infoSoft),
    ).toBeCloseTo(7.48, 2);

    const row = flat(inventory);
    expect(row).not.toContain("30/5.21");
    expect(row).not.toContain("64-placement");
    expect(row).toContain(`${derived.length}-placement sweep`);

    expect(tightestBody.body.toFixed(2)).toBe("7.00");
    expect(tightestWash.visible.toFixed(2)).toBe(decorativeFloor.toFixed(2));
    expect(tightestWash.theme.name).toBe("Dark · Windows 7 (Aero)");
    expect(tightestWash.tint).toBe("warningSoft");
    expect(catalogue).toContain(`${tightestBody.body.toFixed(2)}:1`);
    expect(catalogue).toContain(`${tightestWash.visible.toFixed(2)}:1`);
    expect(catalogue).toContain(`${reach} of the way`);
    expect(design).toContain("selectionOn");
  });
});

describe("the wash a theme cannot derive", () => {
  const stored = (overrides: Partial<Record<keyof Theme, unknown>>): Theme =>
    ({ ...lightTheme, ...overrides }) as Theme;

  const page = (path: string): string => read(path).replace(/\s+/g, " ");

  it("answers undefined for a theme that lost the whole colour group", () => {
    expect(
      selectionOn(stored({ colors: undefined }), "background"),
    ).toBeUndefined();
    expect(selectionOn({}, "infoSoft")).toBeUndefined();
  });

  it("answers undefined for each role the derivation moves", () => {
    const without = (role: keyof typeof lightColors) =>
      stored({ colors: { ...lightTheme.colors, [role]: undefined } });

    expect(selectionOn(without("selection"), "background")).toBeUndefined();
    expect(selectionOn(without("background"), "background")).toBeUndefined();
    expect(selectionOn(without("infoSoft"), "infoSoft")).toBeUndefined();
  });

  it("answers undefined for a surface name this release does not ship", () => {
    const unknown = "cardHover" as keyof typeof lightColors;
    expect(isColorRole(unknown)).toBe(false);
    expect(selectionOn(lightTheme, unknown)).toBeUndefined();
    expect(page("../../../docs/tokens.md")).toContain(
      "A surface name this release does not ship",
    );
  });

  it("still reads a complete theme's own wash", () => {
    Object.values(themes).forEach((theme) => {
      const wash = selectionOn(theme, "background");

      expect(wash, theme.name).toBe(theme.colors.selection);
      expect(alphaOf(wash)).toBeCloseTo(alphaOf(theme.colors.selection), 5);
    });
  });

  it("says so wherever the wash is taught", () => {
    const catalogue = page("../../../docs/tokens.md");
    const design = page("../../../docs/design-system.md");
    const readme = page("../README.md");
    const inventory = page("../../../.agents/slop/COMPONENTS.md");

    expect(catalogue).toContain("lost a role this derivation moves");
    expect(catalogue).toContain("answers `undefined` rather than throwing");

    expect(catalogue).toContain(
      "answer `undefined` when the roles they move are gone",
    );
    [
      "brandText",
      "brandTextOn",
      "disabledAction",
      "filledHover",
      "filledPressed",
      "focusRing",
      "selectionOn",
      "statusTone",
    ].forEach((helper) => {
      expect(catalogue).toContain(`\`${helper}\``);
    });
    expect(design).toContain(
      "`selectionOn` (for a surface, the wash or the page",
    );
    expect(readme).toContain("the surface, the wash or the page it steps");
    expect(inventory).toContain("A stored theme is read as the absence it is");
  });
});

describe("the floors a selection report uses", () => {
  const brand = extendTheme(highContrastLightTheme, {
    colors: { mutedForeground: "#505050" },
  });

  it("holds the text to the theme's own variant", () => {
    const failures = selectionFailures(brand);

    expect(
      failures.map(({ kind, foreground, background, floor }) => ({
        kind,
        foreground,
        background,
        floor,
      })),
    ).toEqual([
      {
        kind: "legibility",
        foreground: "mutedForeground",
        background: "background",
        floor: 7,
      },
      {
        kind: "legibility",
        foreground: "mutedForeground",
        background: "card",
        floor: 7,
      },
      {
        kind: "legibility",
        foreground: "mutedForeground",
        background: "popover",
        floor: 7,
      },
    ]);
    expect(
      failures.every(
        ({ kind, ratio }) => kind === "legibility" && (ratio ?? 0) > 4.5,
      ),
    ).toBe(true);
  });

  it("an explicit floor set still overrides the declaration", () => {
    expect(selectionFailures(brand, contrastFloors)).toEqual([]);
  });
});

describe("the adoption both packages paint", () => {
  const catalogue = read("../../../docs/tokens.md");

  const section = (heading: string): string => {
    const start = catalogue.indexOf(`${heading}\n`);
    const end = catalogue.indexOf("\n## ", start + heading.length + 1);
    return catalogue
      .slice(start, end === -1 ? undefined : end)
      .replace(/\s+/g, " ");
  };

  it("says both packages paint the role, not that adoption is owed", () => {
    const text = section("## Text selection");

    expect(text).toContain("Both packages paint it");
    expect(text).toContain("`selectionWash(theme)`");
    expect(text).toContain("`select-text`");
    expect(text).toContain("`messageSelection(theme, tone)`");
    expect(text).not.toContain("is the component packages' work");
    expect(text).not.toContain(
      "recorded in `.agents/slop/TODO.md` → Interlocks;",
    );
  });

  it("reads the seams the page names", () => {
    const primitiveStyle = read("../../primitives/src/core/style.ts");
    const primitiveRecipe = read("../../primitives/src/recipe/registry.ts");
    const componentsSeam = read("../../components/src/internal/theme.ts");
    const field = read("../../components/src/field.tsx");
    const alert = read("../../components/src/alert.tsx");

    expect(primitiveStyle).toContain(
      'style.selectionColor = colorRole(theme, "selection");',
    );
    expect(primitiveRecipe).toContain('"select-text"');
    expect(primitiveRecipe).toContain(
      'selectionColor: colorRole(theme, "selection")',
    );

    expect(componentsSeam).toContain("export const selectionWash");
    expect(componentsSeam).toContain("selectionColor: theme.colors.selection");
    expect(field).toContain("...selectionWash(theme)");
    expect(alert).toContain("messageSelection(theme, value)");
  });

  it("holds the last selectable host to the role the others paint", () => {
    const combobox = read("../../components/src/combobox.tsx");
    const rendered = read("../../components/src/behaviour/selection.test.tsx");
    const text = section("## Text selection");

    expect(combobox).toContain("ComboboxInput as HeadlessInput");
    expect(combobox).toContain("...selectionWash(theme)");

    expect(rendered).toContain("declares it on the combobox search field");

    expect(text).toContain("`ComboboxInput`");
    expect(text).not.toContain("Still open:");
  });

  it("reads the chat composer's textarea back in the renderer", () => {
    const rendered = read("../../components/src/behaviour/selection.test.tsx");
    const chat = read("../../components/src/chat.tsx");
    const text = section("## Text selection");

    expect(chat).toContain("...selectionWash(theme)");
    expect(rendered).toContain('findByType("input")');
    expect(rendered).toContain("ChatComposer");
    expect(rendered).toContain('findByType("textarea")');
    expect(text).toContain("`ChatComposer`");
    expect(text).toContain("`<textarea>`");
    expect(text).not.toContain("no case reads it back yet");
  });
});
