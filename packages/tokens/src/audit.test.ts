/**
 * Guards the theme gate a consumer is told to run.
 *
 * The documented gate assembled its own check from two of the three reports and
 * called `contrastFailures(theme)` without floors, so it audited a theme that
 * declares `contrast: "high"` against the **default** floors: a brand derived
 * from the high-contrast palette could sit at 5:1 on its secondary text and be
 * reported shippable, and a theme whose divider matched its own card passed
 * because no decorative surface was measured at all. `auditTheme` holds a theme
 * to its own variant and reports every contract, which is what these cases pin.
 */
import { describe, expect, it } from "vitest";
import {
  alpha,
  alphaOf,
  auditTheme,
  colorRoles,
  contrastFailures,
  contrastFloors,
  contrastFloorsFor,
  createTheme,
  decorativeFailures,
  extendTheme,
  highContrastFloors,
  highContrastLightTheme,
  highContrastThemes,
  highlightFailures,
  indicatorFailures,
  keyboardDimFailures,
  lightTheme,
  platformNames,
  platformTheme,
  retroNames,
  retroTheme,
  selectionPairs,
  themes,
  type Theme,
  type ThemeColors,
} from "./index.js";

/** A high-contrast theme whose placeholder is 5:1 on white: AA, not AAA. */
const faintPlaceholder = extendTheme(highContrastLightTheme, {
  colors: { placeholder: "#6F6F6F" },
});

/** A theme whose dividers are the page: no pair measures the `border` role. */
const invisibleDividers = extendTheme(lightTheme, {
  colors: { border: lightTheme.colors.background },
});

describe("every shipped theme passes one audit", () => {
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

  it("reports nothing for any of them", () => {
    const failing = shipped
      .filter((theme) => !auditTheme(theme).passed)
      .map((theme) => theme.name);

    expect(failing).toEqual([]);
  });

  it("audits a real set, so a scan that stopped iterating cannot pass", () => {
    expect(shipped.length).toBeGreaterThanOrEqual(16);
  });
});

describe("the floors follow the theme's contrast variant", () => {
  it("holds a declared high-contrast theme to the AAA floors", () => {
    expect(contrastFloorsFor(highContrastLightTheme)).toBe(highContrastFloors);
    expect(contrastFloorsFor(lightTheme)).toBe(contrastFloors);
  });

  it("reports a pair the default floors would have passed", () => {
    // The retracted gate in one line: no failures at the default floors...
    expect(contrastFailures(faintPlaceholder, contrastFloors)).toEqual([]);
    // ...and a real one from the report's own default, because the theme's
    // variant decides. The placeholder sits on both field fills — a plain
    // field's `input` and the page role a composite field paints — so the one
    // role is reported on each.
    expect(
      contrastFailures(faintPlaceholder).map(
        ({ foreground, background }) => `${foreground}/${background}`,
      ),
    ).toEqual(["placeholder/background", "placeholder/input"]);
    const { contrast, passed } = auditTheme(faintPlaceholder);
    expect(passed).toBe(false);
    expect(
      contrast.map(
        ({ foreground, background }) => `${foreground}/${background}`,
      ),
    ).toEqual(["placeholder/background", "placeholder/input"]);
    expect(contrast[0]?.floor).toBe(highContrastFloors.secondary);
  });

  it("honours an explicit floor set over the variant", () => {
    expect(auditTheme(faintPlaceholder, contrastFloors)).toEqual({
      invalidRoles: [],
      invalidShadows: [],
      invalidNumbers: [],
      contrast: [],
      decorative: [],
      series: { surfaces: [], distinctness: [], deficiencies: [] },
      syntax: [],
      selection: [],
      indicators: [],
      highlight: [],
      disabledFade: [],
      keyboardDim: [],
      passed: true,
    });
  });
});

