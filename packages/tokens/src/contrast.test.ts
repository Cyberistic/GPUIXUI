/**
 * Guards the accessibility contract a theme is measured against: the ratio
 * maths a brand uses to check its own palette, and the floors the built-in and
 * platform themes are held to. A ratio that silently accepted a translucent
 * colour would let a theme claim a contrast it cannot have, because a
 * translucent fill takes the surface behind it.
 *
 * The catalogue's printed tightest placement is read here, as `docs.test.ts`
 * and `selection.test.ts` read it: the page states the number this suite
 * measures, so the two cannot drift apart. The read is synchronous and happens
 * once, when the suite loads; the package keeps no runtime dependency.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  contrastFailures,
  contrastFloors,
  contrastFloorsFor,
  contrastPairs,
  contrastRatio,
  highContrastFloors,
} from "./contrast.js";
import {
  highContrastDarkColors,
  lightColors,
  palette,
  type ThemeColors,
} from "./color.js";
import { indicatorRoles, indicatorSurfaces } from "./indicator.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import { statusTones } from "./styles.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  highContrastThemes,
  lightTheme,
  platformTheme,
  themes,
} from "./theme.js";

/** The ratio as the catalogue prints it, or a word when it cannot be measured. */
const printedRatio = (ratio: number | undefined): string =>
  ratio === undefined ? "unmeasurable" : `${ratio.toFixed(2)}:1`;

/**
 * Whether a painter spreads a keyboard ring into its style.
 *
 * The pair a wash is measured for only means something while the element still
 * declares a ring. Which helper names that declaration is the painter's choice:
 * `keyboardRing` is the unconditional one, and `controlRing` — or the token
 * package's `controlFocusRing` once a package adopts it — is the same
 * declaration with a disabled control left out, because the runtime keeps the
 * focus of an element it disables and a ring there would sit on a control that
 * refuses every key. Pinning one helper's name made a rename red; pinning the
 * declaration keeps the pair alive through it.
 */
