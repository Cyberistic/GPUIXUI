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
  invalidScales,
  keyboardDimFailures,
  lightTheme,
  platformNames,
  platformTheme,
  retroNames,
  retroTheme,
  selectionPairs,
  switchFailures,
  themes,
  type Theme,
  type ThemeColors,
} from "./index.js";

const faintPlaceholder = extendTheme(highContrastLightTheme, {
  colors: { placeholder: "#6F6F6F" },
});

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
    expect(contrastFailures(faintPlaceholder, contrastFloors)).toEqual([]);

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
      scales: [],
      switch: { paint: [], placements: [], metrics: [] },
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
      scales: [],
      switch: { paint: [], placements: [], metrics: [] },
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
    expect(auditTheme(highContrastLightTheme).disabledFade).toEqual([]);
    expect(
      auditTheme(highContrastLightTheme, highContrastFloors).disabledFade,
    ).toEqual([]);
  });

  it("reports a label the keyboard dim erases", () => {
    const erasedWhenDimmed = extendTheme(lightTheme, {
      colors: { primary: "#000000", primaryForeground: "#999999" },
    });
    const audit = auditTheme(erasedWhenDimmed);

    expect(audit.contrast).toEqual([]);
    expect(audit.indicators).toEqual([]);

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
    const fadedButVisible = extendTheme(lightTheme, {
      colors: { primary: "#000000", primaryForeground: "#B4B4B4" },
    });

    expect(keyboardDimFailures(fadedButVisible)).toEqual([]);
    expect(auditTheme(fadedButVisible).disabledFade.length).toBeGreaterThan(0);
    expect(auditTheme(fadedButVisible).keyboardDim).toEqual([]);
  });

  it("computes passed from every report it returns", () => {
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
        audit.scales,
        audit.switch.paint,
        audit.switch.placements,
        audit.switch.metrics,
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
    expect(highContrastLightTheme.colors.background).toBe("#FFFFFF");
    expect(highContrastLightTheme.colors.foreground).toBe("#000000");
    expect(auditTheme(highContrastLightTheme).passed).toBe(true);
    expect(auditTheme(shorthand).passed).toBe(true);
  });
});

describe("a brand whose colours carry a fully opaque alpha byte", () => {
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

describe("the gate holds the theme's own structure", () => {
  it("reports a scale whose steps no longer describe two sizes", () => {
    const inverted = extendTheme(lightTheme, { radius: { xl: 6 } });

    expect(invalidScales(inverted)).toEqual([
      {
        group: "radius",
        path: "xl",
        value: 6,
        previous: { path: "lg", value: 8 },
      },
    ]);
    expect(auditTheme(inverted).scales).toEqual(invalidScales(inverted));
    expect(auditTheme(inverted).passed).toBe(false);
  });

  it("reports a declared switch the reader cannot find", () => {
    const hidden = extendTheme(lightTheme, {
      switch: { on: "#30D158", off: lightTheme.colors.muted, knob: "#FFFFFF" },
    });

    expect(auditTheme(hidden).switch).toEqual(switchFailures(hidden));
    expect(
      auditTheme(hidden).switch.placements.filter(
        ({ slot, over }) => slot === "off" && over === "muted",
      ),
    ).toEqual([{ slot: "off", over: "muted", ratio: 1, floor: 1.05 }]);
    expect(auditTheme(hidden).passed).toBe(false);
  });

  it("keeps a theme that declares no switch out of the report", () => {
    expect(auditTheme(lightTheme).switch).toEqual({
      paint: [],
      placements: [],
      metrics: [],
    });
    expect(auditTheme(lightTheme).passed).toBe(true);
  });
});
