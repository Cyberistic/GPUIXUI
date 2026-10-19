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
 * painted inside a tone-tinted Alert as well, but the contract named the
 * plain surfaces, the quiet panel and the four row washes only. Identity dark
 * measured 2.77:1 on `successSoft`, 2.94:1 on `destructiveSoft` and 2.97:1 on
 * `infoSoft`, so the four soft fills join the boundary class and the identity
 * dark edge moves one half-step lighter.
 *
 * Plan 093 closes the last composition on those fills: an Alert's action button
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
 * black. The scrim is measured over the surfaces a dialog covers as
 * `overlayWashPairs` — the four base surfaces, the `input` fill a form paints,
 * the persistent `selected` fill (plan 359), the four resting filled actions and
 * the four soft status panels a window shows (plan 375) — and the AAA dark
 * theme veils with light instead.
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
 * control. Every shipped set already clears the boundary floor there (macOS
 * light is tightest at 4.697:1 after plan 516 moved the light ring one step),
 * so no colour moves.
 *
 * Plan 344 closes the last content surface the selection contract never
 * reached: a user message bubble paints body text on `primary`
 * (`components/message.tsx`), where the accent-tinted `selection` wash
 * composites to 1.000:1 in six shipped sets (the exact list is in
 * `selection-on-fill.test.ts`). `selectionFillPairs` and
 * `selectionFillWashPairs` hold the neutral `selectionOnFill` veil on
 * `primary`, `secondary` and `destructive`; every shipped set clears the
 * floors, so no colour moves. The veil is measured on each fill's resting value;
 * a filled control's `xHover`/`xActive` fills are documented as outside its
 * reach and its label opts out with `userSelect: "none"` (plan 513). Plan 382 derives both lists from
 * `filledControlFamilies`, which also covers `accent`, and moves the macOS
 * light and Linux dark accent foregrounds one step so the fourth family clears
 * the veil.
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
 *
 * Plan 357 publishes the generic pointer ladder: a ghost or outline control
 * paints no fill at rest, so its press is the change from `hover` to `active` —
 * and that pair was measured only as two washes against surfaces. `washStepPairs`
 * holds `active` one perceivable `step` from `hover` at both contrast levels.
 * Every shipped set already clears 1.05:1 (identity dark is tightest at
 * 1.071:1), so no colour moves.
 *
 * Plan 509 gives the elevation walk the two persistent surfaces plan 359 added
 * to the scrim: a context menu or preview card opens over the `selected` fill a
 * chosen row keeps, and a popover flipped above its trigger lands its shadow on
 * the field's `input` fill. `elevationSurfaces` derives from `layoutSurfaces`,
 * so the two compositions cannot be omitted again; every shipped set clears
 * 1.05:1 (1.109:1 at the tightest, macOS dark `sm` on `input`), so no colour
 * moves.
 *
 * Plan 584 gives the `md` walk the resting content fills a floating menu opens
 * over: `elevationContentSurfaces` is the same twelve fills the scrim covers,
 * because a dropdown opens across the button beside its trigger and a context
 * menu over a Badge. `sm` (a card placed in the layout) and `lg` (a dialog on
 * the scrim, measured through `dialogSurfacePairs`) stay on the page surfaces.
 * The tightest shipped pair is **1.058:1** (AAA dark, `md` on `info`), so no
 * colour moves.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Tokens from "./index.js";
import {
  colorRoles,
  compositeOver,
  caretPairs,
  contrastFloors,
  contrastPairClasses,
  contrastPairs,
  contrastRatio,
  controlBoundarySoftPairs,
  dialogSurfacePairs,
  elevationContentSurfaces,
  elevationSurfaces,
  extendTheme,
  getTheme,
  inactivePairs,
  inactivePanelActionPairs,
  inactiveSoftPairs,
  invalidRingPairs,
  markPairs,
  nativeHighlightPairs,
  nativeSyntaxPairs,
  overlayWashPairs,
  ringSoftPairs,
  ringTrackPairs,
  rowPressStepPairs,
  selectionPressPairs,
  selectionPressStepPairs,
  selectionFillPairs,
  selectionFillInactivePairs,
  selectionFillWashPairs,
  selectionInactivePairs,
  selectionInputPairs,
  selectionLinkPairs,
  selectionPairs,
  selectionSoftPairs,
  selectionSoftWashPairs,
  selectionStatusPairs,
  selectionStepPairs,
  selectionSurfaces,
  selectionWashPairs,
  shippedThemes,
  skeletonPulsePairs,
  softActionLabelPairs,
  softActionPairs,
  softActionStepPairs,
  softBorderSurfacePairs,
  softFieldPairs,
  softPanelTextPairs,
  stateFillSurfacePairs,
  statusFillPairs,
  stateStepPairs,
  themeContrastFailures,
  themeContrasts,
  toastTonePairs,
  trackMarkPairs,
  trackSurfacePairs,
  washStepPairs,
  type ContrastPair,
} from "./index.js";
import {
  quietBrandFailures,
  quietBrandTheme,
  quietHighContrastFailures,
  quietHighContrastTheme,
  quietRingFailures,
  quietRingTheme,
} from "./contrast.example.js";

