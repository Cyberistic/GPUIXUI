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
import { contrastFloorsFor } from "./audit.js";
import {
  contrastFailures,
  contrastFloors,
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
 * Guards the pair set a status message needs when it is written as text on a
 * surface rather than on its own tinted one — a field error, an inline warning,
 * or a `tone="destructive"` menu row on a popover. The bug this holds twice:
 * `FieldError` painted the solid `destructive` fill role as text, and no pair
 * measured it; later the same role was painted on a popover, and the table held
 * only `background` and `card`, so a menu row could ship below the body floor
 * with nothing to notice.
 */
describe("status text on a surface", () => {
  it("measures every tone's readable text on background, card and popover", () => {
    const missing = statusTones.flatMap((tone) =>
      ["background", "card", "popover"]
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
 * second line (`mutedForeground`/`selected`) and the two page roles on the
 * `hover`, `active` and `accent` washes, and nothing measured the pair the
 * components actually paint for the row's *title*: `ListItemTitle`'s recipe is
 * `text-foreground` and `list.tsx` fills `selected` behind it, so a brand that
 * brings its selection close to the page erases the label it just selected —
 * while the secondary line beside it still passes. The row also sets
 * `color: selectedForeground` and then tints a wash under itself as the pointer
 * arrives, so the role it hands its children is a pair of its own on every wash:
 * a press that matches that role leaves the row blank.
 */
describe("the text a selected row keeps", () => {
  const washes = ["hover", "active", "accent"] as const;

  it("measures the title on its selection and the row's role on every wash", () => {
    const missing = [
      ...(contrastPairs.some(
        (pair) =>
          pair.foreground === "foreground" &&
          pair.background === "selected" &&
          pair.floor === "body",
      )
        ? []
        : ["foreground/selected"]),
      ...washes
        .filter(
          (background) =>
            !contrastPairs.some(
              (pair) =>
                pair.foreground === "selectedForeground" &&
                pair.background === background &&
                pair.floor === "secondary",
            ),
        )
        .map((background) => `selectedForeground/${background}`),
    ];

    expect(missing).toEqual([]);
  });

  it("holds the roles the row painters actually use", () => {
    // The pairs only mean something if the shipped row still paints them: the
    // title's recipe sets its own colour, the row fills `selected` and hands its
    // children `selectedForeground`, and the two washes it tints while the
    // pointer moves are the ones measured above.
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

    expect(title).toContain("text-foreground");
    expect(row).toContain("backgroundColor: theme.colors.selected");
    expect(row).toContain("color: theme.colors.selectedForeground");
    expect(row).toContain("{ backgroundColor: theme.colors.accent }");
    expect(row).toContain("{ backgroundColor: theme.colors.active }");
  });

  it("reports a selection that swallows the title it carries", () => {
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
    ).toMatchObject({ ratio: 1, floor: contrastFloors.secondary });
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
    const placements = shipped.flatMap((theme) => [
      {
        name: `${theme.name}/foreground/selected`,
        ratio: contrastRatio(theme.colors.foreground, theme.colors.selected),
        floor: contrastFloorsFor(theme).body,
      },
      ...washes.map((background) => ({
        name: `${theme.name}/selectedForeground/${background}`,
        ratio: contrastRatio(
          theme.colors.selectedForeground,
          theme.colors[background],
        ),
        floor: contrastFloorsFor(theme).secondary,
      })),
    ]);
    const hidden = placements.filter(
      ({ ratio, floor }) => ratio === undefined || ratio < floor,
    );
    const tightest = placements.reduce((low, next) =>
      (next.ratio ?? 0) < (low.ratio ?? 0) ? next : low,
    );

    expect(hidden).toEqual([]);
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

    expect(row).toContain("...keyboardRing(theme)");
    expect(row).toContain("backgroundColor: theme.colors.selected");
    expect(row).toContain("hover: { backgroundColor: theme.colors.accent }");
    expect(row).toContain("active: { backgroundColor: theme.colors.active }");
    expect(button).toContain("hover: { backgroundColor: theme.colors.hover }");
    expect(button).toContain(
      "active: { backgroundColor: theme.colors.active }",
    );
    expect(button).toContain("...keyboardRing(theme)");
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
