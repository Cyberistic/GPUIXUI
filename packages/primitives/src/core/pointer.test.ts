/**
 * Guards the wash a control paints while the pointer is down.
 *
 * The bug this holds: a control's press was the raw `active` role, so it was
 * measured — and painted — as "a wash on a strip". It is neither. A press
 * **replaces** the hover wash the control is already wearing, so it has to be
 * seen against *that* wash. Measured over the sixteen shipped, high-contrast,
 * platform and authored styles, Light · macOS's press sat **1.037:1** from the
 * `hover` wash it replaces — under the 1.05:1 perceptibility floor — so a
 * ghost action, a toggle at rest, an empty checkbox or a number field's
 * stepper did not answer the pointer in that style.
 *
 * The wash is derived (`@gpuixui/tokens`' `pointerWash`): the smallest move
 * toward the theme's `foreground` that clears the floor against the wash being
 * replaced, and never one that costs a label the floor it holds on the role
 * the wash plays. A palette that already answers the pointer is painted as it
 * is, so a correct wash is never repainted.
 *
 * The other half of the guard is the **one seam**: every painter that owns a
 * press reads it here, so a control cannot drift back to the raw role while
 * another one keeps the derived wash.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import {
  contrastFloorsFor,
  contrastRatio,
  darkTheme,
  decorativeFloor,
  getTheme,
  lightTheme,
  platformNames,
  platformTheme,
  retroNames,
  retroTheme,
  themes,
  type Theme,
} from "@gpuixui/tokens";
import { numberStepperStyle } from "./style.js";
import { selectionBoxStyle, switchTrackStyle } from "./selection.js";
import { buttonVariants, toggleVariants } from "./variants.js";
import { pressWash, primaryButton } from "./pointer.js";

/** Every shipped, high-contrast, platform and authored style, named. */
const everyStyle: ReadonlyArray<readonly [string, Theme]> = [
  [lightTheme.name, lightTheme],
  [darkTheme.name, darkTheme],
  [getTheme("light", "high").name, getTheme("light", "high")],
  [getTheme("dark", "high").name, getTheme("dark", "high")],
  ...Arr.flatMap(platformNames, (platform) =>
    Arr.map(
      [themes.light, themes.dark] as const,
      (base) =>
        [
          platformTheme(base, platform).name,
          platformTheme(base, platform),
        ] as const,
    ),
  ),
  ...Arr.flatMap(retroNames, (name) =>
    Arr.map(
      [themes.light, themes.dark] as const,
      (base) => [retroTheme(base, name).name, retroTheme(base, name)] as const,
    ),
  ),
];

/**
 * The fill a control's press paints, read off a painter's own answer. The third
 * entry is `false` for a control that declares its own paint: a platform's
 * switch keeps its fill under the pointer rather than washing it.
 */
const painters: ReadonlyArray<
  readonly [string, (theme: Theme) => string, boolean?]
> = [
  [
    "Button ghost",
    (theme) => buttonVariants.ghost.active(theme).backgroundColor ?? "",
  ],
  [
    "Button outline",
    (theme) => buttonVariants.outline.active(theme).backgroundColor ?? "",
  ],
  [
    "Button link",
    (theme) => buttonVariants.link.active(theme).backgroundColor ?? "",
  ],
  [
    "Toggle at rest",
    (theme) => toggleVariants.default.rest.active(theme).backgroundColor ?? "",
  ],
  [
    "an empty checkbox",
    (theme) =>
      selectionBoxStyle(
        { state: "unchecked", size: "md", accent: "primary" },
        theme,
      ).active?.backgroundColor ?? "",
  ],
  [
    "an empty switch",
    (theme) =>
      // A theme whose style declares a switch paints the native toggle, which
      // answers a press by changing state rather than by washing the track.
      theme.switch?.off ??
      switchTrackStyle(
        { state: "unchecked", size: "md", accent: "primary" },
        theme,
      ).active?.backgroundColor ??
      "",
    false,
  ],
  [
    "a number field's stepper",
    (theme) => numberStepperStyle({}, theme).active?.backgroundColor ?? "",
  ],
];

describe("the wash a control's press paints", () => {
  it("names the defect it holds: the raw role cannot be seen", () => {
    // The premise. Without it the derived wash would be a preference rather
    // than a repair, and the case below could not say what it fixed.
    const macos = platformTheme(themes.light, "darwin");

    expect(contrastRatio(macos.colors.active, macos.colors.hover)).toBeLessThan(
      decorativeFloor,
    );
    expect(pressWash(macos)).not.toBe(macos.colors.active);
  });

  it("clears the floor against the wash it replaces", () => {
    everyStyle.forEach(([name, theme]) => {
      const painted = pressWash(theme);

      expect(
        contrastRatio(painted, theme.colors.hover),
        `${name}: the press against the hover it replaces`,
      ).toBeGreaterThanOrEqual(decorativeFloor);
    });
  });

  it("keeps the label the wash carries at its floor", () => {
    // The press plays the `active` role, so it carries the labels the contrast
    // table measures on that role — a control's own text first of all. A wash
    // that cannot be seen is a defect; a wash that erases the label is worse.
    everyStyle.forEach(([name, theme]) => {
      const painted = pressWash(theme);

      expect(
        contrastRatio(theme.colors.foreground, painted),
        `${name}: the label on the press`,
      ).toBeGreaterThanOrEqual(contrastFloorsFor(theme).body);
    });
  });

  it("leaves a palette that already answers the pointer as it is", () => {
    // The base light theme's own press clears the floor against the hover it
    // replaces, so a derivation that always moved a palette would repaint a
    // correct wash on every control in it.
    expect(pressWash(lightTheme)).toBe(lightTheme.colors.active);
    expect(pressWash(darkTheme)).toBe(darkTheme.colors.active);
  });

  it("paints the role it has when the derivation cannot be built", () => {
    // A theme restored from storage can predate the role, and a control that
    // cannot derive a press paints the role it has — the absence rule every
    // other contract follows, rather than a crash or an invented colour.
    const stored = {
      colors: { active: lightTheme.colors.active },
      contrast: lightTheme.contrast,
    };

    expect(pressWash(stored)).toBe(stored.colors.active);
  });

  it("is the one seam every painter reads", () => {
    // A painter that asks for the raw role again would look right in every
    // style but Light · macOS, so the seam is read from each painter's own
    // answer rather than from the recipes. A platform's own switch is the one
    // painter that declares its fill: a native toggle does not wash its track
    // under the pointer.
    everyStyle.forEach(([name, theme]) => {
      painters.forEach(([label, paint, washes = true]) => {
        const declared = !washes && theme.switch !== undefined;
        expect(paint(theme), `${name}: ${label}`).toBe(
          declared ? theme.switch?.off : pressWash(theme),
        );
      });
    });
  });
});

describe("primaryButton", () => {
  it("reads a press with no button, or the left one, as the primary gesture", () => {
    expect(primaryButton({})).toBe(true);
    expect(primaryButton({ button: 0 })).toBe(true);
  });

  it("refuses the right and middle presses the runtime also delivers", () => {
    // `onClick` is the primary button's only, while `mouseDown` arrives for all
    // three: a control that took any press moved its value on a context-menu
    // gesture the caller never heard about.
    expect(primaryButton({ button: 1 })).toBe(false);
    expect(primaryButton({ button: 2 })).toBe(false);
  });
});