/**
 * Guards the defect plan 349 fixes: every "unique" assertion in this suite built
 * a `Set` of tuple arrays, which compares identity — two copies of the same
 * `[foreground, background, class]` are different objects — so a repeated pair
 * could never fail one. The checker would report the same missed composition
 * twice while every suite stayed green.
 *
 * Lists that measure the same roles through a different wash are separate
 * checks, not duplicates, so uniqueness is asserted inside each published list,
 * never across lists. Plan 546 derives the inventory from the package's exports,
 * after seven lists shipped outside the hand-typed array.
 */
const duplicatePairKeys = (
  pairs: ReadonlyArray<ContrastPair>,
): ReadonlyArray<string> => {
  const seen = new Set<string>();
  return pairs.flatMap((pair) => {
    const key = pair.join("|");
    if (!seen.has(key)) {
      seen.add(key);
      return [];
    }
    return [key];
  });
};

/**
 * Every exported pair list, keyed by its export name. The key type derives from
 * the package's exports, so a new `*Pairs` value fails `check-types` until it is
 * listed here; the record form, rather than an array literal, is what makes the
 * inventory compile-enforced.
 */
type PairListName = {
  [Name in keyof typeof Tokens]: Name extends `${string}Pairs` ? Name : never;
}[keyof typeof Tokens];

const publishedPairLists: Readonly<
  Record<PairListName, ReadonlyArray<ContrastPair>>
> = {
  caretPairs,
  contrastPairs,
  controlBoundarySoftPairs,
  dialogSurfacePairs,
  inactivePairs,
  inactivePanelActionPairs,
  inactiveSoftPairs,
  invalidRingPairs,
  markPairs,
  nativeHighlightPairs,
  nativeSyntaxPairs,
  overlayWashPairs,
  ringSoftPairs,
  ringTrackPairs,
  rowPressStepPairs,
  selectionPressPairs,
  selectionPressStepPairs,
  selectionFillInactivePairs,
  selectionFillPairs,
  selectionFillWashPairs,
  selectionInactivePairs,
  selectionInputPairs,
  selectionLinkPairs,
  selectionPairs,
  selectionSoftPairs,
  selectionSoftWashPairs,
  selectionStatusPairs,
  selectionStepPairs,
  selectionWashPairs,
  skeletonPulsePairs,
  softActionLabelPairs,
  softActionPairs,
  softActionStepPairs,
  softBorderSurfacePairs,
  softFieldPairs,
  softPanelTextPairs,
  stateFillSurfacePairs,
  stateStepPairs,
  statusFillPairs,
  toastTonePairs,
  trackMarkPairs,
  trackSurfacePairs,
  washStepPairs,
};

const publishedPairListEntries = Object.entries(publishedPairLists);

describe("published pair lists", () => {
  it("detects a repeated composition, so the guard can fail", () => {
    expect(
      duplicatePairKeys([
        ["border", "card", "divider"],
        ["border", "card", "divider"],
      ]),
    ).toEqual(["border|card|divider"]);
  });

  it("derives the inventory from the package's exports", () => {
    expect(publishedPairListEntries.map(([name]) => name)).toContain(
      "contrastPairs",
    );
    expect(publishedPairListEntries.length).toBeGreaterThan(1);
  });

  it("never repeats a composition inside a list", () => {
    publishedPairListEntries.forEach(([name, pairs]) => {
      expect(duplicatePairKeys(pairs), name).toEqual([]);
    });
  });
});

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

describe("contrastPairClasses", () => {
  const classesOf = (
    pairs: ReadonlyArray<ContrastPair>,
  ): ReadonlyArray<string> => [
    ...new Set(pairs.map(([, , pairClass]) => pairClass)),
  ];

  const unenforced = (
    classes: ReadonlyArray<string>,
    pairs: ReadonlyArray<ContrastPair>,
  ): ReadonlyArray<string> => {
    const used = new Set(classesOf(pairs));
    return classes.filter((pairClass) => !used.has(pairClass));
  };

  it("lists each class once", () => {
    expect(new Set(contrastPairClasses).size).toBe(contrastPairClasses.length);
  });

  it("owns both floor records, in index order", () => {
    themeContrasts.forEach((level) => {
      expect(Object.keys(contrastFloors[level]), level).toEqual([
        ...contrastPairClasses,
      ]);
      contrastPairClasses.forEach((pairClass) => {
        expect(
          contrastFloors[level][pairClass],
          `${level}/${pairClass}`,
        ).toBeGreaterThan(0);
      });
    });
  });

  it("enforces every class through at least one pair", () => {
    expect(unenforced(contrastPairClasses, contrastPairs)).toEqual([]);
  });

  it("reports a class no pair enforces, so the guard can fail", () => {
    expect(
      unenforced([...contrastPairClasses, "unused"], contrastPairs),
    ).toEqual(["unused"]);
  });
});

