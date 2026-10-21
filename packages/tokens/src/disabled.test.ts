/**
 * Guards the disabled state a control paints by fading itself.
 *
 * The bug this holds: the contract measured the role pair (`disabled` behind
 * `disabledForeground`) and the rest of the library faded the whole control —
 * `disabled:opacity-50` in the recipes, `opacity = 0.5` in the primitive cores —
 * which `contrastRatio` refuses, so the mechanism most controls actually use was
 * measured by nothing. Compositing the fade shows why that mattered: a filled
 * action's label lands between 1.51:1 and 2.83:1, and a high-contrast theme's
 * between 1.74:1 and 2.23:1 — under the 3:1 its variant asks for, which is the
 * measured reason the role pair is the contract and the fade is the deviation.
 */

import { describe, expect, it } from "vitest";
import { blend, lightColors } from "./color.js";
import { contrastFloors, highContrastFloors } from "./contrast.js";
import {
  disabledFadeFailures,
  disabledFadePairs,
  disabledOpacity,
} from "./disabled.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import {
  darkTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  themes,
} from "./theme.js";

const shipped = [
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  highContrastDarkTheme,
] as const;

/** Every platform style in both modes, then every authored look's two editions. */
const styled = platformNames.flatMap((platform) => [
  platformTheme(themes.light, platform),
  platformTheme(themes.dark, platform),
]);
const looks = retroNames.flatMap((look) => [
  retroTheme(lightTheme, look),
  retroTheme(darkTheme, look),
]);

const measured = (fill: string, over: string): boolean =>
  disabledFadePairs.some((pair) => pair.fill === fill && pair.over === over);

describe("disabledOpacity", () => {
  it("is a design constant rather than a theme group", () => {
    expect(disabledOpacity).toBe(0.5);
    // A brand cannot lower it through `extendTheme`: it is not part of `Theme`.
    expect(Object.keys(lightTheme)).not.toContain("disabledOpacity");
  });
});

describe("disabledFadePairs", () => {
  it("measures every filled action on the page", () => {
    const missing = ["primary", "destructive", "secondary"]
      .filter((fill) => !measured(fill, "background"))
      .map((fill) => `${fill}/background`);

    expect(missing).toEqual([]);
  });

  it("measures a field on every surface it can sit on", () => {
    const missing = ["background", "card", "popover"]
      .filter((over) => !measured("input", over))
      .map((over) => `input/${over}`);

    expect(missing).toEqual([]);
  });
});

describe("disabledFadeFailures", () => {
  it("passes every shipped, platform and authored theme at the disabled floor", () => {
    // The fade is a mechanism, so it is held to the default disabled floor in
    // every variant; the floor that rises is the role pair's.
    [...shipped, ...styled, ...looks].forEach((theme) => {
      expect(disabledFadeFailures(theme), theme.name).toEqual([]);
    });
  });

  it("composites the label over the faded fill, not over the page", () => {
    const primary = disabledFadeFailures(lightTheme, 2).find(
      ({ fill }) => fill === "primary",
    );

    // 50% primary over white, then 50% of the white label over that: 1.57:1.
    // Measuring the label against the page instead would report ~11:1 and call
    // a disabled button readable.
    expect(primary?.ratio).toBeCloseTo(1.57, 2);
    expect(primary?.floor).toBe(2);
  });

  it("reports a label painted into its own faded fill", () => {
    // A label equal to the faded fill is the erased state: the control is there,
    // its text is not. `edge` is that composited fill, so the faded label is the
    // same colour.
    const erased = blend(
      lightColors.primary,
      lightColors.background,
      1 - disabledOpacity,
    );
    const broken = {
      colors: { ...lightColors, primaryForeground: erased },
    };

    expect(
      disabledFadeFailures(broken).find(({ fill }) => fill === "primary"),
    ).toMatchObject({
      label: "primaryForeground",
      over: "background",
      ratio: 1,
      floor: contrastFloors.disabled,
    });
  });

  it("reports a role it cannot composite rather than skipping it", () => {
    const translucent = {
      colors: { ...lightColors, primary: "#5F4BDB80" },
    };

    expect(
      disabledFadeFailures(translucent).find(({ fill }) => fill === "primary")
        ?.ratio,
    ).toBeUndefined();
  });

  it("takes a floor, so a stricter brand can run the check it needs", () => {
    expect(disabledFadeFailures(lightTheme, 1)).toEqual([]);
    expect(disabledFadeFailures(lightTheme, 21).length).toBe(
      disabledFadePairs.length,
    );
  });

  it("cannot reach the high-contrast disabled floor at the shipped share", () => {
    // The measurement behind the design decision: a high-contrast theme fades a
    // filled action to ~1.7:1, under the 3:1 its variant's disabled floor asks
    // for, so that theme's `disabled` state is the role pair. If the fade ever
    // clears it, this case fails and the documentation moves with it.
    const faded = disabledFadeFailures(
      highContrastLightTheme,
      highContrastFloors.disabled,
    ).map(({ fill }) => fill);

    expect(faded).toEqual(["primary", "destructive"]);
  });
});
