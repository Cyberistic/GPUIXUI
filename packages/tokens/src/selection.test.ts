/**
 * Guards the selection wash, the one translucent role painted behind text the
 * reader is looking at.
 *
 * The bug this holds: `selection` was documented as the text-selection wash,
 * carried by all four colour sets and every platform and authored style, and
 * measured by nothing — `contrastRatio` refuses a translucent colour, so the
 * text contract never saw the wash or the text inside it. Measuring it found
 * three shipped styles under the body floor: Linux dark at 6.63:1 on its card,
 * Windows dark at 6.33:1, and Luna dark at 6.80:1 on its popover. Each now
 * carries the base dark theme's 24% share instead of 30%.
 *
 * The second half — **secondary** text under the same wash — found that nine of
 * the sixteen styles had no headroom for a selection at all: the grey ramp's
 * 600 (light) and 400 (dark) steps sat close enough to the 4.5:1 floor that the
 * wash pushed them to 4.25–4.44:1 and 3.27–4.13:1. Both base palettes now carry
 * a value a step further from their surfaces, so a selected `mutedForeground`
 * line stays readable on the page, a card and a popover.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { alphaOf, blend, lightColors, palette } from "./color.js";
import {
  contrastFloors,
  contrastRatio,
  highContrastFloors,
} from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import { selectionFailures, selectionPairs } from "./selection.js";
import {
  invisibleSelectionBrand,
  report,
  selectionWashesAreReadable,
  unreadableSelectionBrand,
} from "./selection.example.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  themes,
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

/** The text role each content surface already carries before a wash is painted. */
const restingText: Readonly<Record<string, string>> = {
  input: "inputForeground",
  background: "foreground",
  card: "cardForeground",
  popover: "popoverForeground",
  muted: "foreground",
};

/** The prose surfaces that also carry secondary text beside their body text. */
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
    // A caption, a table's second line and a log row keep `mutedForeground`
    // when the reader selects them, so the wash owes that role the floor its
    // resting pair meets rather than the body floor the heading needs.
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
    // The catalogue prints the tightest shipped placement so a reader can see
    // how much room the contract has; a palette edit that lowers the floor has
    // to move the page with it.
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

    expect(tightest).toBeCloseTo(7.12, 2);
    expect(read("../../../docs/tokens.md")).toContain(tightest.toFixed(2));
  });
});

describe("selectionFailures", () => {
  it("reports the wash Linux dark shipped before this contract existed", () => {
    // The regression: a 30% wash over a card lighter than the base theme's left
    // the selected text at 6.63:1 against the 7:1 floor.
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
    // The regression: the fifth content surface is the `muted` bubble a chat
    // user message is painted on (`MESSAGE_BUBBLES.user` is `bg-muted`), and a
    // selectable `Text` inside it washes its run over that fill. Aero dark's
    // 30% wash took the bubble's body text to 6.55:1 against the 7:1 floor.
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
    expect(failure?.ratio).toBeCloseTo(6.55, 2);
    expect(selectionFailures(retroTheme(themes.dark, "aero"))).toEqual([]);
  });

  it("holds the pair to the bubble that paints it", () => {
    // A pair that outlives its painter is a contract for a colour nothing
    // paints: the recipe is the bubble's fill, the box tone is the other host a
    // `surface="muted"` block uses, and `selectionColor` is the property a
    // selectable `Text` hands the runtime.
    const recipes = read("../../tw/src/recipes.ts");
    const style = read("../../primitives/src/core/style.ts");

    expect(recipes).toContain('user: "bg-muted"');
    expect(style).toContain("muted: (theme) => theme.colors.muted");
    expect(style).toContain("style.selectionColor = theme.colors.selection;");
  });

  it("reports a wash that hides the text it selects", () => {
    const failures = selectionFailures(unreadableSelectionBrand);

    // Every pair, body and secondary: an opaque wash in the text colour leaves
    // nothing readable inside it.
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
    // The regression: the grey ramp's 600 step clears the secondary floor on
    // macOS light's window, so nothing measured it inside a selection — where a
    // 24% wash took it to 4.30:1.
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
    // The same pair is readable before the wash, which is the whole bug: the
    // resting contrast contract cannot see that a selection buries it.
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
    // A translucent page cannot be composited: the wash over it has no ratio,
    // and an unverifiable wash is a failure, not a pass.
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
    // The fifth surface is the bubble the library paints; a page that stops
    // naming it teaches the contract as the four page surfaces.
    expect(catalogue).toContain("message bubble");
    expect(catalogue).toContain("MESSAGE_BUBBLES.user");
    expect(design).toContain("message bubble");
    expect(readme).toContain("message bubble");
    // The secondary half is the contract a reader copies: the page has to name
    // the role, its floor and the value the palette carries for it, or the next
    // palette edit that drops the headroom is taught as fine.
    expect(catalogue).toContain("mutedForeground");
    expect(catalogue).toContain(`${contrastFloors.secondary}:1`);
    expect(catalogue).toContain(lightColors.mutedForeground);
    expect(design).toContain("selection wash");
    expect(design).toContain("secondary text inside the selection wash");
    expect(readme).toContain("mutedForeground");
    expect(readme).toContain(lightColors.mutedForeground);
  });
});