describe("themeContrastFailures", () => {
  it("passes every shipped theme at the level it declares", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeContrastFailures(theme), theme.name).toEqual([]);
    });
  });

  it("reads the level a theme declares, not a laxer default", () => {
    // `#444444` clears 4.5:1 on every surface — including through the selection
    // wash — but misses 7:1 on the pressed wash (6.70:1), on all nine selected
    // pairs and on the four soft status fills a caption is selected on, so only
    // the declared high-contrast floors catch it.
    expect(quietHighContrastFailures).toHaveLength(16);
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

    // 15 status/selection surfaces plus the code plane's body pairs on the
    // four `Surface` tones a native document may name.
    expect(plain).toHaveLength(19);
    expect(selected).toHaveLength(13);
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
        "selectedActive",
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
          : pairClass === "body"
            ? floor === 7
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
      ["cardForeground", "card"],
      ["foreground", "selected"],
      ["popoverForeground", "hover"],
      ["popoverForeground", "active"],
      ["popoverForeground", "selected"],
      ["selectedForeground", "hover"],
      ["selectedForeground", "active"],
      ["selectedForeground", "accent"],
      ...selectionSurfaces.map((surface) => ["mutedForeground", surface]),
      ...selectionStatusPairs.map(([foreground, background]) => [
        foreground,
        background,
      ]),
      ...selectionLinkPairs.map(([foreground, background]) => [
        foreground,
        background,
      ]),
      ...selectionSoftPairs.map(([foreground, background]) => [
        foreground,
        background,
      ]),
      ...selectionInputPairs.map(([foreground, background]) => [
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
    expect(failures).toHaveLength(14);
    expect(new Set(failures.map(({ background }) => background))).toEqual(
      new Set([
        "input",
        "background",
        "card",
        "popover",
        "muted",
        "hover",
        "active",
        "accent",
        "selected",
        "selectedActive",
        "infoSoft",
        "successSoft",
        "warningSoft",
        "destructiveSoft",
      ]),
    );
    failures.forEach(({ ratio }) => expect(Number.isNaN(ratio)).toBe(true));
  });

  it("covers every documented pair", () => {
    expect(contrastPairs.length).toBe(461);
    expect(statusFillPairs).toHaveLength(32);
    expect(
      statusFillPairs.map(([foreground, background]) => [
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
          "selectedActive",
        ]
          .filter(
            (surface) =>
              !stateFillSurfacePairs.some(
                ([role, fill]) => role === tone && fill === surface,
              ),
          )
          .map((surface) => [tone, surface]),
      ),
    );
    expect(softActionPairs).toHaveLength(12);
    expect(softActionStepPairs).toHaveLength(2);
    expect(softActionLabelPairs).toHaveLength(7);
    expect(stateStepPairs).toHaveLength(8);
    expect(washStepPairs).toHaveLength(1);
    expect(selectionStepPairs).toHaveLength(1);
    expect(softPanelTextPairs).toHaveLength(8);
    expect(toastTonePairs).toHaveLength(4);
    expect(softBorderSurfacePairs.length).toBe(36);
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
          "selectedActive",
        ].map((surface) => [`${tone}SoftBorder`, surface]),
      ),
    );
    expect(inactivePairs.length).toBe(14);
    expect(inactivePairs.map(([, background]) => background)).toEqual([
      "disabled",
      "input",
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
    // Nine surfaces with their own body role, a card's second role, a selected
    // row's title, and the same nine at secondary strength.
    expect(selectionPairs.length).toBe(26);
    expect(selectionStatusPairs).toHaveLength(36);
    expect(selectionLinkPairs).toHaveLength(13);
    expect(selectionWashPairs.length).toBe(10);
    expect(selectionSoftPairs.length).toBe(16);
    expect(selectionInputPairs).toHaveLength(12);
    expect(selectionSoftWashPairs.length).toBe(4);
    expect(selectionFillPairs).toHaveLength(8);
    expect(selectionFillInactivePairs).toHaveLength(1);
    expect(selectionFillWashPairs).toHaveLength(8);
    expect(selectionFillWashPairs.map(([, fill]) => fill)).toEqual([
      "primary",
      "secondary",
      "destructive",
      "accent",
      "info",
      "success",
      "warning",
      "softAction",
    ]);
    expect(overlayWashPairs.length).toBe(21);
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
      ({ pairClass, foreground, background }) =>
        pairClass === "surface" &&
        (foreground === "successSoft" || background === "successSoft"),
    );

    expect(
      failures.map(({ foreground, background }) => [foreground, background]),
    ).toEqual([
      ["successSoft", "background"],
      ["successSoft", "card"],
      ["successSoft", "popover"],
      ["successSoft", "muted"],
      ["softAction", "successSoft"],
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
      ({ foreground, opacity }) =>
        foreground === "skeleton" && opacity === undefined,
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
    // The pulse's dim frame is reported on the same surfaces, with the fraction.
    expect(
      themeContrastFailures(invisible)
        .filter(
          ({ foreground, opacity }) =>
            foreground === "skeleton" && opacity !== undefined,
        )
        .map(({ background }) => background),
    ).toEqual(["background", "card", "popover", "muted"]);
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
      "selectedActive",
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
    // The veil is the primary fill, so it also fails to separate from the `info`
    // chip (1.011:1); this case states the composition it was written for.
    const failures = themeContrastFailures(invisible).filter(
      ({ wash, background, pairClass }) =>
        wash === "selectionOnFill" &&
        background === "primary" &&
        pairClass === "surface",
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
            "track",
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
        "track",
      ].map((background) => ({ background, pairClass: "boundary", floor: 3 })),
    );
  });
});

