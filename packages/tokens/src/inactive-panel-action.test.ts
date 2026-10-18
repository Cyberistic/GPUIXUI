/**
 * Guards the gap plan 514 closes: a filled action inside a tone-tinted status
 * panel had surface, step and label pairs but no disabled state. A disabled
 * "Try again" had no defined presentation and no pair, so an edited theme could
 * erase its label while `themeContrastFailures` returned `[]`.
 *
 * The canvas `disabled` fill cannot carry the state — it measures 1.0066:1 on XP
 * light's `warningSoft` and 1.0242:1 on the high-contrast dark
 * `destructiveSoft`, under the 1.05:1 surface floor — so a raised action keeps
 * the resting `softAction` fill and dims its label with `disabledForeground`.
 * A disabled control does not step, so the hover and press fills are outside the
 * contract by design.
 */

import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getTheme,
  inactivePanelActionPairs,
  inactiveSoftPairs,
  shippedThemes,
  textTiers,
  themeContrastFailures,
  themeTextTierFailures,
  type Theme,
} from "./index.js";

const softSurfaces = [
  "softAction",
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;

const variants: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

describe("the disabled action inside a status panel", () => {
  it("publishes the resting label once, on the raised fill", () => {
    expect(inactivePanelActionPairs).toEqual([
      ["disabledForeground", "softAction", "inactive"],
    ]);

    const pairs = contrastPairs.filter(
      ([foreground, background]) =>
        foreground === "disabledForeground" && background === "softAction",
    );
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.[2]).toBe("inactive");
  });

  it("keeps every shipped theme's disabled label readable", () => {
    const failures = variants.flatMap(([label, theme]) => {
      const ratio = contrastRatio(
        theme.colors.disabledForeground,
        theme.colors.softAction,
      );
      const floor = contrastFloors[theme.contrast].inactive;
      return ratio >= floor
        ? []
        : [`${label}: disabledForeground on softAction at ${ratio.toFixed(3)}`];
    });

    expect(failures).toEqual([]);
  });

  it("reports an edited theme whose disabled label matches the fill", () => {
    const base = getTheme("dark");
    const regressed = extendTheme(base, {
      colors: { disabledForeground: base.colors.softAction },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background }) =>
        foreground === "disabledForeground" && background === "softAction",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      foreground: "disabledForeground",
      background: "softAction",
      pairClass: "inactive",
      floor: contrastFloors.default.inactive,
      ratio: 1,
    });
  });

  it("keeps the disabled label a step below the enabled one", () => {
    expect(textTiers).toContainEqual([
      "disabledForeground",
      "softActionForeground",
    ]);

    const failures = variants.flatMap(([label, theme]) =>
      softSurfaces.flatMap((surface) => {
        const enabled = contrastRatio(
          theme.colors.softActionForeground,
          theme.colors[surface],
        );
        const disabled = contrastRatio(
          theme.colors.disabledForeground,
          theme.colors[surface],
        );
        const step = contrastFloors[theme.contrast].step;
        return enabled / disabled >= step
          ? []
          : [
              `${label}: ${surface} enabled ${enabled.toFixed(3)} / disabled ${disabled.toFixed(3)}`,
            ];
      }),
    );
    expect(failures).toEqual([]);

    const base = getTheme("light");
    const flattened = extendTheme(base, {
      colors: { disabledForeground: base.colors.softActionForeground },
    });
    expect(themeTextTierFailures(flattened)).toContainEqual(
      expect.objectContaining({
        dimmer: "disabledForeground",
        brighter: "softActionForeground",
      }),
    );
  });

  it("measures the resting fill only, because a disabled control does not step", () => {
    const hoverAndPress = contrastPairs.filter(
      ([foreground, background]) =>
        foreground === "disabledForeground" &&
        (background === "softActionHover" ||
          background === "softActionActive" ||
          background === "softAction"),
    );
    expect(hoverAndPress.map(([, background]) => background)).toEqual([
      "softAction",
    ]);

    // Pins why the state fills stay out: at high contrast neither would pass the
    // floor the resting pair clears, so publishing them would demand a palette
    // change for a state a disabled control never reaches.
    const high = getTheme("dark", "high");
    const floor = contrastFloors.high.inactive;
    (["softActionHover", "softActionActive"] as const).forEach((fill) => {
      const ratio = contrastRatio(
        high.colors.disabledForeground,
        high.colors[fill],
      );
      expect(ratio, fill).toBeLessThan(floor);
    });
    expect(
      contrastRatio(high.colors.disabledForeground, high.colors.softAction),
    ).toBeGreaterThanOrEqual(floor);
  });

  it("keeps the ghost state covered by the panel surface pairs", () => {
    // A ghost disabled action paints no fill: its label sits on the tone tint,
    // which plan 307 already measures. The raised fill is the only state that
    // needed a pair.
    const ghost = inactiveSoftPairs.map(([foreground, background]) => [
      foreground,
      background,
    ]);
    softSurfaces.slice(1).forEach((surface) => {
      expect(ghost, surface).toContainEqual(["disabledForeground", surface]);
    });
  });
});
