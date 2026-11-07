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
    everyStyle.forEach(([name, theme]) => {
      const painted = pressWash(theme);

      expect(
        contrastRatio(theme.colors.foreground, painted),
        `${name}: the label on the press`,
      ).toBeGreaterThanOrEqual(contrastFloorsFor(theme).body);
    });
  });

  it("leaves a palette that already answers the pointer as it is", () => {
    expect(pressWash(lightTheme)).toBe(lightTheme.colors.active);
    expect(pressWash(darkTheme)).toBe(darkTheme.colors.active);
  });

  it("paints the role it has when the derivation cannot be built", () => {
    const stored = {
      colors: { active: lightTheme.colors.active },
      contrast: lightTheme.contrast,
    };

    expect(pressWash(stored)).toBe(stored.colors.active);
  });

  it("is the one seam every painter reads", () => {
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
    expect(primaryButton({ button: 1 })).toBe(false);
    expect(primaryButton({ button: 2 })).toBe(false);
  });
});