describe("every report is part of the gate", () => {
  it("reports a divider no contrast pair covers", () => {
    expect(contrastFailures(invisibleDividers)).toEqual([]);
    expect(decorativeFailures(invisibleDividers)).toContainEqual(
      expect.objectContaining({ surface: "divider", role: "border" }),
    );
    expect(auditTheme(invisibleDividers).passed).toBe(false);
  });

  it("reports a selection wash the reader cannot find", () => {
    // No contrast pair measures the wash: it is translucent, so the text
    // contract skips it. The audit's own report is what catches it.
    const invisibleSelection = extendTheme(lightTheme, {
      colors: { selection: alpha(lightTheme.colors.card, 0) },
    });

    expect(contrastFailures(invisibleSelection)).toEqual([]);
    expect(auditTheme(invisibleSelection).selection.length).toBe(
      selectionPairs.length,
    );
    expect(auditTheme(invisibleSelection).passed).toBe(false);
  });

  it("reports an indicator mark no contrast pair covers", () => {
    // A near-white fill with a near-black label is a readable *fill* — the
    // on-colour pair passes — while the fill itself is the page it sits on, so a
    // progress bar painted in it would be the one bar nobody sees. Nothing in
    // the pair table measures a role as a mark, so only the new report finds it.
    const invisibleMark = extendTheme(lightTheme, {
      colors: {
        primary: themes.dark.colors.primary,
        primaryForeground: themes.dark.colors.primaryForeground,
      },
    });

    expect(contrastFailures(invisibleMark)).toEqual([]);
    const mark = indicatorFailures(invisibleMark).find(
      ({ role, surface }) => role === "primary" && surface === "background",
    );
    expect(mark?.ratio).toBeCloseTo(2.02, 2);
    expect(mark?.floor).toBe(contrastFloors.boundary);
    expect(auditTheme(invisibleMark).passed).toBe(false);
  });

  it("returns the find wash report the standalone check returns", () => {
    // An accent that is its own card paints matches the reader cannot find.
    // The gate's report is the standalone contract's list, not a second
    // opinion, so a caller reading either entry point gets the same wash.
    const invisibleFind = extendTheme(lightTheme, {
      colors: { primary: lightTheme.colors.card },
    });
    const audit = auditTheme(invisibleFind);

    expect(audit.highlight.length).toBeGreaterThan(0);
    expect(audit.highlight).toEqual(highlightFailures(invisibleFind));
    expect(audit.highlight[0]?.floor).toBe(1.05);
    expect(audit.passed).toBe(false);
  });

  it("reports an unpaintable role", () => {
    const typo = extendTheme(lightTheme, { colors: { ring: "#2559D" } });
    expect(auditTheme(typo).invalidRoles).toEqual([
      { role: "ring", value: "#2559D" },
    ]);
    expect(auditTheme(typo).passed).toBe(false);
  });

  it("reports a shadow colour no role check can see", () => {
    // The role check reads `colors`, so a level a brand supplies is outside its
    // reach: the runtime ignores the colour and the card or dialog paints flat.
    const flatShadows = extendTheme(lightTheme, {
      elevation: {
        md: [
          {
            offsetX: 0,
            offsetY: 4,
            blurRadius: 12,
            spreadRadius: 0,
            color: "#00000",
          },
        ],
      },
    });

    expect(auditTheme(flatShadows).invalidRoles).toEqual([]);
    expect(auditTheme(flatShadows).invalidShadows).toEqual([
      { level: "md", index: 0, color: "#00000" },
    ]);
    expect(auditTheme(flatShadows).passed).toBe(false);
  });

  it("passes a level a brand supplies in a colour the runtime paints", () => {
    const raisedShadows = extendTheme(lightTheme, {
      elevation: {
        md: [
          {
            offsetX: 0,
            offsetY: 4,
            blurRadius: 12,
            spreadRadius: 0,
            color: "#00000020",
          },
        ],
      },
    });

    expect(auditTheme(raisedShadows)).toEqual({
      invalidRoles: [],
      invalidShadows: [],
      invalidNumbers: [],
      contrast: [],
      decorative: [],
      series: { surfaces: [], distinctness: [], deficiencies: [] },
      syntax: [],
      selection: [],
      indicators: [],
      highlight: [],
      disabledFade: [],
      keyboardDim: [],
      passed: true,
    });
  });

  it("reports a disabled label the fade erases", () => {
    // The enabled pair is readable (4.69:1 ≥ the 4.5 floor), so the text
    // contract passes; `disabledOpacity` composites the label into its own
    // faded fill at 1.04:1, which no contrast pair can see because the fade is
    // translucent. Without this report a brand shipped a control that reads as
    // an empty box whenever it was unavailable.
    const vanishedWhenDisabled = extendTheme(lightTheme, {
      colors: { primary: "#101010", primaryForeground: "#7E7E7E" },
    });

    expect(contrastFailures(vanishedWhenDisabled)).toEqual([]);
    expect(indicatorFailures(vanishedWhenDisabled)).toEqual([]);
    expect(auditTheme(vanishedWhenDisabled).disabledFade).toContainEqual(
      expect.objectContaining({
        fill: "primary",
        label: "primaryForeground",
        over: "background",
        floor: contrastFloors.disabled,
      }),
    );
    expect(auditTheme(vanishedWhenDisabled).passed).toBe(false);
  });

  it("holds the fade to its own floor in every contrast variant", () => {
    // A high-contrast variant's `disabled` floor is 3:1 and the fade lands at
    // 1.74:1–2.23:1 (measured in `disabled.test.ts`), so folding the variant's
    // floors into this report would fail every high-contrast theme for a
    // mechanism it does not use. The report reads the same either way.
    expect(auditTheme(highContrastLightTheme).disabledFade).toEqual([]);
    expect(
      auditTheme(highContrastLightTheme, highContrastFloors).disabledFade,
    ).toEqual([]);
  });

  /**
   * Guards the tenth report: the paint the runtime applies to every focusable
   * that is not the focused one.
   *
   * The bug this holds: `keyboardFocusDim` is on by default in
   * `@gpuix/native`, so pressing Tab fades every other control, and the
   * composite is translucent — `contrastRatio` refuses it, so no text pair
   * measured it. The report was `keyboardDimFailures` on its own, so a theme
   * gate that ran every contract but that one shipped a control that vanished
   * while the reader tabbed elsewhere.
   *
   * The dim and the disabled fade are the same composite with two shares
   * (`keyboardFocusDimOpacity` 0.4 and `disabledOpacity` 0.5), and the measured
   * consequence is that no palette fails the dim alone: the dim's band sits
   * inside the fade's, so a label the dim erases is one the fade erases too.
   * What the dim adds is the placement and the mechanism — and its own floor,
   * which is *not* the fade's, as the second case shows.
   */
  it("reports a label the keyboard dim erases", () => {
    // The enabled pair reads 7.4:1 and the fill is the darkest ink on the
    // page, so the text contract has nothing to say: `contrastRatio` refuses
    // the dimmed composite, and no pair in the table is translucent.
    const erasedWhenDimmed = extendTheme(lightTheme, {
      colors: { primary: "#000000", primaryForeground: "#999999" },
    });
    const audit = auditTheme(erasedWhenDimmed);

    expect(audit.contrast).toEqual([]);
    expect(audit.indicators).toEqual([]);
    // The dimmed fill is the label: the composite paints one block.
    expect(audit.keyboardDim).toContainEqual(
      expect.objectContaining({
        fill: "primary",
        label: "primaryForeground",
        over: "card",
        ratio: 1,
      }),
    );
    expect(audit.keyboardDim).toHaveLength(4);
    expect(audit.keyboardDim.every((failure) => failure.floor === 1.05)).toBe(
      true,
    );
    expect(audit.passed).toBe(false);
  });

  it("keeps the dim's own floor, which is not the disabled fade's", () => {
    // The same composite with a lighter label: the disabled fade (1.5:1) still
    // reports it while the dim (1.05:1) does not, so the two reports are two
    // contracts and not one measurement twice.
    const fadedButVisible = extendTheme(lightTheme, {
      colors: { primary: "#000000", primaryForeground: "#B4B4B4" },
    });

    expect(keyboardDimFailures(fadedButVisible)).toEqual([]);
    expect(auditTheme(fadedButVisible).disabledFade.length).toBeGreaterThan(0);
    expect(auditTheme(fadedButVisible).keyboardDim).toEqual([]);
  });

  it("computes passed from every report it returns", () => {
    // The gate's contract: `passed` is the conjunction of the reports, not a
    // separate opinion. A report that is returned but left out of the
    // conjunction would let a theme ship with a failure printed beside a true
    // `passed`. Two reports cannot be the only failure on a real palette — the
    // dim's band contains the fade's, and an accent whose matches vanish also
    // fails the mark contract — so this pins the shape rather than one
    // isolable palette; their own cases above prove the report is returned.
    const audits = [
      themes.light,
      themes.dark,
      highContrastLightTheme,
      extendTheme(lightTheme, {
        colors: { primary: "#000000", primaryForeground: "#999999" },
      }),
      extendTheme(lightTheme, {
        colors: { primary: lightTheme.colors.card },
      }),
      invisibleDividers,
    ].map((theme) => auditTheme(theme));

    const failuresOf = (audit: ReturnType<typeof auditTheme>) =>
      [
        audit.invalidRoles,
        audit.invalidShadows,
        audit.invalidNumbers,
        audit.contrast,
        audit.decorative,
        audit.series.surfaces,
        audit.series.distinctness,
        audit.series.deficiencies,
        audit.selection,
        audit.indicators,
        audit.highlight,
        audit.disabledFade,
        audit.keyboardDim,
      ].filter((report) => report.length > 0);

    const disagreeing = audits.filter(
      (audit) => audit.passed !== (failuresOf(audit).length === 0),
    );

    expect(disagreeing).toEqual([]);
  });
});