/**
 * The tones the wash is painted on, and the two it is not.
 *
 * `surfaceStyle` paints a fill for eight tones; the wash is measured on four of
 * them. The two it leaves out are the *saturated state* tones (`accent`,
 * `selected`), and the reason is structural rather than a gap: the wash is a
 * share of the accent family, so on a fill drawn from the same family it moves
 * the fill toward the text. Measured, that costs contrast in every placement and
 * 26 of the 80 fall under the floor the unwashed pair already met. The suite
 * below holds that reasoning in both directions — a new tone fails until it is
 * measured, and a palette that made the wash help on a saturated tone fails
 * until the decision is re-read.
 */
describe("the tones the wash is painted on", () => {
  const style = read("../../primitives/src/core/style.ts");
  const declared = [
    ...(
      /\bSURFACE_TONES = \[([\s\S]*?)\] as const/.exec(style)?.[1] ?? ""
    ).matchAll(/"([a-z]+)"/g),
  ].flatMap(([, tone]) => (tone === undefined ? [] : [tone]));

  /** A container's content tones: `none` paints nothing and `skeleton` is a placeholder. */
  const contentTones = [
    "background",
    "card",
    "popover",
    "muted",
    "accent",
    "selected",
  ] as const;

  /** The neutral content tones, where a wash moves a fill away from the text. */
  const washedTones = ["background", "card", "popover", "muted"] as const;

  /** The saturated state tones, where the wash is a tint of the fill's own family. */
  const saturatedTones = ["accent", "selected"] as const;

  /** A placement the wash is not measured on: the role the tone hands its text. */
  const excludedPairs = [
    { foreground: "foreground", over: "accent", floor: "body" },
    { foreground: "foreground", over: "selected", floor: "body" },
    { foreground: "mutedForeground", over: "accent", floor: "secondary" },
    { foreground: "mutedForeground", over: "selected", floor: "secondary" },
    { foreground: "selectedForeground", over: "selected", floor: "secondary" },
  ] as const;

  const tones = (all: ReadonlyArray<string>, measured: ReadonlyArray<string>) =>
    all.filter((tone) => !measured.includes(tone));

  const measuredOn = [...washedTones] as ReadonlyArray<string>;

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
    // A tone the container gains is unmeasured until this suite is told about
    // it — so the split is a partition of the tones the component paints, not a
    // list that happens to match today.
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
    // The wash never helps on a fill drawn from its own family. A palette edit
    // that broke that would mean the exclusion's reason had to be re-read — not
    // that the pair could be added quietly.
    expect(improved).toEqual([]);
  });

  it("leaves a quarter of those placements under their own floor", () => {
    const under = placements.filter(({ washed, floor }) => washed < floor);
    const tightest = placements.reduce((a, b) => (a.washed < b.washed ? a : b));
    const tightestBody = placements
      .filter(({ floor }) => floor === 7)
      .reduce((a, b) => (a.washed < b.washed ? a : b));

    // The measured reason the two tones stay out of `selectionPairs`: a single
    // translucent role cannot be strong enough for the page and weak enough for
    // a saturated fill.
    expect(under.length).toBe(26);
    expect(tightest.pair).toBe("mutedForeground on selected");
    expect(tightest.theme).toBe("Dark · Windows XP (Luna)");
    expect(tightest.washed).toBeCloseTo(3.78, 2);
    expect(tightestBody.theme).toBe("Dark · Windows XP (Luna)");
    expect(tightestBody.washed).toBeCloseTo(5.54, 2);
  });

  it("states the scope and the numbers on every surface", () => {
    const catalogue = read("../../../docs/tokens.md");
    const design = read("../../../docs/design-system.md");
    const readme = read("../README.md");
    const inventory = read("../../../COMPONENTS.md");

    const under = placements.filter(({ washed, floor }) => washed < floor);
    const printed = `${under.length} of the ${placements.length} placements`;

    expect(catalogue).toContain(printed);
    expect(catalogue).toContain("3.78");
    expect(catalogue).toContain("5.54");
    expect(catalogue).toContain("saturated");
    expect(design).toContain("saturated");
    expect(design).toContain("content tone");
    expect(readme).toContain("saturated");
    expect(inventory).toContain("saturated");
  });
});

/**
 * The text floors follow the theme's declaration, not a caller's memory.
 *
 * The wash's own perceptibility floor is a design constant (1.05:1) and stays
 * put; the *text* floor inside it is the theme's — the body floor for a run, the
 * secondary floor for the `mutedForeground` line — and `selectionFailures` used
 * to default to the ordinary floors, so a high-contrast brand passed the gate
 * its own variant asks. `#505050` leaves the line at 5.51:1 inside the wash: above
 * the 4.5 floor, under the 7 the variant declares.
 */
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