describe("the elevation shadow", () => {
  it("names the surfaces a raised element floats over", () => {
    expect(elevationSurfaces).toEqual([
      "background",
      "card",
      "muted",
      "input",
      "selected",
      "popover",
    ]);
    expect(elevationContentSurfaces).toEqual([
      "primary",
      "secondary",
      "accent",
      "destructive",
      "info",
      "success",
      "warning",
      "softAction",
      "infoSoft",
      "successSoft",
      "warningSoft",
      "destructiveSoft",
      "disabled",
      "skeleton",
      "track",
    ]);
  });

  it("reports a black tint on the AAA dark canvas", () => {
    const regressed = extendTheme(getTheme("dark", "high"), {
      colors: { shadow: "#000000" },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground }) => foreground === "shadow",
    );

    expect(
      failures
        .filter(({ background }) => background === "background")
        .map(({ level, opacity, ratio }) => [level, opacity, ratio]),
    ).toEqual([
      ["sm", 0.1, 1],
      ["md", 0.14, 1],
      ["lg", 0.18, 1],
    ]);
    expect(failures).toContainEqual({
      foreground: "shadow",
      background: "card",
      wash: "shadow",
      level: "sm",
      opacity: 0.1,
      pairClass: "surface",
      floor: 1.05,
      ratio: expect.any(Number),
    });
  });

  it("reports a collapsed alpha on every surface the level paints over", () => {
    const [md] = getTheme("light").elevation.md;
    if (md === undefined) {
      throw new Error("the shipped light theme has no md level");
    }
    const collapsed = extendTheme(getTheme("light"), {
      elevation: { md: [{ ...md, alpha: 0 }] },
    });

    expect(
      themeContrastFailures(collapsed)
        .filter(({ foreground }) => foreground === "shadow")
        .map(({ background, level, opacity, ratio }) => [
          level,
          background,
          opacity,
          ratio,
        ]),
    ).toEqual(
      [...elevationSurfaces, ...elevationContentSurfaces].map((surface) => [
        "md",
        surface,
        0,
        1,
      ]),
    );
  });

  it("skips the reserved empty overlay level", () => {
    shippedThemes.forEach(({ theme }) => {
      const levels = themeContrastFailures(theme)
        .filter(({ foreground }) => foreground === "shadow")
        .map(({ level }) => level);
      expect(levels, theme.name).not.toContain("overlay");
    });
  });
});

describe("contract completeness", () => {
  /**
   * The roles no pair measures, each with the reason it is not a pair. A role
   * that is neither here nor measured fails `every role is measured or exempt`,
   * so a new role cannot ship unmeasured. `shadow` used to be here; the
   * elevation walk measures it composited at each level's alpha (plan 505).
   */
  const exempt = [
    [
      "scrollbar",
      "reserved; the pinned runtime paints the platform scrollbar and exposes no tint",
    ],
  ] as const;

  const measuredRoles = new Set<string>(
    [
      ...contrastPairs,
      ...selectionPairs,
      ...selectionPressPairs,
      ...selectionStatusPairs,
      ...selectionLinkPairs,
      ...selectionWashPairs,
      ...selectionSoftPairs,
      ...selectionInputPairs,
      ...selectionSoftWashPairs,
      ...selectionFillPairs,
      ...selectionFillWashPairs,
      ...overlayWashPairs,
    ].flatMap(([foreground, background]) => [foreground, background]),
  );
  // The elevation walk measures `shadow` per level over `elevationSurfaces`,
  // not through a static pair list.
  measuredRoles.add("shadow");

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