const declaresKeyboardRing = (source: string): boolean =>
  /\.\.\.(?:keyboardRing|controlRing|controlFocusRing)\(theme/.test(source);

/** A recipe's class string, read from `@gpuixui/tw`'s source. */
const recipe = (source: string, name: string): string => {
  const match = new RegExp(`export const ${name} =\\s*"([^"]*)"`).exec(source);
  if (match?.[1] === undefined) {
    throw new Error(`recipe ${name} not found`);
  }
  return match[1];
};

describe("contrastRatio", () => {
  it("reports the extremes of the scale", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  });

  it("reports 1 for identical colours", () => {
    expect(contrastRatio("#5F4BDB", "#5F4BDB")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    const forwards = contrastRatio("#2559D6", "#F6F8FA");
    const backwards = contrastRatio("#F6F8FA", "#2559D6");
    expect(forwards).toBeCloseTo(backwards ?? 0, 10);
  });

  it("refuses to measure a translucent colour", () => {
    // The alpha byte means the real ratio depends on the surface behind it.
    expect(contrastRatio("#00000080", "#FFFFFF")).toBeUndefined();
    expect(contrastRatio("#FFFFFF", "#00000080")).toBeUndefined();
  });

  it("refuses to measure a value it cannot parse", () => {
    // A translucent value's ratio depends on the surface behind it, and a named
    // colour or a colour function has no channels here — shorthand hex, which
    // does resolve, is measured (`the hex dialect the contracts measure`).
    expect(contrastRatio("transparent", "#FFFFFF")).toBeUndefined();
    expect(contrastRatio("#FFFFFF", "#00000080")).toBeUndefined();
    expect(contrastRatio("rgb(0, 0, 0)", "#FFFFFF")).toBeUndefined();
  });
});

describe("contrast floors", () => {
  it("holds text to AAA and boundaries to AA in a default theme", () => {
    expect(contrastFloors).toEqual({
      body: 7,
      secondary: 4.5,
      boundary: 3,
      disabled: 1.5,
    });
  });

  it("raises every floor in a high-contrast theme", () => {
    expect(highContrastFloors).toEqual({
      body: 7,
      secondary: 7,
      boundary: 4.5,
      disabled: 3,
    });
    expect(highContrastFloors.secondary).toBeGreaterThan(
      contrastFloors.secondary,
    );
    expect(highContrastFloors.boundary).toBeGreaterThan(
      contrastFloors.boundary,
    );
    expect(highContrastFloors.disabled).toBeGreaterThan(
      contrastFloors.disabled,
    );
  });

  it("measures every pair at a floor it declares", () => {
    contrastPairs.forEach(({ floor }) => {
      expect(Object.keys(contrastFloors)).toContain(floor);
    });
  });

  it("names a distinct pair for every text-on-surface relation", () => {
    const keys = contrastPairs.map(
      ({ foreground, background }) => `${foreground}/${background}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});

/**
 * The floors are the theme's, not the caller's memory.
 *
 * `auditTheme` has always read a theme's `contrast` declaration, and the
 * individual report did not: `contrastFailures(theme)` defaulted to the default
 * floors, so a brand built from a high-contrast theme passed a check whose
 * floors its own variant does not accept. The brand below is exactly that
 * mistake — `#505050` keeps every pair above 4.5:1 and drops the four washes and
 * the group panel under 7:1 — and the default-floor call is the passing twin
 * that makes the variant call the failure it is.
 */
describe("the floors a contrast report uses", () => {
  const brand = extendTheme(highContrastLightTheme, {
    colors: { mutedForeground: "#505050" },
  });

  it("takes the high floors from the theme without being told", () => {
    const failures = contrastFailures(brand);

    expect(
      failures.map(({ foreground, background, floor }) => ({
        foreground,
        background,
        floor,
      })),
    ).toEqual([
      { foreground: "mutedForeground", background: "hover", floor: 7 },
      { foreground: "mutedForeground", background: "active", floor: 7 },
      { foreground: "mutedForeground", background: "accent", floor: 7 },
      { foreground: "mutedForeground", background: "secondary", floor: 7 },
      { foreground: "mutedForeground", background: "selected", floor: 7 },
    ]);
    expect(
      failures.every(({ ratio }) => ratio !== undefined && ratio >= 4.5),
    ).toBe(true);
  });

  it("a theme that declares nothing keeps the default floors", () => {
    const standard = extendTheme(lightTheme, {
      colors: { mutedForeground: "#5A5A5A" },
    });

    // 6.4:1 on the page clears the 4.5 secondary floor the default variant asks
    // for, and would not clear the high-contrast variant's 7:1.
    expect(contrastFailures(standard)).toEqual([]);
  });

  it("an explicit floor set still overrides the declaration", () => {
    expect(contrastFailures(brand, contrastFloors)).toEqual([]);
    expect(contrastFailures(brand, highContrastFloors).length).toBe(5);
  });
});

/**
 * Guards the pair set a status message needs when it is written as text on a
 * surface rather than on its own tinted one — a field error, an inline warning,
 * or a `tone="destructive"` menu row on a popover. The bug this holds twice:
 * `FieldError` painted the solid `destructive` fill role as text, and no pair
 * measured it; later the same role was painted on a popover, and the table held
 * only `background` and `card`, so a menu row could ship below the body floor
 * with nothing to notice.
 */
describe("status text on a surface", () => {
  /** The strips a status message's text can be painted straight onto. */
  const statusTextStrips = ["background", "card", "popover", "muted"] as const;

  it("measures every tone's readable text on the four strips a message sits on", () => {
    // A `FieldError` and a `Text tone="destructive"` paint the tone's readable
    // role with **no tint of their own** (`FIELD_ERROR` is a bare
    // `text-destructive`; the component swaps in `statusTone(...).foreground`),
    // so the strip behind the message is the surface the text is read on. The
    // decorative table already places each tone's soft tint and its edge on
    // `muted` ("a soft badge in a muted sidebar") while the text half stopped at
    // the three page surfaces — an inline warning in a muted toolbar was a tint
    // and an edge with no measured label.
    const missing = statusTones.flatMap((tone) =>
      statusTextStrips
        .filter(
          (background) =>
            !contrastPairs.some(
              (pair) =>
                pair.foreground === `${tone}SoftForeground` &&
                pair.background === background,
            ),
        )
        .map((background) => `${tone}SoftForeground/${background}`),
    );

    expect(missing).toEqual([]);
  });

  it("holds the painter that puts status text on the strip", () => {
    const field = readFileSync(
      new URL("../../components/src/field.tsx", import.meta.url),
      "utf8",
    );
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );

    // The message slot paints the tone's readable role over the strip, and its
    // recipe has no fill of its own — which is exactly why the strip is the
    // surface the pair has to measure.
    expect(field).toContain('statusTone(theme, "destructive").foreground');
    const errorRecipe = recipe(recipes, "FIELD_ERROR");
    expect(errorRecipe).not.toContain("bg-");
  });

  it("reports status text painted invisible on a popover", () => {
    const broken = {
      colors: {
        ...lightColors,
        destructiveSoftForeground: lightColors.popover,
      },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "destructiveSoftForeground" &&
          background === "popover",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("reports an inline warning swallowed by the muted strip it sits in", () => {
    const broken = {
      colors: { ...lightColors, muted: lightColors.warningSoftForeground },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "warningSoftForeground" && background === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("clears the body floor on every strip, tightest on Luna's toolbar", () => {
    const styles = [
      themes.light,
      themes.dark,
      highContrastThemes.light,
      highContrastThemes.dark,
      ...platformNames.flatMap((platform) => [
        platformTheme(themes.light, platform),
        platformTheme(themes.dark, platform),
      ]),
      ...retroNames.flatMap((look) => [
        retroTheme(themes.light, look),
        retroTheme(themes.dark, look),
      ]),
    ];
    const placements = styles.flatMap((theme) =>
      statusTones.map((tone) => ({
        theme: theme.name,
        tone,
        ratio: contrastRatio(
          theme.colors[`${tone}SoftForeground`],
          theme.colors.muted,
        ),
      })),
    );
    expect(styles).toHaveLength(16);
    expect(
      placements
        .filter(
          ({ ratio }) =>
            ratio === undefined || ratio < contrastFloorsFor(themes.light).body,
        )
        .map(({ theme, tone }) => `${theme} ${tone}`),
    ).toEqual([]);
    // The catalogue prints this placement, so a palette edit moves both.
    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );
    expect(
      `${tightest.theme} ${tightest.tone} ${printedRatio(tightest.ratio)}`,
    ).toBe("Light · Windows XP (Luna) warning 8.78:1");
  });
});

/**
 * Guards the second text role a soft status surface carries: the alert's own
 * copy. `ALERT_DESCRIPTION` paints `text-foreground` and `AlertDismiss` paints
 * its glyph the page role, so body copy and the close control sit on the tone's
 * tint in the page's ink — while the table measured only the tone's readable
 * role on that tint. The paint is deliberate (the page role is the most
 * readable text a theme has), so the pair belongs in the table: a brand that
 * repaints `foreground` or authors its own tint could ship an alert whose copy
 * nobody can read with every report empty.
 */
describe("the ink an alert paints on its own tint", () => {
  /** The four soft status surfaces a message is painted on. */
  const softTints = statusTones.map((tone) => `${tone}Soft` as const);

  it("measures the page role on every soft status tint", () => {
    const missing = softTints.filter(
      (background) =>
        !contrastPairs.some(
          (pair) =>
            pair.foreground === "foreground" &&
            pair.background === background &&
            pair.floor === "body",
        ),
    );

    expect(missing).toEqual([]);
  });

  it("holds the painters that put the alert's copy on the tint", () => {
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const alert = readFileSync(
      new URL("../../components/src/alert.tsx", import.meta.url),
      "utf8",
    );

    // The description's recipe is the page role, overriding the tone's readable
    // role the root paints, and the dismiss glyph takes the same role: both sit
    // on the tone's soft tint, so the pair cannot outlive either painter.
    expect(recipe(recipes, "ALERT_DESCRIPTION")).toContain("text-foreground");
    expect(alert).toContain("color={theme.colors.foreground}");
    statusTones.forEach((tone) => {
      expect(recipes).toContain(`bg-${tone}Soft`);
    });
  });

  it("reports alert copy a tint swallows", () => {
    const broken = {
      colors: { ...lightColors, infoSoft: lightColors.foreground },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "foreground" && background === "infoSoft",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("clears the body floor on every style, tightest on Luna's warning tint", () => {
    const styles = [
      themes.light,
      themes.dark,
      highContrastThemes.light,
      highContrastThemes.dark,
      ...platformNames.flatMap((platform) => [
        platformTheme(themes.light, platform),
        platformTheme(themes.dark, platform),
      ]),
      ...retroNames.flatMap((look) => [
        retroTheme(themes.light, look),
        retroTheme(themes.dark, look),
      ]),
    ];
    const placements = styles.flatMap((theme) =>
      softTints.map((tint) => ({
        theme: theme.name,
        tint,
        ratio: contrastRatio(theme.colors.foreground, theme.colors[tint]),
      })),
    );

    expect(styles).toHaveLength(16);
    expect(placements).toHaveLength(64);
    expect(
      placements
        .filter(
          ({ ratio }) =>
            ratio === undefined || ratio < contrastFloorsFor(themes.light).body,
        )
        .map(({ theme, tint }) => `${theme} ${tint}`),
    ).toEqual([]);
    // The catalogue prints this placement, so a palette edit moves both.
    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );
    expect(
      `${tightest.theme} ${tightest.tint} ${printedRatio(tightest.ratio)}`,
    ).toBe("Dark · Windows XP (Luna) warningSoft 7.14:1");
  });

  it("prints that placement on both token pages", () => {
    // The two pages state the number this suite measures, so a palette edit and
    // a page that kept the old value fail in opposite directions.
    const catalogue = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    );
    const system = readFileSync(
      new URL("../../../docs/design-system.md", import.meta.url),
      "utf8",
    );

    [catalogue, system].forEach((page) => {
      expect(page).toContain("`warningSoft`");
      expect(page).toContain("7.14:1");
    });
    expect(system).toContain(
      "Windows XP (Luna) dark's `warningSoft` at 7.14:1",
    );
  });
});

describe("text on the state washes", () => {
  /**
   * A hover, press or accent wash is painted under a control's existing text,
   * which keeps its resting role — a ghost button's label, a list row's second
   * line. Nothing else measured those surfaces, so a wash that drifted toward
   * its own text could ship unreadable.
   */
  it("measures both resting text roles on every wash", () => {
    const missing = ["hover", "active", "accent"].flatMap((background) =>
      [
        { foreground: "foreground", floor: "body" },
        { foreground: "mutedForeground", floor: "secondary" },
      ]
        .filter(
          ({ foreground, floor }) =>
            !contrastPairs.some(
              (pair) =>
                pair.foreground === foreground &&
                pair.background === background &&
                pair.floor === floor,
            ),
        )
        .map(({ foreground }) => `${foreground}/${background}`),
    );

    expect(missing).toEqual([]);
  });

  it("reports a wash that matches the text it has to carry beneath", () => {
    const broken = {
      colors: { ...lightColors, active: lightColors.mutedForeground },
    };
    const failures = contrastFailures(broken);

    expect(
      failures.find(
        ({ foreground, background }) =>
          foreground === "mutedForeground" && background === "active",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.secondary });
  });
});

/**
 * Guards the label a **secondary action** keeps while its fill moves.
 *
 * The wash suite above measured the page's `foreground` and the
 * `mutedForeground` second line, and the filled-action suite measures a
 * `primary`/`destructive` label on its derived fill. A secondary action is
 * neither: it rests on the `secondary` role and, in the components package's
 * `Button`, moves to the `hover`/`active` role on a pointer while keeping
 * `secondaryForeground` — so both washes carried a label no pair measured, and
 * a brand whose secondary label drifted toward its own wash shipped.
 */
describe("the secondary action's label on the wash it tints", () => {
  const washes = ["hover", "active"] as const;

  it("measures the label on both washes", () => {
    const missing = washes
      .filter(
        (background) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === "secondaryForeground" &&
              pair.background === background &&
              pair.floor === "secondary",
          ),
      )
      .map((background) => `secondaryForeground/${background}`);

    expect(missing).toEqual([]);
  });

  it("holds the painter the pair exists for", () => {
    // The pair only means something while a control rests in that role and
    // tints those washes: the components package's `Button` is the painter.
    const button = readFileSync(
      new URL("../../components/src/internal/button.tsx", import.meta.url),
      "utf8",
    );
    const secondary = button.slice(
      button.indexOf('Match.when("secondary", () => ({'),
      button.indexOf('Match.when("ghost", () => ({'),
    );

    // The label is the variant's own on-colour: the action colour resolver the
    // four variants share names it, and the control style applies that resolver
    // (so a glyph can inherit the label instead of naming a colour from another
    // fill).
    expect(button).toContain(
      'Match.when("secondary", () => theme.colors.secondaryForeground)',
    );
    expect(button).toContain("color: actionOnColor(theme, value)");
    expect(secondary).toContain(
      "hover: { backgroundColor: theme.colors.hover }",
    );
    expect(secondary).toContain(
      "active: { backgroundColor: theme.colors.active }",
    );
  });

  it("reports a label painted into the wash it tints", () => {
    const broken = (wash: "hover" | "active") => ({
      colors: {
        ...lightColors,
        secondaryForeground: lightColors[wash],
      },
    });

    const reported = washes.map((wash) =>
      contrastFailures(broken(wash)).find(
        (pair) =>
          pair.foreground === "secondaryForeground" && pair.background === wash,
      ),
    );

    expect(reported).toMatchObject(
      washes.map((wash) => ({
        background: wash,
        ratio: 1,
        floor: contrastFloors.secondary,
      })),
    );
  });

  it("clears the floor in every shipped, platform and authored theme", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const placements = shipped.flatMap((theme) =>
      washes.map((background) => ({
        name: `${theme.name}/${background}`,
        ratio: contrastRatio(
          theme.colors.secondaryForeground,
          theme.colors[background],
        ),
        floor: contrastFloorsFor(theme).secondary,
      })),
    );
    const hidden = placements.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );

    expect(hidden).toEqual([]);
    expect(tightest.name).toBe("Dark · Windows XP (Luna)/active");
    expect(printedRatio(tightest.ratio)).toBe("7.88:1");
    // The catalogue prints the number this suite measures, so a palette edit
    // moves the sentence instead of leaving a stale claim.
    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(`pressed wash at ${tightest.ratio?.toFixed(2)}:1`);
  });
});

/**
 * Guards a control's own label on the group strip it sits in.
 *
 * An unfilled action — the `outline` and `ghost` variants — paints no fill of
 * its own and keeps `foreground`; a quiet label or icon in the same group keeps
 * `mutedForeground`. `docs/design-system.md` §7 names the segmented `secondary`
 * panel as one of the strips a control sits on, and `ring`, `borderStrong` and
 * a disabled label were all measured there while the two text roles were not:
 * a brand whose panel drifted toward its own ink could ship a label that
 * disappears inside the group while the edge beside it passed.
 */
describe("a control's label on its group strip", () => {
  const primitives = readFileSync(
    new URL("../../primitives/src/core/variants.ts", import.meta.url),
    "utf8",
  );

  const pairs = [
    { foreground: "foreground", floor: "body" },
    { foreground: "mutedForeground", floor: "secondary" },
  ] as const;

  it("measures both text roles on the segmented panel", () => {
    const missing = pairs
      .filter(
        ({ foreground, floor }) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === foreground &&
              pair.background === "secondary" &&
              pair.floor === floor,
          ),
      )
      .map(({ foreground }) => `${foreground}/secondary`);

    expect(missing).toEqual([]);
  });

  it("holds the unfilled variants that keep the page ink", () => {
    // The pair is only honest while a control in a group paints no fill of its
    // own: both variants declare `background: undefined` beside the page role,
    // so the strip behind them is what the label is read on.
    for (const variant of ["outline", "ghost"] as const) {
      const declaration = new RegExp(
        `const ${variant}: ControlVariant = \\{[\\s\\S]*?\\n\\};`,
      ).exec(primitives)?.[0];
      expect(declaration, variant).toContain("background: undefined");
      expect(declaration, variant).toContain(
        "foreground: (theme) => theme.colors.foreground",
      );
    }
  });

  it("reports a label painted into the panel it sits in", () => {
    const broken = (role: "foreground" | "mutedForeground") => ({
      colors: { ...lightColors, secondary: lightColors[role] },
    });

    expect(
      contrastFailures(broken("foreground")).find(
        ({ foreground, background }) =>
          foreground === "foreground" && background === "secondary",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
    expect(
      contrastFailures(broken("mutedForeground")).find(
        ({ foreground, background }) =>
          foreground === "mutedForeground" && background === "secondary",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.secondary });
  });

  it("clears the floor in every shipped, platform and authored theme", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const placements = shipped.flatMap((theme) =>
      pairs.map(({ foreground, floor }) => ({
        name: `${theme.name}/${foreground}`,
        ratio: contrastRatio(theme.colors[foreground], theme.colors.secondary),
        floor: contrastFloorsFor(theme)[floor],
      })),
    );
    const hidden = placements.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = (foreground: (typeof pairs)[number]["foreground"]) =>
      placements
        .filter(({ name }) => name.endsWith(`/${foreground}`))
        .reduce((low, next) =>
          (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
        );

    expect(hidden).toEqual([]);
    expect(tightest("foreground").name).toBe(
      "Dark · Windows XP (Luna)/foreground",
    );
    expect(printedRatio(tightest("foreground").ratio)).toBe("7.62:1");
    expect(tightest("mutedForeground").name).toBe(
      "Light · Windows XP (Luna)/mutedForeground",
    );
    expect(printedRatio(tightest("mutedForeground").ratio)).toBe("4.89:1");
    // The catalogue prints the quiet label's number this suite measures, so a
    // palette edit moves the sentence instead of leaving a stale claim.
    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(
      `quiet label on its group panel at ${tightest("mutedForeground").ratio?.toFixed(2)}:1`,
    );
  });
});

/**
 * Guards the body role on a container's own surface.
 *
 * `Box`/`surfaceStyle` paints six content tones, and the default `Text` inside
 * one keeps `foreground` — a `muted` panel, a popover, a message bubble
 * (`MESSAGE_BUBBLES.user` is `bg-muted`). Only `background`, `card`, `accent`
 * and `selected` were measured, while `docs/design-system.md` already claimed
 * body text on a popover, so a brand whose `muted` drifted toward its body role
 * erased the copy inside it and passed every suite.
 */
describe("the body role on a box's own surface", () => {
  const style = readFileSync(
    new URL("../../primitives/src/core/style.ts", import.meta.url),
    "utf8",
  );
  const declared = [
    ...(
      /\bSURFACE_TONES = \[([\s\S]*?)\] as const/.exec(style)?.[1] ?? ""
    ).matchAll(/"([a-z]+)"/g),
  ].flatMap(([, tone]) => (tone === undefined ? [] : [tone]));
  /**
   * A container's content tones; `none` paints nothing and `skeleton` is a
   * decorative placeholder rather than a surface copy sits on.
   */
  const contentTones = [
    "background",
    "card",
    "popover",
    "muted",
    "accent",
    "selected",
  ] as const satisfies ReadonlyArray<keyof ThemeColors>;

  it("reads the tones the container itself resolves from", () => {
    expect(declared).toEqual(["none", ...contentTones, "skeleton"]);
  });

  it("measures the body role on every content tone", () => {
    const missing = contentTones.filter(
      (background) =>
        !contrastPairs.some(
          (pair) =>
            pair.foreground === "foreground" &&
            pair.background === background &&
            pair.floor === "body",
        ),
    );

    expect(missing).toEqual([]);
  });

  it("holds the surface a shipped bubble actually paints", () => {
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const bubbles = recipes.slice(
      recipes.indexOf("export const MESSAGE_BUBBLES"),
      recipes.indexOf("export const MESSAGE_AUTHOR"),
    );

    // The bubble sets no colour of its own, and `Text`'s default tone is the
    // body role — so the pair above is the one a user message paints.
    expect(bubbles).toContain('user: "bg-muted"');
    expect(style).toContain("default: (theme) => theme.colors.foreground");
  });

  it("reports copy a surface swallows", () => {
    const flatMuted = {
      colors: { ...lightColors, muted: lightColors.foreground },
    };
    const flatPopover = {
      colors: { ...lightColors, popover: lightColors.foreground },
    };

    expect(
      contrastFailures(flatMuted).find(
        ({ foreground, background }) =>
          foreground === "foreground" && background === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
    expect(
      contrastFailures(flatPopover).find(
        ({ foreground, background }) =>
          foreground === "foreground" && background === "popover",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("clears the body floor on every shipped style", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const hidden = shipped.flatMap((theme) =>
      contentTones
        .map((background) => ({
          name: `${theme.name}/${background}`,
          ratio: contrastRatio(
            theme.colors.foreground,
            theme.colors[background],
          ),
          floor: contrastFloorsFor(theme).body,
        }))
        .filter(({ ratio, floor }) => ratio === undefined || ratio < floor),
    );

    expect(hidden).toEqual([]);
  });

  it("prints the surfaces the design system says body text is measured on", () => {
    const row = readFileSync(
      new URL("../../../docs/design-system.md", import.meta.url),
      "utf8",
    )
      .split("\n")
      .find((line) => line.startsWith("| body text on"));

    expect(row, "docs/design-system.md has no body-text row").toBeDefined();
    contentTones.forEach((tone) => {
      expect(row).toContain(tone === "background" ? "background" : tone);
    });
  });
});

/**
 * Guards the roles a *floating* row keeps while a wash is painted under it.
 * The wash suite above measured the page-level roles (`foreground`,
 * `mutedForeground`); a menu or combobox row on a popover keeps the surface's
 * own role instead — `popoverForeground` — and a destructive row paints the
 * tone's readable role, so neither was measured on `hover` or `active` even
 * though `menuRowStyle` paints both under the row. The pair found two shipped
 * misses: Windows light at 6.93:1 and Luna light at 6.77:1 on the pressed wash,
 * both under the body floor.
 */
describe("the resting role of a floating row on the wash it tints", () => {
  const roles = ["popoverForeground", "destructiveSoftForeground"] as const;

  it("measures both floating-row roles on both washes", () => {
    const missing = ["hover", "active"].flatMap((background) =>
      roles
        .filter(
          (foreground) =>
            !contrastPairs.some(
              (pair) =>
                pair.foreground === foreground &&
                pair.background === background &&
                pair.floor === "body",
            ),
        )
        .map((foreground) => `${foreground}/${background}`),
    );

    expect(missing).toEqual([]);
  });

  it("holds the roles the menu painters actually use", () => {
    // The pair only means something if a row still rests in those roles. The
    // recipe supplies the surface text role and `menuRowStyle` paints the two
    // washes and the destructive tone, so both files are read rather than
    // assumed.
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const menuRow = readFileSync(
      new URL("../../components/src/menu/item.tsx", import.meta.url),
      "utf8",
    );
    const menuItem = recipes.slice(
      recipes.indexOf("export const MENU_ITEM ="),
      recipes.indexOf("export const MENU_LABEL ="),
    );
    const row = menuRow.slice(menuRow.indexOf("export const menuRowStyle"));

    expect(menuItem).toContain("text-popover-foreground");
    expect(row).toContain("{ backgroundColor: theme.colors.hover }");
    expect(row).toContain("{ backgroundColor: theme.colors.active }");
    expect(row).toContain('statusTone(theme, "destructive").foreground');
  });

  it("reports the pressed wash the two light looks shipped before this pair", () => {
    // Rebuilt from red 800 so the numbers are the ones the palettes shipped
    // before every light theme moved to red 900 for its soft surface's text.
    const before = (theme: { readonly colors: ThemeColors }) => ({
      colors: {
        ...theme.colors,
        destructiveSoftForeground: palette.red[800],
      },
    });
    const pressed = (theme: { readonly colors: ThemeColors }) =>
      contrastFailures(before(theme)).find(
        ({ foreground, background }) =>
          foreground === "destructiveSoftForeground" && background === "active",
      );

    const windows = pressed(platformTheme(lightTheme, "win32"));
    const luna = pressed(retroTheme(lightTheme, "luna"));

    expect(windows?.floor).toBe(contrastFloors.body);
    expect(windows?.ratio).toBeCloseTo(6.93, 2);
    expect(luna?.floor).toBe(contrastFloors.body);
    expect(luna?.ratio).toBeCloseTo(6.77, 2);

    // The catalogue states both numbers, so the page and the measurement move
    // together.
    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    );
    expect(page).toContain(`at ${printedRatio(windows?.ratio)}`);
    expect(page).toContain(`at ${printedRatio(luna?.ratio)}`);
  });

  it("reports a popover's own text painted into its hover wash", () => {
    const broken = {
      colors: { ...lightColors, popoverForeground: lightColors.hover },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "popoverForeground" && background === "hover",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("clears the body floor in every shipped theme, with the dark looks tightest", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const measured = shipped.flatMap((theme) =>
      (["hover", "active"] as const).flatMap((background) =>
        roles.map((foreground) => ({
          name: `${theme.name}/${foreground}/${background}`,
          ratio:
            contrastRatio(theme.colors[foreground], theme.colors[background]) ??
            0,
        })),
      ),
    );
    const tightest = measured.reduce((low, next) =>
      next.ratio < low.ratio ? next : low,
    );

    expect(measured.filter(({ ratio }) => ratio < contrastFloors.body)).toEqual(
      [],
    );
    // The dark looks' pressed washes carry the same red 900 text as every other
    // theme, so the tightest placement is the warmest of them rather than the
    // base light theme, whose text moved a step deeper with its soft surface.
    expect(tightest.name).toBe(
      "Dark · Windows XP (Luna)/destructiveSoftForeground/active",
    );
    expect(tightest.ratio.toFixed(2)).toBe("8.06");
  });
});

/**
 * Guards the selected row a floating list paints in its own text role. The
 * floating-row suite above measured `popoverForeground` on the two washes a row
 * tints while the pointer moves; the row that is **chosen** fills `selected`
 * instead, and the primitives' `Select` keeps `text-popover-foreground` over
 * `bg-selected` — so a selection that drifted toward the popover's text role
 * erased the row it had just selected while every hover case stayed green.
 */
describe("the selected row's own role on the selection wash", () => {
  const pair = contrastPairs.find(
    ({ foreground, background, floor }) =>
      foreground === "popoverForeground" &&
      background === "selected" &&
      floor === "body",
  );

  it("measures the popover role on the selection wash", () => {
    expect(pair).toBeDefined();
  });

  it("holds the painter the pair exists for", () => {
    // The pair only means something while the row still rests in that role: the
    // primitives' select row is `text-popover-foreground` over `bg-selected`.
    const source = readFileSync(
      new URL("../../primitives/src/recipe/index.ts", import.meta.url),
      "utf8",
    );
    const row = source.slice(
      source.indexOf("export const selectItemClass"),
      source.indexOf("// ── NumberField"),
    );

    expect(row).toContain("text-popover-foreground");
    expect(row).toContain('"bg-selected"');
  });

  it("reports a popover role painted into its own selection", () => {
    const broken = {
      colors: { ...lightColors, popoverForeground: lightColors.selected },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "popoverForeground" && background === "selected",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("clears the body floor in every shipped theme, with the dark looks tightest", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const measured = shipped.map((theme) => ({
      name: theme.name,
      floor: contrastFloorsFor(theme).body,
      ratio: contrastRatio(
        theme.colors.popoverForeground,
        theme.colors.selected,
      ),
    }));
    const hidden = measured.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = measured.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );

    expect(hidden).toEqual([]);
    // A dark selection is a deep tint under light text, so the warmest look is
    // the tightest rather than either base theme.
    expect(tightest.name).toBe("Dark · Windows XP (Luna)");
    expect(printedRatio(tightest.ratio)).toBe("9.25:1");
  });

  it("is the placement both pages teach", () => {
    const page = (path: string): string =>
      readFileSync(
        new URL(`../../../${path}`, import.meta.url),
        "utf8",
      ).replace(/\s+/g, " ");

    expect(page("docs/tokens.md")).toContain(
      "the popover's text role on the `selected` wash",
    );
    expect(page("docs/design-system.md")).toContain(
      "the popover's text role on the `selected` wash",
    );
  });
});

/**
 * Guards the one state the contract used to skip entirely. `disabled` and
 * `disabledForeground` are painted as a pair by a disabled field, a select's
 * value and a fieldset legend, and **no** pair measured them — so a palette edit
 * could set the unavailable label to its own fill and the whole suite stayed
 * green. WCAG exempts inactive components from the text floors, so this is not
 * an AA claim: the floor only says a disabled control is still seen as one.
 */
describe("disabled text", () => {
  const surfaces = [
    "disabled",
    "background",
    "card",
    "popover",
    "muted",
    "secondary",
  ] as const;

  it("measures the unavailable label on the fill and the page", () => {
    const missing = surfaces
      .filter(
        (background) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === "disabledForeground" &&
              pair.background === background &&
              pair.floor === "disabled",
          ),
      )
      .map((background) => `disabledForeground/${background}`);

    expect(missing).toEqual([]);
  });

  it("holds the disabled floor below the readable text floor", () => {
    // A disabled label is deliberately quiet; holding it to AA would be a
    // readability claim the state does not make.
    expect(contrastFloors.disabled).toBeLessThan(contrastFloors.secondary);
  });

  it("reports an unavailable label painted into its own fill", () => {
    const broken = {
      colors: { ...lightColors, disabledForeground: lightColors.disabled },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "disabledForeground" && background === "disabled",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.disabled });
  });

  it("reports an unavailable label that matches the page", () => {
    const broken = {
      colors: { ...lightColors, disabledForeground: lightColors.background },
    };
    const failures = contrastFailures(broken).map(
      ({ foreground, background }) => `${foreground}/${background}`,
    );

    expect(failures).toContain("disabledForeground/background");
    expect(failures).toContain("disabledForeground/card");
    expect(failures).toContain("disabledForeground/popover");
  });

  it("reports an unavailable label that matches the group strip it sits in", () => {
    // A disabled field inside a toolbar or a segmented panel: `disabled` is the
    // `muted` value in the base light theme, so the label has no fill of its own
    // and the strip around it is the only background it has.
    const broken = {
      colors: { ...lightColors, disabledForeground: lightColors.muted },
    };
    const failures = contrastFailures(broken).map(
      ({ foreground, background }) => `${foreground}/${background}`,
    );

    expect(failures).toContain("disabledForeground/muted");
    expect(failures).toContain("disabledForeground/secondary");
  });

  it("has the least headroom on the panel the catalogue names", () => {
    // The page prints a tightest placement, so the measurement and the sentence
    // move together: a palette that closes the gap fails here first.
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const tightest = shipped
      .flatMap((theme) =>
        (["muted", "secondary"] as const).map((background) => ({
          name: `${theme.name}/${background}`,
          ratio:
            contrastRatio(
              theme.colors.disabledForeground,
              theme.colors[background],
            ) ?? 0,
        })),
      )
      .reduce((low, next) => (next.ratio < low.ratio ? next : low));

    expect(tightest.name).toBe("Dark · Linux/secondary");
    expect(tightest.ratio.toFixed(2)).toBe("1.56");
    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(
      `label on its \`secondary\` panel at ${tightest.ratio.toFixed(2)}:1`,
    );
  });
});

/**
 * Guards the surfaces a focused control's ring and a selected row's second line
 * are painted on. The bug this holds: the contract measured the ring on the
 * page's three surfaces only, and secondary text on every surface but a
 * selection — so a control focused inside a muted toolbar, or a description in
 * a selected row, could ship unreadable. The pair found one: Linux dark painted
 * `selected` so light that `mutedForeground` reached 4.26:1 against the 4.5
 * floor, and the palette was deepened to `#1B3F60`.
 */
describe("ring and selection surfaces", () => {
  it("measures the ring on every strip a control can sit on", () => {
    const missing = ["background", "card", "popover", "muted", "secondary"]
      .filter(
        (background) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === "ring" &&
              pair.background === background &&
              pair.floor === "boundary",
          ),
      )
      .map((background) => `ring/${background}`);

    expect(missing).toEqual([]);
  });

  it("measures secondary text on a selected surface", () => {
    expect(
      contrastPairs.some(
        (pair) =>
          pair.foreground === "mutedForeground" &&
          pair.background === "selected" &&
          pair.floor === "secondary",
      ),
    ).toBe(true);
  });

  it("reports a ring that disappears into a muted strip", () => {
    const broken = { colors: { ...lightColors, ring: lightColors.muted } };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "ring" && background === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
  });

  it("reports secondary text that matches its selected surface", () => {
    const broken = {
      colors: { ...lightColors, mutedForeground: lightColors.selected },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "mutedForeground" && background === "selected",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.secondary });
  });
});

/**
 * Guards the text a **selected row** paints. The table measured a selection's
 * second line (`mutedForeground`/`selected`) and read the row's *title* as the
 * recipe's `text-foreground`, while `ListItemTitle` overrides that colour with
 * the row's own role (`theme.colors.selectedForeground`). The role the title
 * really paints was held to the **secondary** floor — a label on a filled action
 * — even though a row title is body text, so a brand whose selected row sits at
 * 5:1 passed the gate the inventory says holds it to the body floor. The row
 * also tints a wash under itself while the pointer moves (`accent` on hover,
 * `active` on press) and the title keeps its role on that wash, so all four
 * surfaces carry a body-floor pair. `foreground` on `selected` stays measured
 * for the primitives' `surface="selected"` + default `Text`, which paints the
 * page role in the same slot.
 */
describe("the text a selected row keeps", () => {
  const washes = ["hover", "active", "accent"] as const;
  const titleSurfaces = ["selected", ...washes] as const;

  it("holds the title's role to the body floor on its fill and every wash", () => {
    const missing = [
      ...(contrastPairs.some(
        (pair) =>
          pair.foreground === "foreground" &&
          pair.background === "selected" &&
          pair.floor === "body",
      )
        ? []
        : ["foreground/selected"]),
      ...titleSurfaces
        .filter(
          (background) =>
            !contrastPairs.some(
              (pair) =>
                pair.foreground === "selectedForeground" &&
                pair.background === background &&
                pair.floor === "body",
            ),
        )
        .map((background) => `selectedForeground/${background}`),
    ];

    expect(missing).toEqual([]);
  });

  it("holds the roles the row painters actually use", () => {
    // The pairs only mean something if the shipped row still paints them: the
    // title overrides its recipe with the row's role, the row fills `selected`,
    // and the two washes it tints while the pointer moves are the ones measured
    // above. The recipe's `text-foreground` stays asserted because it is the
    // primitives' painter for the same slot, not this one.
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const row = readFileSync(
      new URL("../../components/src/list.tsx", import.meta.url),
      "utf8",
    );
    const title = recipes.slice(
      recipes.indexOf("export const LIST_ITEM_TITLE ="),
      recipes.indexOf("export const LIST_ITEM_DESCRIPTION ="),
    );
    const titlePart = row.slice(
      row.indexOf("export const ListItemTitle ="),
      row.indexOf("export const ListItemDescription ="),
    );

    expect(title).toContain("text-foreground");
    expect(titlePart).toContain("theme.colors.selectedForeground");
    expect(row).toContain("backgroundColor: theme.colors.selected");
    expect(row).toContain("color: theme.colors.selectedForeground");
    expect(row).toContain("{ backgroundColor: theme.colors.accent }");
    expect(row).toContain("{ backgroundColor: theme.colors.active }");
  });

  it("reports a primitive surface that swallows the text on it", () => {
    const broken = {
      colors: { ...lightColors, selected: lightColors.foreground },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "foreground" && background === "selected",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("reports a wash that matches the text a selected row keeps", () => {
    const broken = {
      colors: { ...lightColors, accent: lightColors.selectedForeground },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "selectedForeground" && background === "accent",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.body });
  });

  it("fails a title the secondary floor would have passed", () => {
    // 5:1 on the light selection: above the 4.5 the role used to be held to,
    // under the 7 a row title has to reach.
    const broken = {
      colors: { ...lightColors, selectedForeground: "#5F5F5F" },
    };
    const ratio = contrastRatio(
      broken.colors.selectedForeground,
      broken.colors.selected,
    );
    const failure = contrastFailures(broken).find(
      ({ foreground, background }) =>
        foreground === "selectedForeground" && background === "selected",
    );

    expect(ratio).toBeGreaterThan(contrastFloors.secondary);
    expect(ratio).toBeLessThan(contrastFloors.body);
    expect(failure).toMatchObject({ floor: contrastFloors.body });
  });

  it("clears the floor in every shipped theme, tightest on the base dark press", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    /** The floor the contract gives a pair, so the sweep holds no second copy. */
    const floorOf = (
      theme: (typeof shipped)[number],
      foreground: keyof ThemeColors,
      background: keyof ThemeColors,
    ): number => {
      const pair = contrastPairs.find(
        (entry) =>
          entry.foreground === foreground && entry.background === background,
      );
      return pair === undefined ? 0 : contrastFloorsFor(theme)[pair.floor];
    };
    const placements = shipped.flatMap((theme) => [
      {
        name: `${theme.name}/foreground/selected`,
        ratio: contrastRatio(theme.colors.foreground, theme.colors.selected),
        floor: floorOf(theme, "foreground", "selected"),
      },
      ...titleSurfaces.map((background) => ({
        name: `${theme.name}/selectedForeground/${background}`,
        ratio: contrastRatio(
          theme.colors.selectedForeground,
          theme.colors[background],
        ),
        floor: floorOf(theme, "selectedForeground", background),
      })),
    ]);
    const hidden = placements.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );

    expect(hidden).toEqual([]);
    // Every placement takes the body floor, including the title's role: this is
    // what makes the sweep the contract's, not a lower local one.
    expect(placements.map(({ floor }) => floor)).toEqual(
      placements.map(() => contrastFloors.body),
    );
    expect(tightest.name).toBe("Dark/selectedForeground/active");
    expect(tightest.ratio?.toFixed(2)).toBe("7.31");
    // The catalogue prints the number this suite measures, so a palette edit
    // moves the sentence instead of leaving a stale claim.
    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(`pressed wash at ${tightest.ratio?.toFixed(2)}:1`);
  });
});

/**
 * Guards the same rule for a control **boundary**: an outline button in a muted
 * toolbar and a bordered control in a filled panel draw their edge on the strip
 * they sit in, not on the page. The bug this holds: `borderStrong` was measured
 * on `background`, `card` and `input` only, so the base light theme shipped
 * `#848E9E` at 2.92:1 on `muted`, the base dark theme `#6B7484` at 2.81:1 on
 * `secondary` and Linux light `#8A8884` at 2.97:1 on its own muted strip, all
 * under the 3:1 boundary floor and none of them noticed.
 */
describe("a control boundary on the strip it sits on", () => {
  it("measures the strong boundary on every surface a control sits in", () => {
    const missing = [
      "background",
      "card",
      "input",
      "muted",
      "secondary",
      // A floating surface holds controls too: a dialog's footer or a popover's
      // form. The ring was measured there and the edge was not.
      "popover",
      // A bordered control tints its own surface while hovered or pressed and
      // keeps its edge, so the wash is a strip the edge is painted on too.
      "hover",
      "active",
    ]
      .filter(
        (background) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === "borderStrong" &&
              pair.background === background &&
              pair.floor === "boundary",
          ),
      )
      .map((background) => `borderStrong/${background}`);

    expect(missing).toEqual([]);
  });

  it("reports the boundary value the base themes shipped before this pair", () => {
    const lightBefore = {
      colors: { ...lightColors, borderStrong: "#848E9E" },
    };
    const muted = contrastFailures(lightBefore).find(
      ({ foreground, background }) =>
        foreground === "borderStrong" && background === "muted",
    );

    expect(muted?.floor).toBe(contrastFloors.boundary);
    expect(muted?.ratio).toBeCloseTo(2.92, 2);
  });

  it("reports an edge that disappears into the strip it sits in", () => {
    const broken = {
      colors: { ...lightColors, borderStrong: lightColors.secondary },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "borderStrong" && background === "secondary",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
  });

  it("reports the pressed edge the secondary action painted before this pair", () => {
    // The warning that found the wash half: the secondary action paints
    // `borderStrong` and hands the same element to `active`, so its edge sits on
    // the pressed wash. The base light value was under the floor there while the
    // resting strips all passed.
    const pressed = contrastFailures({
      colors: { ...lightColors, borderStrong: "#75808F" },
    }).find(
      ({ foreground, background }) =>
        foreground === "borderStrong" && background === "active",
    );

    expect(pressed?.floor).toBe(contrastFloors.boundary);
    expect(pressed?.ratio).toBeCloseTo(2.88, 2);

    // The high-contrast variant has to clear its own 4.5 floor, and the old
    // value did not: the default floors would have called it a pass.
    const strict = contrastFailures(
      { colors: { ...highContrastDarkColors, borderStrong: "#A0A0A0" } },
      highContrastFloors,
    ).find(
      ({ foreground, background }) =>
        foreground === "borderStrong" && background === "active",
    );

    expect(strict?.floor).toBe(highContrastFloors.boundary);
    expect(strict?.ratio).toBeCloseTo(4.15, 2);
  });

  it("reports an edge painted in the wash it tints", () => {
    const broken = {
      colors: { ...lightColors, borderStrong: lightColors.hover },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "borderStrong" && background === "hover",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
  });

  it("holds the control a floating surface actually paints", () => {
    // The composition the pair exists for: `ConfirmDialog`'s cancel action is a
    // plain `Button`, whose default variant is `secondary` — the one variant
    // that owns a `borderStrong` edge — and it sits in the dialog's body, whose
    // recipe paints `bg-popover`. A popover holding a form paints the same pair.
    const button = readFileSync(
      new URL("../../components/src/internal/button.tsx", import.meta.url),
      "utf8",
    );
    const confirm = readFileSync(
      new URL("../../components/src/confirm-dialog.tsx", import.meta.url),
      "utf8",
    );
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );

    expect(button).toContain('variant = "secondary"');
    expect(button).toContain("borderColor: theme.colors.borderStrong");
    expect(confirm).toContain('testId="confirm-cancel"');
    expect(recipe(recipes, "DIALOG_CONTENT")).toContain("bg-popover");
    expect(recipe(recipes, "POPOVER_CONTENT")).toContain("bg-popover");
  });

  it("clears the boundary floor on a floating surface", () => {
    const measured = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ].map((theme) => ({
      theme: theme.name,
      ratio: contrastRatio(theme.colors.borderStrong, theme.colors.popover),
      floor: contrastFloorsFor(theme).boundary,
    }));

    expect(
      measured.filter(
        ({ ratio, floor }) => ratio === undefined || ratio < floor,
      ),
    ).toEqual([]);

    // A neutral edge on a floating surface is a strong pair now that the edge
    // that also has to answer on a message's tint moved up; the tightest of the
    // sixteen is Linux dark's popover.
    const tightest = measured.reduce((low, placement) =>
      (placement.ratio ?? 0) < (low.ratio ?? 0) ? placement : low,
    );
    expect(tightest.theme).toBe("Dark · Linux");
    expect(tightest.ratio).toBeCloseTo(4.48, 2);
    // The catalogue prints the number this suite measures, so a palette edit
    // moves the sentence instead of leaving a stale claim.
    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(`Linux dark's popover at ${printedRatio(tightest.ratio)}`);
  });
});

/**
 * Guards the edge a control paints on a **message's own tint**.
 *
 * The bug this holds: `contrastPairs` measured `borderStrong` on every strip a
 * control rests on — the page, a card, a field, a toolbar, a filled panel, a
 * floating surface, the washes a bordered control tints and the washes a row
 * paints under it — and on none of the four soft status tints a message is
 * painted on. An `Alert` fills its tone's `xSoft` role and its description is a
 * container, so the documented action (`<Button onClick={retry}>Try again</Button>`,
 * the default variant) draws the strong edge on that tint. Measured, thirteen of
 * the sixteen styles missed the 3:1 floor there — the worst being the base dark
 * theme's edge on `warningSoft` at 2.23:1 — so a palette could ship a button
 * with no outline inside the one component built to be noticed, while every
 * strip the button rested on passed. The middle of the range is where the
 * gradient meets the label, so a boundary is what identifies the control: the
 * neutral fill band is one lightness in each mode and the pale tints share it
 * (a `secondary` action reads 1.01–1.04:1 on the green and amber tints of the
 * light styles), which is the same reason a field is carried by its edge.
 */
describe("a control's edge on a message's own tint", () => {
  const tints = [
    "infoSoft",
    "successSoft",
    "warningSoft",
    "destructiveSoft",
  ] as const;

  it("measures the strong boundary on each soft status tint", () => {
    const missing = tints
      .filter(
        (background) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === "borderStrong" &&
              pair.background === background &&
              pair.floor === "boundary",
          ),
      )
      .map((background) => `borderStrong/${background}`);

    expect(missing).toEqual([]);
  });

  it("holds the painters that put a default action inside an alert", () => {
    // The pairs only mean something while the composition still exists: the
    // alert fills its tone's soft role, its description is a container, and the
    // documented action is the default variant — the one that owns the edge.
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const alert = readFileSync(
      new URL("../../components/src/alert.tsx", import.meta.url),
      "utf8",
    );
    const button = readFileSync(
      new URL("../../components/src/internal/button.tsx", import.meta.url),
      "utf8",
    );
    const page = readFileSync(
      new URL("../../components/docs/alert.mdx", import.meta.url),
      "utf8",
    );

    const tones = recipes.slice(
      recipes.indexOf("export const ALERT_TONES"),
      recipes.indexOf("export const ALERT_ICON"),
    );
    tints.forEach((tint) => expect(tones).toContain(`bg-${tint}`));
    expect(alert).toContain("ALERT_TONES[value]");
    expect(alert).toContain("AlertDescription");
    expect(button).toContain('variant = "secondary"');
    expect(button).toContain("borderColor: theme.colors.borderStrong");
    expect(page).toContain('<Alert tone="danger">');
    expect(page).toContain("<Button onClick={retry}>Try again</Button>");
  });

  it("reports an edge that disappears into the tint it sits on", () => {
    tints.forEach((background) => {
      const broken = {
        colors: { ...lightColors, borderStrong: lightColors[background] },
      };

      expect(
        contrastFailures(broken).find(
          ({ foreground, background: strip }) =>
            foreground === "borderStrong" && strip === background,
        ),
      ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
    });
  });

  it("keeps the edge findable on every tint in every shipped theme", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const placements = shipped.flatMap((theme) =>
      tints.map((background) => ({
        name: `${theme.name}/borderStrong/${background}`,
        ratio: contrastRatio(
          theme.colors.borderStrong,
          theme.colors[background],
        ),
        floor: contrastFloorsFor(theme).boundary,
      })),
    );
    const hidden = placements.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );

    expect(hidden).toEqual([]);
    // The pale red tint is the hardest of the four for a neutral edge: macOS
    // light's, at 3.09:1 against the 3:1 floor.
    expect(tightest.name).toBe(
      `${platformTheme(themes.light, "darwin").name}/borderStrong/destructiveSoft`,
    );
    expect(tightest.ratio).toBeCloseTo(3.09, 2);
    // The catalogue prints the number this suite measures, so a palette edit
    // moves the sentence instead of leaving a stale claim.
    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(`red message tint at ${printedRatio(tightest.ratio)}`);
  });
});

/**
 * Guards the ring's **own** surface. The table measured the ring on the strips a
 * control rests on — the page, a card, a popover, a toolbar and a segmented
 * panel — and on nothing the same element paints behind itself: `list.tsx`
 * fills `selected`, tints `accent` while hovered and `active` while pressed, and
 * declares the keyboard ring on that row; a ghost or outline action tints the
 * same two washes under its ring; and a field's ring borders the field's own
 * fill (`input`), which is not the page it sits on. `outlineOffset: 0` draws the
 * line on the border box, so its inner side touches the fill and its outer side
 * the strip behind it — a ring that matches the row it surrounds is the boundary
 * of nothing, and no pair measured any of those five.
 */
describe("the ring on the fill it hugs", () => {
  const fills = ["input", "selected", "hover", "active", "accent"] as const;

  it("measures the ring on every fill a focused control paints", () => {
    const missing = fills
      .filter(
        (background) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === "ring" &&
              pair.background === background &&
              pair.floor === "boundary",
          ),
      )
      .map((background) => `ring/${background}`);

    expect(missing).toEqual([]);
  });

  it("holds the painters that put a ring on a wash", () => {
    // The pairs only mean something while the elements still paint them: the
    // list row declares the ring at rest and tints all three of its own washes,
    // and the ghost and outline actions do the same under their own ring.
    const row = readFileSync(
      new URL("../../components/src/list.tsx", import.meta.url),
      "utf8",
    );
    const button = readFileSync(
      new URL("../../components/src/internal/button.tsx", import.meta.url),
      "utf8",
    );

    expect(declaresKeyboardRing(row), "list.tsx").toBe(true);
    expect(row).toContain("backgroundColor: theme.colors.selected");
    expect(row).toContain("hover: { backgroundColor: theme.colors.accent }");
    expect(row).toContain("active: { backgroundColor: theme.colors.active }");
    expect(button).toContain("hover: { backgroundColor: theme.colors.hover }");
    expect(button).toContain(
      "active: { backgroundColor: theme.colors.active }",
    );
    expect(declaresKeyboardRing(button), "internal/button.tsx").toBe(true);
  });

  it("reports a ring that disappears into the row it surrounds", () => {
    const broken = { colors: { ...lightColors, ring: lightColors.selected } };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "ring" && background === "selected",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
  });

  it("reports a ring the pressed wash hides", () => {
    const broken = { colors: { ...lightColors, ring: lightColors.active } };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "ring" && background === "active",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
  });

  it("keeps the ring findable on every fill in every shipped, platform and authored theme", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const placements = shipped.flatMap((theme) =>
      fills.map((background) => ({
        name: `${theme.name}/ring/${background}`,
        ratio: contrastRatio(theme.colors.ring, theme.colors[background]),
        floor: contrastFloorsFor(theme).boundary,
      })),
    );
    const hidden = placements.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );

    expect(hidden).toEqual([]);
    expect(tightest.name).toBe("Light/ring/active");
    expect(tightest.ratio?.toFixed(2)).toBe("3.04");
    // The catalogue prints the number this suite measures, so a palette edit
    // moves the sentence instead of leaving a stale claim.
    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(`pressed wash at ${tightest.ratio?.toFixed(2)}:1`);
  });
});

/**
 * Guards the edge a control draws **inside a row's wash**.
 *
 * The bug this holds: the boundary reached every strip a control rests on and the
 * wash the same control tints under itself (`hover`, `active`), while the two
 * washes a *row* paints under a control in its `trailing` slot — `accent` under
 * the pointer, `selected` once the row is chosen — were measured for the ring and
 * for nothing else. A list row offers that slot to an explicit action (`docs`:
 * "render an explicit action control in the row's `trailing` slot"), and the
 * components' `Button` defaults to `secondary`, the one variant that owns a
 * `borderStrong` edge. So a brand whose edge matched the row it sits in shipped
 * an outlined action with no outline in the one place a list puts it, while every
 * pair on the strips it rests on passed.
 */
describe("the edge of a control inside a row's wash", () => {
  const washes = ["accent", "selected"] as const;

  it("measures the strong boundary on both washes a row paints", () => {
    const missing = washes
      .filter(
        (background) =>
          !contrastPairs.some(
            (pair) =>
              pair.foreground === "borderStrong" &&
              pair.background === background &&
              pair.floor === "boundary",
          ),
      )
      .map((background) => `borderStrong/${background}`);

    expect(missing).toEqual([]);
  });

  it("holds the painters that put a bordered action inside a row", () => {
    // The pairs only mean something while the composition still exists: the row
    // owns the `trailing` slot, paints `accent` on hover and `selected` when
    // chosen, and the default action paints the measured strong edge.
    const row = readFileSync(
      new URL("../../components/src/list.tsx", import.meta.url),
      "utf8",
    );
    const button = readFileSync(
      new URL("../../components/src/internal/button.tsx", import.meta.url),
      "utf8",
    );

    expect(row).toContain("readonly trailing?: ReactNode");
    expect(row).toContain("hover: { backgroundColor: theme.colors.accent }");
    expect(row).toContain("backgroundColor: theme.colors.selected");
    expect(row).toContain("{trailing}");
    expect(button).toContain('variant = "secondary"');
    expect(button).toContain("borderColor: theme.colors.borderStrong");
  });

  it("reports an edge that disappears into the row wash it sits in", () => {
    washes.forEach((background) => {
      const broken = {
        colors: { ...lightColors, borderStrong: lightColors[background] },
      };

      expect(
        contrastFailures(broken).find(
          ({ foreground, background: strip }) =>
            foreground === "borderStrong" && strip === background,
        ),
      ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
    });
  });

  it("keeps the edge findable on both washes in every shipped theme", () => {
    const shipped = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const placements = shipped.flatMap((theme) =>
      washes.map((background) => ({
        name: `${theme.name}/borderStrong/${background}`,
        ratio: contrastRatio(
          theme.colors.borderStrong,
          theme.colors[background],
        ),
        floor: contrastFloorsFor(theme).boundary,
      })),
    );
    const hidden = placements.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );

    expect(hidden).toEqual([]);
    // A neutral edge on a wash a light palette tints is the hardest of the
    // sixteen now that the popover and tint strips moved the edge up: the
    // authored Windows XP look's selected row, at 3.18:1 against the 3:1 floor.
    expect(tightest.name).toBe(
      `${retroTheme(themes.light, "luna").name}/borderStrong/selected`,
    );
    expect(tightest.ratio).toBeCloseTo(3.18, 2);
    // The catalogue prints the number this suite measures, so a palette edit
    // moves the sentence instead of leaving a stale claim.
    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(`selected row at ${printedRatio(tightest.ratio)}`);
  });
});

/**
 * Guards the edge an invalid control paints. A failed validation swaps the
 * control's border and its focus line to `destructive` — a field's border, the
 * `focusVisible` outline a primitive declares while invalid — so that role is a
 * *boundary* on every strip a control sits on. The bug this holds: the page,
 * card, popover and `muted` strips were held only by the mark contract, and a
 * field's own fill (`input`) and a filled panel (`secondary`) were held by
 * nothing, although both roles are painted there.
 */
describe("the invalid state's edge", () => {
  const surfaces = [
    "background",
    "card",
    "popover",
    "input",
    "muted",
    "secondary",
  ] as const;

  const isMarkSurface = (surface: (typeof surfaces)[number]) =>
    indicatorSurfaces.some((strip) => strip === surface);

  it("measures the invalid edge on every strip a control sits on", () => {
    const missing = surfaces.filter(
      (background) =>
        !contrastPairs.some(
          (pair) =>
            pair.foreground === "destructive" &&
            pair.background === background &&
            pair.floor === "boundary",
        ) &&
        !(indicatorRoles.includes("destructive") && isMarkSurface(background)),
    );

    expect(missing).toEqual([]);
  });

  it("reports an invalid edge that matches the field it sits in", () => {
    const broken = {
      colors: { ...lightColors, destructive: lightColors.input },
    };

    expect(
      contrastFailures(broken).find(
        ({ foreground, background }) =>
          foreground === "destructive" && background === "input",
      ),
    ).toMatchObject({ ratio: 1, floor: contrastFloors.boundary });
  });

  it("keeps the invalid edge visible on every strip in every shipped theme", () => {
    const samples = [
      { theme: lightTheme, floors: contrastFloors },
      { theme: darkTheme, floors: contrastFloors },
      { theme: highContrastLightTheme, floors: highContrastFloors },
      { theme: highContrastDarkTheme, floors: highContrastFloors },
    ].flatMap(({ theme, floors }) =>
      surfaces.map((surface) => ({
        theme: theme.name,
        surface,
        ratio: contrastRatio(theme.colors.destructive, theme.colors[surface]),
        floor: floors.boundary,
      })),
    );
    const hidden = samples.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );

    expect(hidden).toEqual([]);
  });
});

describe("contrastFailures", () => {
  it("passes every shipped theme", () => {
    expect(contrastFailures(lightTheme)).toEqual([]);
    expect(contrastFailures(darkTheme)).toEqual([]);
    expect(
      contrastFailures(highContrastLightTheme, highContrastFloors),
    ).toEqual([]);
    expect(contrastFailures(highContrastDarkTheme, highContrastFloors)).toEqual(
      [],
    );
  });

  it("reports the pair a bad value breaks, with its ratio and floor", () => {
    const broken = {
      colors: { ...lightColors, mutedForeground: lightColors.muted },
    };
    const failures = contrastFailures(broken);
    const muted = failures.find(
      ({ foreground, background }) =>
        foreground === "mutedForeground" && background === "muted",
    );

    expect(muted?.background).toBe("muted");
    expect(muted?.floor).toBe(contrastFloors.secondary);
    expect(muted?.ratio).toBeCloseTo(1, 5);
  });

  it("measures the text typed into an input against its field", () => {
    // An input's own foreground and fill are a pair in their own right: the
    // field is often lighter or darker than the surface the control sits on.
    const broken = {
      colors: { ...lightColors, inputForeground: lightColors.input },
    };
    const failures = contrastFailures(broken);

    expect(
      failures.find(({ foreground }) => foreground === "inputForeground"),
    ).toMatchObject({ background: "input", floor: contrastFloors.body });
  });

  it("measures secondary text on every surface it can sit on", () => {
    const broken = {
      colors: { ...lightColors, mutedForeground: lightColors.background },
    };
    const measured = contrastFailures(broken).map(
      ({ foreground, background }) => `${foreground}/${background}`,
    );

    expect(measured).toContain("mutedForeground/background");
    expect(measured).toContain("mutedForeground/card");
    expect(measured).toContain("mutedForeground/popover");
  });

  it("reports an unmeasurable pair instead of skipping it", () => {
    const translucent = {
      colors: { ...lightColors, mutedForeground: "#191D2580" },
    };
    const failures = contrastFailures(translucent);

    expect(
      failures.some(
        (failure) =>
          failure.foreground === "mutedForeground" &&
          failure.ratio === undefined,
      ),
    ).toBe(true);
  });

  it("holds a high-contrast theme to the raised floors", () => {
    // The default floors pass this theme; the AAA floors do not, because its
    // secondary text was designed for the default theme's 4.5:1.
    expect(contrastFailures(lightTheme, highContrastFloors)).not.toEqual([]);
  });
});

/**
 * Guards the second fill a field paints.
 *
 * `contrastPairs` measured a field's value and placeholder on `input`, and a
 * **composite** field does not paint that role: a search, tag or mention field,
 * the chat composer, the inline edit and the colour picker's hex field paint
 * `bg-background` in `@gpuixui/tw`'s recipes and keep `text-input-foreground`
 * inside it, so the page is a field surface too. Nothing measured the roles on
 * it, and measuring found two shipped misses: Aero light's placeholder at
 * 4.35:1 on its own window and macOS light's inherited value at 4.49:1 on its,
 * both under the 4.5:1 floor. Aero's is `#5B6C7B` and the light base `#626C7B`
 * now. The pairs are also the contract for `nativeTextTheme(theme, "background")`
 * — the fill argument a native text host is handed — so a brand is measured on
 * the same surface its placeholder is painted on.
 */
describe("the text a composite field keeps on its own fill", () => {
  const measured = (foreground: string, background: string): boolean =>
    contrastPairs.some(
      (pair) =>
        pair.foreground === foreground && pair.background === background,
    );

  it("measures the value and the placeholder on the page role", () => {
    expect(measured("inputForeground", "background")).toBe(true);
    expect(measured("placeholder", "background")).toBe(true);
    // The other field fill keeps its pair: both are painted by the library.
    expect(measured("inputForeground", "input")).toBe(true);
    expect(measured("placeholder", "input")).toBe(true);
  });

  it("holds the painters that make the page a field fill", () => {
    const tw = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    const composites = [
      ["SEARCH_INPUT", "SEARCH_INPUT_CONTROL"],
      ["TAG_INPUT_ROOT", "TAG_INPUT_FIELD"],
      ["MENTION_INPUT_FIELD", "MENTION_INPUT_CONTROL"],
      ["INLINE_EDIT_INPUT", "INLINE_EDIT_INPUT"],
      ["COLOR_PICKER_INPUT", "COLOR_PICKER_INPUT"],
      ["CHAT_COMPOSER", "CHAT_COMPOSER_FIELD"],
    ] as const;

    composites.forEach(([field, control]) => {
      expect(recipe(tw, field), field).toContain("bg-background");
      expect(recipe(tw, control), control).toContain("text-input-foreground");
    });

    // The plain field paints the other fill, through its own style rather than
    // a recipe class.
    const field = readFileSync(
      new URL("../../components/src/field.tsx", import.meta.url),
      "utf8",
    );
    expect(field).toContain("backgroundColor: isDisabled");
    expect(field).toContain("theme.colors.input");
  });

  it("reports the placeholder a page-coloured field could not carry", () => {
    // The two values the contract found, and the current one that clears it.
    const aero = retroTheme(themes.light, "aero");
    const darwin = platformTheme(themes.light, "darwin");

    expect(contrastRatio("#5F7181", aero.colors.background)).toBeCloseTo(
      4.35,
      2,
    );
    expect(contrastRatio("#66707F", darwin.colors.background)).toBeCloseTo(
      4.49,
      2,
    );
    expect(
      contrastRatio(aero.colors.placeholder, aero.colors.background),
    ).toBeGreaterThanOrEqual(contrastFloors.secondary);
    expect(
      contrastRatio(darwin.colors.placeholder, darwin.colors.background),
    ).toBeGreaterThanOrEqual(contrastFloors.secondary);
  });

  it("reports a placeholder painted in its own page", () => {
    const failures = contrastFailures({
      colors: { ...lightColors, placeholder: lightColors.background },
    });

    expect(
      failures.filter(
        ({ foreground, background }) =>
          foreground === "placeholder" && background === "background",
      ),
    ).toEqual([
      {
        foreground: "placeholder",
        background: "background",
        ratio: 1,
        floor: contrastFloors.secondary,
      },
    ]);
  });

  it("passes every shipped theme on both field fills", () => {
    const styles = [
      lightTheme,
      darkTheme,
      highContrastLightTheme,
      highContrastDarkTheme,
      ...platformNames.flatMap((platform) =>
        [themes.light, themes.dark].map((theme) =>
          platformTheme(theme, platform),
        ),
      ),
      ...retroNames.flatMap((look) =>
        [themes.light, themes.dark].map((theme) => retroTheme(theme, look)),
      ),
    ];

    styles.forEach((theme) => {
      const failures = contrastFailures(theme, contrastFloorsFor(theme)).filter(
        ({ foreground, background }) =>
          foreground === "placeholder"
            ? background === "background" || background === "input"
            : foreground === "inputForeground" &&
              (background === "background" || background === "input"),
      );
      expect(failures, theme.name).toEqual([]);
    });
  });
});

/**
 * Guards the **muted** text a field paints inside its own fill.
 *
 * The bug this guards: `mutedForeground` was measured on the page, a card, a
 * popover, a muted toolbar, a selected row and every state wash — and never on
 * the `input` role, which is the fill a field paints for itself. Three shipped
 * painters put the role there: a time picker's separator and its clear glyph
 * (`TIME_PICKER_SEPARATOR` / `TIME_PICKER_CLEAR` over `TIME_PICKER_ROOT`'s
 * `bg-input`), a number field's stepper chevrons, and `nativeTextTheme`'s
 * `textMuted` over `bg: input`. A brand with a tinted field fill could therefore
 * swallow the colon between its time segments while every report stayed empty.
 */
describe("the muted text inside a field's own fill", () => {
  const measured = (foreground: string, background: string): boolean =>
    contrastPairs.some(
      (pair) =>
        pair.foreground === foreground && pair.background === background,
    );

  it("measures the muted role on the fill a field paints for itself", () => {
    expect(measured("mutedForeground", "input")).toBe(true);
    // The same fill's other two text roles keep their pairs.
    expect(measured("inputForeground", "input")).toBe(true);
    expect(measured("placeholder", "input")).toBe(true);
    // A colon between two segments is text, and a chevron beside it is a mark:
    // the secondary floor covers both, and high contrast raises it to AAA.
    expect(
      contrastPairs.find(
        ({ foreground, background }) =>
          foreground === "mutedForeground" && background === "input",
      )?.floor,
    ).toBe("secondary");
  });

  it("holds the painters that put muted text inside a field", () => {
    const recipes = readFileSync(
      new URL("../../tw/src/recipes.ts", import.meta.url),
      "utf8",
    );
    expect(recipe(recipes, "TIME_PICKER_ROOT")).toContain("bg-input");
    expect(recipe(recipes, "TIME_PICKER_SEPARATOR")).toContain(
      "text-muted-foreground",
    );
    expect(recipe(recipes, "TIME_PICKER_CLEAR")).toContain(
      "text-muted-foreground",
    );

    // A number field's stepper chevrons sit in the field's own fill and take
    // the same role; the field chrome is the recipe that fills it.
    const primitives = readFileSync(
      new URL("../../primitives/src/recipe/index.ts", import.meta.url),
      "utf8",
    );
    const field = /const FIELD_BASE =\s*"([^"]*)"/.exec(primitives);
    expect(field?.[1]).toContain("bg-input");
    expect(
      readFileSync(
        new URL(
          "../../primitives/src/components/NumberField.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
    ).toContain("part.theme.colors.mutedForeground");

    // The native host's muted slot is the same role over the same fill, in the
    // package's own seam: `nativeTextTheme(theme)` defaults to a plain field's
    // `input` fill and hands the host `mutedForeground` as its muted text.
    const seam = readFileSync(
      new URL("./native-text.ts", import.meta.url),
      "utf8",
    );
    expect(seam).toContain("bg: theme.colors[fill]");
    expect(seam).toContain("textMuted: theme.colors.mutedForeground");
    expect(seam).toContain(`fill: NativeTextFill = "input"`);
  });

  it("reports the muted line a field's own fill swallows", () => {
    const failures = contrastFailures({
      colors: { ...lightColors, mutedForeground: lightColors.input },
    });

    expect(
      failures.filter(
        ({ foreground, background }) =>
          foreground === "mutedForeground" && background === "input",
      ),
    ).toEqual([
      {
        foreground: "mutedForeground",
        background: "input",
        ratio: 1,
        floor: contrastFloors.secondary,
      },
    ]);
  });

  it("keeps the muted line readable in every shipped theme", () => {
    const styles = [
      ...Object.values(themes),
      ...Object.values(highContrastThemes),
      ...platformNames.flatMap((platform) =>
        Object.values(themes).map((theme) => platformTheme(theme, platform)),
      ),
      ...retroNames.flatMap((look) =>
        Object.values(themes).map((theme) => retroTheme(theme, look)),
      ),
    ];
    const placements = styles.map((theme) => ({
      name: theme.name,
      ratio: contrastRatio(theme.colors.mutedForeground, theme.colors.input),
      floor: contrastFloorsFor(theme).secondary,
    }));
    const hidden = placements.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );

    expect(hidden).toEqual([]);
    expect(tightest.name).toBe("Light · Windows XP (Luna)");
    expect(tightest.ratio?.toFixed(2)).toBe("7.64");
    // The catalogue prints the number this suite measures, so a palette edit
    // moves the sentence instead of leaving a stale claim.
    expect(
      readFileSync(
        new URL("../../../docs/tokens.md", import.meta.url),
        "utf8",
      ).replace(/\s+/g, " "),
    ).toContain(`field's own fill at ${tightest.ratio?.toFixed(2)}:1`);
  });
});