/**
 * The bug this holds: a brand may write the shorthand the runtime paints —
 * `#fff` for a page, `#000` for text — and the gate reported every pair those
 * roles touched **unmeasurable**, because the measurement dialect was six- and
 * eight-digit hex while the paint check already accepted the short form. The
 * renderer paints it, `invalidColorRoles` passes it, and the audit failed it, so
 * the same theme painted and was called unshippable. Shorthand resolves exactly,
 * so it is measured like the long form.
 */
describe("a brand written in the shorthand the renderer paints", () => {
  const shorthand = createTheme({
    mode: "light",
    contrast: "high",
    colors: { background: "#fff", foreground: "#000" },
  });

  it("measures every pair the shorthand roles carry", () => {
    expect(shorthand.colors.background).toBe("#fff");
    expect(auditTheme(shorthand).contrast).toEqual([]);
  });

  it("passes the gate the shipped theme with the same palette passes", () => {
    // `#fff` and `#000` are the shipped high-contrast light values written
    // short, so the two themes carry one palette — a gate that cannot measure
    // one cannot measure the other.
    expect(highContrastLightTheme.colors.background).toBe("#FFFFFF");
    expect(highContrastLightTheme.colors.foreground).toBe("#000000");
    expect(auditTheme(highContrastLightTheme).passed).toBe(true);
    expect(auditTheme(shorthand).passed).toBe(true);
  });
});

