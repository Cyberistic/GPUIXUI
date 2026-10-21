/**
 * Guards the theme gate a consumer is told to run.
 *
 * The documented gate assembled its own check from two of the three reports and
 * called `contrastFailures(theme)` without floors, so it audited a theme that
 * declares `contrast: "high"` against the **default** floors: a brand derived
 * from the high-contrast palette could sit at 5:1 on its secondary text and be
 * reported shippable, and a theme whose divider matched its own card passed
 * because no decorative surface was measured at all. `auditTheme` holds a theme
 * to its own variant and reports all four, which is what these cases pin.
 */
import { describe, expect, it } from "vitest";
import {
  auditTheme,
  contrastFailures,
  contrastFloors,
  contrastFloorsFor,
  decorativeFailures,
  extendTheme,
  highContrastFloors,
  highContrastLightTheme,
  highContrastThemes,
  lightTheme,
  platformNames,
  platformTheme,
  retroNames,
  retroTheme,
  themes,
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
    expect(contrastFailures(faintPlaceholder)).toEqual([]);
    // ...and a real one once the theme's own variant decides.
    const { contrast, passed } = auditTheme(faintPlaceholder);
    expect(passed).toBe(false);
    expect(
      contrast.map(
        ({ foreground, background }) => `${foreground}/${background}`,
      ),
    ).toEqual(["placeholder/input"]);
    expect(contrast[0]?.floor).toBe(highContrastFloors.secondary);
  });

  it("honours an explicit floor set over the variant", () => {
    expect(auditTheme(faintPlaceholder, contrastFloors)).toEqual({
      invalidRoles: [],
      contrast: [],
      decorative: [],
      series: { surfaces: [], distinctness: [] },
      passed: true,
    });
  });
});

describe("all four reports are part of the gate", () => {
  it("reports a divider no contrast pair covers", () => {
    expect(contrastFailures(invisibleDividers)).toEqual([]);
    expect(decorativeFailures(invisibleDividers)).toContainEqual(
      expect.objectContaining({ surface: "divider", role: "border" }),
    );
    expect(auditTheme(invisibleDividers).passed).toBe(false);
  });

  it("reports an unpaintable role", () => {
    const typo = extendTheme(lightTheme, { colors: { ring: "#2559D" } });
    expect(auditTheme(typo).invalidRoles).toEqual([
      { role: "ring", value: "#2559D" },
    ]);
    expect(auditTheme(typo).passed).toBe(false);
  });
});
