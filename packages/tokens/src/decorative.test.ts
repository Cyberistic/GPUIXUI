/**
 * Guards the perceptibility floor for the surfaces that carry no text.
 *
 * The bug this holds: the contrast contract measured text and boundaries only,
 * so a divider, a skeleton fill or a modal veil could ship the same value as
 * the surface it is painted on — an invisible rule, a loading block that reads
 * as an empty row, a dialog with no layer behind it. Two shipped platform
 * palettes did exactly that: macOS light's inherited skeleton reached 1.045:1
 * on its muted strip and Linux dark's reached 1.004:1 on its card, so both
 * styles now carry a `skeleton` of their own.
 *
 * The state washes joined the same contract because they had the same hole and
 * a worse symptom: the base dark theme's `hover` was its `popover`, so hovering
 * a menu row repainted the surface it already sat on, and the base light
 * theme's `hover` was its `muted` toolbar; macOS light's `hover` was its own
 * muted strip, and Windows light's and Linux dark's were within a step of one.
 * Those five now carry a wash a reader can see.
 *
 * The tonal action's resting fill joined last, and it is the same defect one
 * control over: `secondary` is a filled variant with no border and no brand
 * colour, so the fill is the whole button. The base light theme shipped it
 * equal to `muted` (1.000:1), which made a secondary button inside a muted
 * toolbar a label with no button around it; macOS light's window sat at
 * 1.015:1, Linux light at 1.040:1, Windows light at 1.021:1, and the four dark
 * platform/look palettes fell at 1.021–1.049:1 on their lighter popovers. Each
 * of those styles now carries its own control face.
 *
 * The status tint joined last, and it is the surface a message actually sits in:
 * `xSoft` appeared only as the background a `statusEdge` was measured over, so a
 * tint that matched its strip passed every suite. Measured, the base light
 * theme's `successSoft` was 1.006:1 on its `muted` toolbar, Luna light's
 * `infoSoft` was its own beige page at 1.00:1, and macOS light, Windows light,
 * Aero light and the three lighter dark popovers were all within 5% — an alert
 * or a soft badge in one had no surface of its own. The light tints now sit one
 * ramp step deeper (the 200 step with the 900 text), the dark ones one step
 * lighter (800 with the 100 text), and Luna — whose beige page is at the same
 * lightness a pale tint has — carries a lighter tint of its own.
 */