/**
 * The bug this holds: `alpha(color, 1)` — the package's own helper — returns an
 * eight-digit hex whose alpha byte is `FF`. The renderer paints that form, the
 * paint check accepts it, and the measurement dialect read the byte as
 * translucent, so every pair a role written that way touched was reported
 * unmeasurable and the gate failed the same palette it passes in six digits.
 * A fully opaque byte is no share, so it measures as the colour it is.
 */
describe("a brand whose colours carry a fully opaque alpha byte", () => {
  // Only the roles that are opaque already: `selection`, `overlay` and `shadow`
  // are designed as shares, and making one opaque would change the design
  // rather than the dialect.
  const opaque = (theme: Theme): Partial<ThemeColors> =>
    Object.fromEntries(
      colorRoles
        .filter((role) => alphaOf(theme.colors[role]) === 1)
        .map((role) => [role, alpha(theme.colors[role], 1)] as const),
    );
  const field = createTheme({
    mode: "light",
    contrast: "high",
    colors: opaque(highContrastLightTheme),
  });

  it("writes every role in the form the helper produces", () => {
    expect(field.colors.background).toBe("#FFFFFFFF");
    expect(field.colors.foreground).toBe("#000000FF");
  });

  it("measures every pair the opaque roles carry", () => {
    expect(auditTheme(field).contrast).toEqual([]);
  });

  it("passes the gate the six-digit theme with the same palette passes", () => {
    expect(auditTheme(highContrastLightTheme).passed).toBe(true);
    expect(auditTheme(field).passed).toBe(true);
  });
});

/**
 * The gate and the report it names must answer with the same floors.
 *
 * `auditTheme` passed `contrastFloorsFor(theme)` into the contrast, selection and
 * indicator reports, while each of those defaulted to the ordinary floors — so
 * the same high-contrast brand was shippable through one entry point and a
 * failure through another, depending on which the caller reached for. The three
 * reports now select the floors the same way, and this case holds them to it.
 */
describe("the gate and its reports agree on a high-contrast brand", () => {
  const brand = extendTheme(highContrastLightTheme, {
    colors: { mutedForeground: "#505050", primary: "#6B6B6B" },
  });

  it("returns the same three reports the standalone checks do", () => {
    const audit = auditTheme(brand);

    expect(audit.contrast).toEqual(contrastFailures(brand));
    expect(audit.indicators).toEqual(indicatorFailures(brand));
    expect(audit.passed).toBe(false);
    expect(audit.contrast.length).toBeGreaterThan(0);
    expect(audit.indicators.length).toBeGreaterThan(0);
  });
});
