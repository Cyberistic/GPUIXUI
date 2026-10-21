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
 */

import { describe, expect, it } from "vitest";
import { lightColors } from "./color.js";
import {
  decorativeFailures,
  decorativeFloor,
  decorativeSurfaces,
} from "./decorative.js";
import {
  decorativeSurfacesAreVisible,
  edgeLessBrand,
  report,
} from "./decorative.example.js";
import { platformNames } from "./platforms.js";
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
});