import { describe, expect, it } from "vitest";
import { alpha, lightColors, palette } from "./color.js";
import {
  decorativeFailures,
  decorativeFloor,
  decorativeSurfaces,
} from "./decorative.js";
import {
  decorativeSurfacesAreVisible,
  edgeLessBrand,
  flatActionBrand,
  report,
} from "./decorative.example.js";
import { statusEdgeAlpha, statusTone, statusTones } from "./styles.js";
import { platformNames } from "./platforms.js";
import { retroTheme } from "./retro.js";
import {
  darkTheme,
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

/** Every platform style in both modes, as `platformTheme` resolves it. */
const platformThemes = platformNames
  .filter((name) => name !== "default")
  .flatMap((name) => [
    platformTheme(themes.light, name),
    platformTheme(themes.dark, name),
  ]);

const measured = (surface: string, role: string, over: string): boolean =>
  decorativeSurfaces.some(
    (entry) =>
      entry.surface === surface && entry.role === role && entry.over === over,
  );

describe("decorative surfaces", () => {
  it("measures a divider on every surface it can rule", () => {
    const missing = ["background", "card", "popover", "muted"].filter(
      (over) => !measured("divider", "border", over),
    );

    expect(missing).toEqual([]);
  });

  it("measures a skeleton on every surface it can stand in", () => {
    const missing = ["background", "card", "muted"].filter(
      (over) => !measured("skeleton", "skeleton", over),
    );

    expect(missing).toEqual([]);
  });

  it("measures a veil over the content surfaces a modal covers", () => {
    const missing = ["card", "popover"].filter(
      (over) => !measured("scrim", "overlay", over),
    );

    expect(missing).toEqual([]);
  });

  it("measures every status edge on its tint and on both page surfaces", () => {
    const missing = statusTones.flatMap((tone) =>
      [`${tone}Soft`, "background", "card"]
        .filter((over) => !measured("statusEdge", tone, over))
        .map((over) => `${tone}/${over}`),
    );

    expect(missing).toEqual([]);
  });

  it("measures the edge the component actually paints", () => {
    // The edge's share is a design value, not a role; if `statusTone` paints a
    // different one the measurement moves to a surface nobody sees.
    statusTones.forEach((tone) => {
      const entry = decorativeSurfaces.find(
        ({ surface, role }) => surface === "statusEdge" && role === tone,
      );

      expect(entry?.alpha, tone).toBe(statusEdgeAlpha);
      expect(statusTone(lightTheme, tone).border).toBe(
        alpha(lightColors[tone], statusEdgeAlpha),
      );
    });
  });

  it("measures every soft status surface on every strip a message sits on", () => {
    // An alert, a toast and a soft badge are painted on the page, in a card, in
    // a popover and in a muted toolbar — the tint is what tells the message
    // apart from the surface behind it, so it is measured on all four.
    const missing = statusTones.flatMap((tone) =>
      ["background", "card", "popover", "muted"]
        .filter((over) => !measured("statusTint", `${tone}Soft`, over))
        .map((over) => `${tone}Soft/${over}`),
    );

    expect(missing).toEqual([]);
  });

  it("reports a soft status surface that matches the strip it tints", () => {
    const broken = {
      colors: { ...lightColors, successSoft: lightColors.muted },
    };

    expect(
      decorativeFailures(broken).find(
        ({ surface, role, over }) =>
          surface === "statusTint" &&
          role === "successSoft" &&
          over === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports the tints the light palettes shipped before this step", () => {
    // Measured on the shipped values: a step-100 success tint in a light muted
    // toolbar and Luna light's step-100 info tint on its own beige page. Both
    // were invisible surfaces that every contract called a pass.
    const beforeBase = {
      colors: { ...lightColors, successSoft: palette.green[100] },
    };
    const beforeLuna = {
      colors: {
        ...retroTheme(lightTheme, "luna").colors,
        infoSoft: palette.blue[100],
      },
    };

    expect(
      decorativeFailures(beforeBase).find(
        ({ surface, role, over }) =>
          surface === "statusTint" &&
          role === "successSoft" &&
          over === "muted",
      )?.ratio,
    ).toBeCloseTo(1.006, 2);
    expect(
      decorativeFailures(beforeLuna).find(
        ({ surface, role, over }) =>
          surface === "statusTint" &&
          role === "infoSoft" &&
          over === "background",
      )?.ratio,
    ).toBeCloseTo(1, 2);
  });

  it("measures a scrollbar on every surface a scroller can sit on", () => {
    const missing = ["background", "card", "popover", "muted"].filter(
      (over) => !measured("scrollbar", "scrollbar", over),
    );

    expect(missing).toEqual([]);
  });

  it("measures every state wash on every strip it tints", () => {
    // A component paints a row's hover, press, selection or accent tint on the
    // page, in a card, in a popover and in a muted toolbar — so each role is
    // measured on all four rather than on one and assumed for the rest.
    const missing = ["hover", "active", "selected", "accent"].flatMap((role) =>
      ["background", "card", "popover", "muted"]
        .filter((over) => !measured("stateWash", role, over))
        .map((over) => `${role}/${over}`),
    );

    expect(missing).toEqual([]);
  });

  it("reports a hover that matches the row it tints", () => {
    // The shipped defect: the base dark theme's hover was its popover value, so
    // a hovered menu row painted the surface it already sat on.
    const broken = { colors: { ...lightColors, hover: lightColors.muted } };

    expect(
      decorativeFailures(broken).find(
        ({ surface, role, over }) =>
          surface === "stateWash" && role === "hover" && over === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports a scrollbar thumb that matches the strip it moves along", () => {
    const broken = {
      colors: { ...lightColors, scrollbar: lightColors.background },
    };

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "scrollbar" && over === "background",
      ),
    ).toMatchObject({ role: "scrollbar", ratio: 1, floor: decorativeFloor });
  });

  it("measures the tonal action's fill on every strip it sits on", () => {
    // A secondary button paints no border, so its fill is the whole control: a
    // fill that matches the toolbar it lives in leaves a label with no button
    // around it. A toolbar, a card, a popover and the page all hold one.
    const missing = ["background", "card", "popover", "muted"].filter(
      (over) => !measured("filledAction", "secondary", over),
    );

    expect(missing).toEqual([]);
  });

  it("reports a filled action that matches the strip it sits on", () => {
    // The shipped defect: the base light theme's `secondary` was its `muted`
    // value, and `secondary` paints `border-0`, so a secondary button in a
    // muted toolbar had no edge, no fill difference and no hover until pressed.
    const broken = {
      colors: { ...lightColors, secondary: lightColors.muted },
    };

    expect(
      decorativeFailures(broken).find(
        ({ surface, role, over }) =>
          surface === "filledAction" &&
          role === "secondary" &&
          over === "muted",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("passes every shipped theme", () => {
    shippedThemes.forEach((theme) => {
      expect(decorativeFailures(theme), theme.name).toEqual([]);
    });
  });

  it("passes every platform style in both modes", () => {
    platformThemes.forEach((theme) => {
      expect(decorativeFailures(theme), theme.name).toEqual([]);
    });
  });
});

describe("decorativeFailures", () => {
  it("reports a divider that matches the page it rules", () => {
    const broken = {
      colors: { ...lightColors, border: lightColors.background },
    };

    expect(decorativeFailures(broken)).toContainEqual({
      surface: "divider",
      role: "border",
      over: "background",
      ratio: 1,
      floor: decorativeFloor,
    });
  });

  it("reports a skeleton that disappears into the card it stands in", () => {
    const broken = { colors: { ...lightColors, skeleton: lightColors.card } };

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "skeleton" && over === "card",
      ),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports a status edge that matches the tint it bounds", () => {
    // A message whose edge is its own fill has no boundary left; the text still
    // carries the meaning, but the shape is gone.
    const broken = { colors: { ...lightColors, info: lightColors.infoSoft } };

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "statusEdge" && over === "infoSoft",
      ),
    ).toMatchObject({ role: "info", ratio: 1, floor: decorativeFloor });
  });

  it("composites the veil instead of reporting it unmeasurable", () => {
    // `contrastRatio` refuses a translucent colour. The veil is translucent in
    // every theme by design, so the contract must measure the painted result;
    // otherwise the one surface a modal depends on would never be checked.
    expect(
      decorativeFailures(lightTheme).some(({ surface }) => surface === "scrim"),
    ).toBe(false);
    const broken = { colors: { ...lightColors, overlay: "#00000000" } };

    expect(
      decorativeFailures(broken).find(({ surface }) => surface === "scrim"),
    ).toMatchObject({ ratio: 1, floor: decorativeFloor });
  });

  it("reports a surface it cannot measure rather than skipping it", () => {
    // A translucent page cannot be compared with what is painted on it; an
    // unverifiable surface is a failure, not a pass.
    const broken = {
      colors: { ...lightColors, background: "#F6F8FA80" },
    };

    expect(
      decorativeFailures(broken).find(
        ({ surface, over }) => surface === "divider" && over === "background",
      )?.ratio,
    ).toBeUndefined();
  });

  it("takes a floor, so a stricter brand can run the check it needs", () => {
    expect(decorativeFailures(lightTheme, 1)).toEqual([]);
    expect(decorativeFailures(lightTheme, 21).length).toBe(
      decorativeSurfaces.length,
    );
  });
});

describe("the documented example", () => {
  it("passes the shipped theme and reports the brand that erased its card edge", () => {
    expect(decorativeSurfacesAreVisible(lightTheme)).toBe(true);
    expect(decorativeSurfacesAreVisible(edgeLessBrand)).toBe(false);
    expect(report(edgeLessBrand)).toContain("divider: border on card is 1.00");
    expect(report(lightTheme)).toEqual([]);
  });

  it("reports the brand whose tonal action is its toolbar", () => {
    expect(decorativeSurfacesAreVisible(flatActionBrand)).toBe(false);
    expect(report(flatActionBrand)).toContain(
      "filledAction: secondary on muted is 1.00",
    );
  });
});
