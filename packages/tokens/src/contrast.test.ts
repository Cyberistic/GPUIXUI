/**
 * Guards the public contrast contract (plan 071).
 *
 * The bug these catch: the WCAG maths and the 48 documented pairs lived in
 * test-only code, so a consumer editing a copied platform style could not hold
 * their theme to the floors the library promises. These tests prove the public
 * check is the same one the suites run — known ratios, the shipped themes
 * passing, and a brand theme, an opaque selection wash and a malformed role
 * each failing with the pair named.
 *
 * It also holds the `compositeOver` JSDoc example to the function (plan 075):
 * the example printed `#808080` for `#00000080`, which composites to `#7F7F7F`,
 * so a reader copying it wrote an assertion the library itself would fail.
 *
 * Plan 076 closes the two checks the suites ran outside the contract: the soft
 * status surfaces (plan 073's audit found nine platform pairs below the 1.05:1
 * floor, the worst being Linux dark's `destructiveSoft` at 1.005:1 on its card)
 * and the high-contrast decorative divider. Both are `contrastPairs` now.
 *
 * Plan 078 closes the last painted role the contract never measured: the loading
 * skeleton. It is the fill of a mission-named state, and the same audit found
 * platform styles changing the canvas while inheriting the identity's skeleton —
 * Linux dark's `skeleton` measured 1.004:1 on its own card.
 *
 * Plan 079 closes secondary text on the state washes. `mutedForeground` is
 * painted inside rows whose background changes with hover, press, the accent a
 * selectable row uses and selection, but the list measured it only on the plain
 * surfaces; macOS dark's secondary text was 4.41:1 on `hover` and 3.55:1 on
 * `active`, under the 4.5:1 the design system states.
 *
 * Plan 080 closes the decorative divider on the fills a bordered control paints.
 * An outlined control keeps its `border` edge while the fill becomes
 * `secondary`, `hover`, `active` or `accent`; four shipped sets had the edge and
 * the fill at the same value (1.00:1), so the edge disappeared exactly while
 * pressed.
 *
 * Plan 083 closes the last painted foreground the list measured only on plain
 * surfaces: status text. A status label or indicator dot inside a list, table or
 * menu row sits on the `hover`/`active`/`accent`/`selected` wash, and no pair
 * measured it there. Every light set had a warning label below the floor on the
 * pressed fill — macOS 4.22:1, Linux 4.24:1, Windows 4.36:1 — and high-contrast
 * light measured 5.83:1 on `active` and 6.70:1 on `accent`/`selected`, under the
 * AAA 7:1 floor. All four tones join all four washes, and the two warning steps
 * move (`#8E5B00` → `#6B4500` light, `#6B4500` → `#4B3100` high contrast).
 *
 * Plan 084 closes the last functional boundary measured only on plain surfaces:
 * `borderStrong` is the edge of a field and of an unchecked checkbox, and those
 * controls sit on a quiet panel and inside rows whose fill changes. Six shipped
 * sets were below the non-text floor there — identity light 2.62:1 on `active`,
 * macOS light 2.52:1, identity dark 2.80–2.81, Linux dark 2.97 on `selected`,
 * and high-contrast dark 4.15 under its 4.5. Five values move one step.
 *
 * Plan 086 makes the contract total. The ring is measured on the quiet panel a
 * sidebar control sits on and the accent wash a selectable row paints, not only
 * on the plain surfaces and the three state washes, and a completeness suite
 * fails when a colour role is neither measured by a pair nor on the stated
 * exemption list.
 *
 * Plan 088 closes the surface gap the role-level guard cannot see: default body
 * text (`foreground`) is painted on the quiet panel an avatar's fallback
 * initials sit on and the floating surface a date picker's month header sits
 * on, but only the canvas, card and two washes were measured.
 *
 * Plan 092 closes the same gap for the control boundary: `borderStrong` is
 * painted inside an Alert, Badge or Toast as well, but the contract named the
 * plain surfaces, the quiet panel and the four row washes only. Identity dark
 * measured 2.77:1 on `successSoft`, 2.94:1 on `destructiveSoft` and 2.97:1 on
 * `infoSoft`, so the four soft fills join the boundary class and the identity
 * dark edge moves one half-step lighter.
 *
 * Plan 093 closes the last composition on those fills: a Toast's action button
 * is focused while it sits on the soft tint, but the ring was measured on the
 * eight surfaces a control normally sits on. Every shipped set already clears
 * the floor — identity light `warningSoft` at 3.37:1 is the tightest — so no
 * colour moves; the four fills join the boundary class as `ringSoftPairs`.
 *
 * Plan 094 closes the last painted surface: the loading skeleton was measured on
 * the canvas, card and popover, but a skeleton row is hovered, pressed and
 * selected like any other and also sits on the `muted` panel. Seventeen shipped
 * pairs were under 1.05:1, ten exactly 1.000:1, because the identity and
 * high-contrast skeletons were the `active` fill; the four surfaces join the
 * surface class and seven skeleton values move.
 *
 * Plan 095 closes the decorative divider on the soft status fills. An Alert or
 * Toast can separate a footer with a line, and four dark pairs were under the
 * divider floor — Windows dark 1.015:1 on `successSoft`, the identity 1.023:1,
 * identity dark `destructiveSoft` 1.040:1 and Linux dark 1.047:1 — so the four
 * fills join the divider class and the identity's two soft fills move one step
 * darker while keeping the surface floor.
 *
 * Plan 099 closes the last role the contract exempted by choice: `overlay` is
 * the wash a Dialog paints across the window, and high-contrast dark's 80% black
 * scrim composited to the canvas itself — a 1.000:1 modal backdrop on pure
 * black. The scrim is measured over the four base surfaces as
 * `overlayWashPairs`, and the AAA dark theme veils with light instead.
 *
 * Plan 300 closes plan 076's defect one surface over: the soft status tints were
 * held to 1.05:1 on the canvas, card and popover but not on the quiet `muted`
 * panel a sidebar paints, so the platform light variants — which change `muted`
 * and inherit the tints — shipped a sidebar badge at 1.023:1 on Linux, 1.036:1 on
 * macOS and 1.043:1 on Windows. `muted` joins the soft-surface pairs and the four
 * light tints move one step deeper.
 *
 * Plan 306 closes the last state the contract exempted wholesale. `disabled` and
 * `disabledForeground` were "inactive, so WCAG exempts them" — but a disabled
 * `Select` item paints `disabledForeground` on the menu's `popover` with no fill,
 * measuring 1.99:1 on Linux dark and 2.09:1 on the identity, and the designed
 * pair itself measured 2.09:1. `inactive` is a 3:1 / 4.5:1 class on the nine
 * surfaces an inactive label paints, the three values move, and `border` joins
 * the divider class on the `disabled` fill and the previously unmeasured quiet
 * panel, so a disabled control keeps its shape.
 *
 * Plan 342 publishes the last rule that ran only on shipped themes: each filled
 * family's `xHover` is one perceivable step from its `x`, and its `xActive` from
 * its `xHover`. A consumer theme whose hover equalled its fill returned `[]`
 * from the checker, because a fill equal to the fill before it still clears
 * every fill-on-surface pair. `stateStepPairs` is a `step` class at 1.05:1 on
 * both levels.
 *
 * Plan 343 closes the field's pressed edge: `fieldVariant.active` in
 * `primitives` repaints a field border with `ring` on the `input` fill, but the
 * contract measured `ring` only where a focus shadow sits — outside the
 * control. Every shipped set already clears the boundary floor there (identity
 * light is tightest at 4.218:1), so no colour moves.
 *
 * Plan 344 closes the last content surface the selection contract never
 * reached: a user message bubble paints body text on `primary`
 * (`components/message.tsx`), where the accent-tinted `selection` wash
 * composites to 1.000:1 in seven shipped sets. `selectionFillPairs` and
 * `selectionFillWashPairs` hold the neutral `selectionOnFill` veil on
 * `primary`, `secondary` and `destructive`; every shipped set clears the
 * floors, so no colour moves.
 *
 * Plan 346 closes the two text roles a status panel was never measured for: a
 * caption (`mutedForeground`) and a link or action (`primaryText`). The four
 * soft status fills were held for body text, the tone's own text, the inactive
 * label, the control boundary, the ring and the divider, but an edited theme
 * could set either role equal to a fill while the checker returned `[]`.
 * `softPanelTextPairs` adds both on all four fills; every shipped set clears
 * the secondary floor, so no colour moves (315 → 323 pairs).
 *
 * Plan 348 closes the shipped Toast's tone: `toast/viewport.tsx` paints its
 * glyph and its 3px bar with `xSoftForeground` on the `popover` card, but the
 * contract measured each soft foreground only on its own fill. `toastTonePairs`
 * holds the four roles there until the `components` migration to `xText`; every
 * shipped set clears the secondary floor with a wide margin, so no colour moves.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  colorRoles,
  compositeOver,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  darkTheme,
  extendTheme,
  getTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  inactivePairs,
  lightTheme,
  overlayWashPairs,
  selectionFillPairs,
  selectionFillWashPairs,
  selectionPairs,
  selectionSoftPairs,
  selectionSoftWashPairs,
  selectionSurfaces,
  selectionWashPairs,
  softBorderSurfacePairs,
  softPanelTextPairs,
  stateStepPairs,
  themeContrastFailures,
  toastTonePairs,
  type Theme,
  type ThemeContrast,
} from "./index.js";
import {
  quietBrandFailures,
  quietBrandTheme,
  quietHighContrastFailures,
  quietHighContrastTheme,
  quietRingFailures,
  quietRingTheme,
} from "./contrast.example.js";

describe("contrastRatio", () => {
  it("returns the WCAG extremes", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBe(21);
    expect(contrastRatio("#123456", "#123456")).toBe(1);
  });

  it("places a colour on either side of the 4.5 floor", () => {
    expect(contrastRatio("#767676", "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeLessThan(4.5);
  });

  it("returns NaN for a value it cannot measure", () => {
    ["#00000080", "#FFF", "transparent", "rgb(0, 0, 0)"].forEach((value) => {
      expect(Number.isNaN(contrastRatio(value, "#FFFFFF")), value).toBe(true);
    });
  });
});

describe("compositeOver", () => {
  it("blends a translucent overlay onto an opaque base", () => {
    expect(compositeOver("#0000007F", "#FFFFFF")).toBe("#808080");
    expect(compositeOver("#FFFFFF7F", "#000000")).toBe("#7F7F7F");
  });

  it("keeps its JSDoc example at the value the function returns", () => {
    const source = readFileSync(
      new URL("./contrast.ts", import.meta.url),
      "utf8",
    );
    const composited = compositeOver("#00000080", "#FFFFFF");

    expect(composited).toBe("#7F7F7F");
    expect(source).toContain(
      `compositeOver("#00000080", "#FFFFFF"); // "${composited}"`,
    );
  });

  it("keeps the base when the overlay is fully transparent", () => {
    expect(compositeOver("#FFFFFF00", "#123456")).toBe("#123456");
  });

  it("returns a value it cannot parse unchanged", () => {
    expect(compositeOver("#FFFFFF", "#000000")).toBe("#FFFFFF");
    expect(compositeOver("transparent", "#000000")).toBe("transparent");
  });
});

describe("contrastFloors", () => {
  it("states the documented floors by level and pair class", () => {
    expect(contrastFloors).toEqual({
      default: {
        body: 7,
        secondary: 4.5,
        inactive: 3,
        boundary: 3,
        mark: 3,
        surface: 1.05,
        step: 1.05,
        divider: 1.05,
      },
      high: {
        body: 7,
        secondary: 7,
        inactive: 4.5,
        boundary: 4.5,
        mark: 4.5,
        surface: 1.05,
        step: 1.05,
        divider: 3,
      },
    });
  });
});

const shipped: ReadonlyArray<readonly [string, Theme, ThemeContrast]> = [
  ["light", lightTheme, "default"],
  ["dark", darkTheme, "default"],
  ["high-contrast light", highContrastLightTheme, "high"],
  ["high-contrast dark", highContrastDarkTheme, "high"],
];

describe("themeContrastFailures", () => {
  it("passes every shipped theme at the level it declares", () => {
    shipped.forEach(([label, theme, contrast]) => {
      expect(theme.contrast, label).toBe(contrast);
      expect(themeContrastFailures(theme), label).toEqual([]);
    });
  });

  it("reads the level a theme declares, not a laxer default", () => {
    // `#444444` clears 4.5:1 on every surface — including through the selection
    // wash — but misses 7:1 on the pressed wash (6.70:1) and on all nine
    // selected pairs, so only the declared high-contrast floors catch it.
    expect(quietHighContrastFailures).toHaveLength(12);
    expect(
      quietHighContrastFailures.every(
        ({ foreground, floor }) =>
          foreground === "mutedForeground" && floor === 7,
      ),
    ).toBe(true);
    expect(themeContrastFailures(quietHighContrastTheme, "default")).toEqual(
      [],
    );
  });

  it("names every pair a brand theme misses, and only those", () => {
    const failures = themeContrastFailures(quietBrandTheme);
    const plain = failures.filter(({ wash }) => wash === undefined);
    const selected = failures.filter(({ wash }) => wash === "selection");

    expect(plain).toHaveLength(14);
    expect(selected).toHaveLength(9);
    expect(
      failures.every(({ foreground }) => foreground === "mutedForeground"),
    ).toBe(true);
    expect(
      [...new Set(failures.map(({ background }) => background))].toSorted(),
    ).toEqual(
      [
        "active",
        "accent",
        "background",
        "card",
        "hover",
        "input",
        "infoSoft",
        "muted",
        "popover",
        "selected",
        "destructiveSoft",
        "successSoft",
        "warningSoft",
        "track",
      ].toSorted(),
    );
    expect(
      failures.every(({ background, pairClass, floor }) =>
        background === "track"
          ? pairClass === "mark" && floor === 3
          : pairClass === "secondary" && floor === 4.5,
      ),
    ).toBe(true);
    expect(failures.every(({ ratio }) => ratio < 4.5)).toBe(true);
  });

  it("is the example's check, not a separate path", () => {
    expect(quietBrandFailures).toEqual(themeContrastFailures(quietBrandTheme));
  });

  it("reports an opaque selection wash over every painted surface", () => {
    const opaque = extendTheme(getTheme("light"), {
      colors: { selection: "#000000" },
    });
    const failures = themeContrastFailures(opaque).filter(
      ({ wash }) => wash === "selection",
    );
    expect(
      failures.map(({ foreground, background }) => [foreground, background]),
    ).toEqual([
      ["foreground", "background"],
      ["foreground", "card"],
      ["foreground", "muted"],
      ["foreground", "hover"],
      ["foreground", "active"],
      ["foreground", "accent"],
      ["popoverForeground", "popover"],
      ["inputForeground", "input"],
      ["selectedForeground", "selected"],
      ...selectionSurfaces.map((surface) => ["mutedForeground", surface]),
      ...selectionSoftPairs.map(([foreground, background]) => [
        foreground,
        background,
      ]),
    ]);
  });

  it("reports a wash that paints nothing as invisible", () => {
    const transparent = extendTheme(getTheme("light"), {
      colors: { selection: "#00000000" },
    });
    // The glyph pairs pass trivially — the wash is the surface — so the only
    // failures are the wash's own perceivability pairs, one per surface.
    expect(themeContrastFailures(transparent)).toEqual(
      [...selectionWashPairs, ...selectionSoftWashPairs].map(
        ([foreground, background, pairClass]) => ({
          foreground,
          background,
          wash: "selection" as const,
          pairClass,
          floor: contrastFloors.default.surface,
          ratio: 1,
        }),
      ),
    );
  });

  it("reports a role it cannot measure instead of skipping it", () => {
    const typo = extendTheme(getTheme("dark"), {
      colors: { placeholder: "not-a-colour" },
    });
    const failures = themeContrastFailures(typo).filter(
      ({ foreground }) => foreground === "placeholder",
    );
    expect(failures).toHaveLength(5);
    expect(new Set(failures.map(({ background }) => background))).toEqual(
      new Set(["input", "background", "card", "popover", "muted"]),
    );
    failures.forEach(({ ratio }) => expect(Number.isNaN(ratio)).toBe(true));
  });

  it("covers every documented pair", () => {
    expect(contrastPairs.length).toBe(337);
    expect(new Set(contrastPairs).size).toBe(contrastPairs.length);
    expect(stateStepPairs).toHaveLength(8);
    expect(new Set(stateStepPairs).size).toBe(8);
    expect(softPanelTextPairs).toHaveLength(8);
    expect(toastTonePairs).toHaveLength(4);
    expect(softBorderSurfacePairs.length).toBe(32);
    expect(
      softBorderSurfacePairs.map(([foreground, background]) => [
        foreground,
        background,
      ]),
    ).toEqual(
      ["info", "success", "warning", "destructive"].flatMap((tone) =>
        [
          "background",
          "card",
          "popover",
          "muted",
          "hover",
          "active",
          "accent",
          "selected",
        ].map((surface) => [`${tone}SoftBorder`, surface]),
      ),
    );
    expect(inactivePairs.length).toBe(13);
    expect(inactivePairs.map(([, background]) => background)).toEqual([
      "disabled",
      "background",
      "card",
      "popover",
      "muted",
      "hover",
      "active",
      "accent",
      "selected",
      "infoSoft",
      "successSoft",
      "warningSoft",
      "destructiveSoft",
    ]);
    expect(selectionPairs.length).toBe(18);
    expect(new Set(selectionPairs).size).toBe(selectionPairs.length);
    expect(selectionWashPairs.length).toBe(9);
    expect(selectionSoftPairs.length).toBe(4);
    expect(selectionSoftWashPairs.length).toBe(4);
    expect(selectionFillPairs).toHaveLength(3);
    expect(selectionFillWashPairs).toHaveLength(3);
    expect(selectionFillWashPairs.map(([, fill]) => fill)).toEqual([
      "primary",
      "secondary",
      "destructive",
    ]);
    expect(overlayWashPairs.length).toBe(4);
    expect(new Set(overlayWashPairs).size).toBe(overlayWashPairs.length);
  });

  it("reports a soft status surface that vanishes into its canvas", () => {
    const white = "#FFFFFF";
    const invisible = extendTheme(getTheme("light"), {
      colors: {
        background: white,
        card: white,
        popover: white,
        successSoft: white,
      },
    });
    const failures = themeContrastFailures(invisible).filter(
      ({ pairClass }) => pairClass === "surface",
    );

    expect(
      failures.map(({ foreground, background }) => [foreground, background]),
    ).toEqual([
      ["successSoft", "background"],
      ["successSoft", "card"],
      ["successSoft", "popover"],
      ["successSoft", "muted"],
    ]);
    expect(
      failures
        .filter(({ background }) => background !== "muted")
        .every(({ floor, ratio }) => floor === 1.05 && ratio === 1),
    ).toBe(true);
    expect(
      failures.find(({ background }) => background === "muted")?.ratio,
    ).toBeLessThan(1.05);
  });

  it("reports a loading skeleton that vanishes into every surface", () => {
    const white = "#FFFFFF";
    const invisible = extendTheme(getTheme("light"), {
      colors: {
        background: white,
        card: white,
        popover: white,
        skeleton: white,
      },
    });
    const failures = themeContrastFailures(invisible).filter(
      ({ foreground }) => foreground === "skeleton",
    );

    expect(
      failures.map(({ background, pairClass, floor }) => ({
        background,
        pairClass,
        floor,
      })),
    ).toEqual([
      { background: "background", pairClass: "surface", floor: 1.05 },
      { background: "card", pairClass: "surface", floor: 1.05 },
      { background: "popover", pairClass: "surface", floor: 1.05 },
      { background: "muted", pairClass: "surface", floor: 1.05 },
    ]);
    expect(
      failures
        .filter(({ background }) => background !== "muted")
        .every(({ ratio }) => ratio === 1),
    ).toBe(true);
    expect(
      failures.find(({ background }) => background === "muted")?.ratio,
    ).toBeLessThan(1.05);
  });

  it("reports an invisible divider at the level it declares", () => {
    const invisible = extendTheme(getTheme("light", "high"), {
      colors: { border: getTheme("light", "high").colors.background },
    });
    const failures = themeContrastFailures(invisible).filter(
      ({ pairClass }) => pairClass === "divider",
    );

    expect(failures.map(({ background }) => background)).toEqual([
      "infoSoft",
      "successSoft",
      "warningSoft",
      "destructiveSoft",
      "background",
      "card",
      "popover",
      "muted",
      "disabled",
      "input",
      "secondary",
      "secondaryHover",
      "secondaryActive",
      "hover",
      "active",
      "accent",
      "accentHover",
      "accentActive",
      "selected",
    ]);
    expect(failures.every(({ floor }) => floor === 3)).toBe(true);
    // Only the four white surfaces are the border's own value; the control
    // fills are merely under the floor a white divider misses.
    expect(
      failures
        .filter(({ ratio }) => ratio === 1)
        .map(({ background }) => background),
    ).toEqual(["background", "card", "popover", "input"]);
  });

  it("reports a selection veil that paints nothing on a filled action", () => {
    const base = getTheme("light");
    const invisible = extendTheme(base, {
      colors: { selectionOnFill: base.colors.primary },
    });
    const failures = themeContrastFailures(invisible).filter(
      ({ wash, pairClass }) =>
        wash === "selectionOnFill" && pairClass === "surface",
    );

    expect(
      failures.map(({ foreground, background, floor, ratio }) => ({
        foreground,
        background,
        floor,
        ratio,
      })),
    ).toEqual([
      {
        foreground: "selectionOnFill",
        background: "primary",
        floor: contrastFloors.default.surface,
        ratio: 1,
      },
    ]);
  });

  it("checks the focus ring on every surface a focused control sits on", () => {
    expect(quietRingTheme.colors.ring).toBe("#EFF4FF");
    const ringFailures = quietRingFailures
      .filter(
        ({ foreground, background }) =>
          foreground === "ring" &&
          [
            "background",
            "card",
            "popover",
            "muted",
            "accent",
            "hover",
            "active",
            "selected",
          ].includes(background),
      )
      .map(({ background, pairClass, floor }) => ({
        background,
        pairClass,
        floor,
      }));
    expect(ringFailures).toEqual(
      [
        "background",
        "card",
        "popover",
        "muted",
        "accent",
        "hover",
        "active",
        "selected",
      ].map((background) => ({ background, pairClass: "boundary", floor: 3 })),
    );
  });
});

describe("contract completeness", () => {
  /**
   * The roles no pair measures, each with the reason it is not a pair. A role
   * that is neither here nor measured fails `every role is measured or exempt`,
   * so a new role cannot ship unmeasured.
   */
  const exempt = [
    [
      "scrollbar",
      "reserved; the pinned runtime paints the platform scrollbar and exposes no tint",
    ],
    [
      "shadow",
      "an elevation tint applied at a level's alpha, never painted as text or a bounded surface",
    ],
  ] as const;

  const measuredRoles = new Set<string>(
    [
      ...contrastPairs,
      ...selectionPairs,
      ...selectionWashPairs,
      ...selectionSoftPairs,
      ...selectionSoftWashPairs,
      ...selectionFillPairs,
      ...selectionFillWashPairs,
      ...overlayWashPairs,
    ].flatMap(([foreground, background]) => [foreground, background]),
  );

  it("every role is measured or exempt", () => {
    const unaccounted = colorRoles.filter(
      (role) =>
        !measuredRoles.has(role) && !exempt.some(([name]) => name === role),
    );
    expect(unaccounted).toEqual([]);
  });

  it("no stale exemption", () => {
    exempt.forEach(([role]) => {
      expect(colorRoles, role).toContain(role);
      expect(measuredRoles.has(role), role).toBe(false);
    });
  });
});
