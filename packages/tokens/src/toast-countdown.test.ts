/**
 * Guards the Toast countdown's groove.
 *
 * The bug: the shipped Toast paints its 2px countdown groove with `muted`, a
 * surface role, on a `popover` card. `muted` is `popover` in the identity dark
 * theme and every platform and recipe dark set, so the groove measures
 * **1.000:1**; the unfilled remainder of the countdown — the elapsed-time
 * signal — has no shape. The designed groove is `track`, which
 * `trackSurfacePairs` already measures on `popover`, and the bar is the tone's
 * readable ink (`xText`), which the plan-348 migration asks the component to
 * paint.
 *
 * This test holds the copyable two-role composition a consumer copies
 * (`toast-countdown.example.ts`) to every shipped theme and tone, and proves the
 * old role choice cannot meet the groove floor.
 */
import { describe, expect, it } from "vitest";
import { contrastFloors, contrastRatio } from "./contrast.js";
import { shippedThemes } from "./shipped-themes.js";
import { statusTones } from "./styles.js";
import { countdownStyle } from "./toast-countdown.example.js";

const themes = shippedThemes.map(({ theme }) => theme);

describe("the Toast countdown's groove", () => {
  it("returns the designed groove and the tone's readable ink", () => {
    themes.forEach((theme) => {
      statusTones.forEach((tone) => {
        const style = countdownStyle(theme, tone);
        expect(style.groove, `${theme.name} ${tone}`).toBe(theme.colors.track);
        expect(style.bar, `${theme.name} ${tone}`).toBe(
          theme.colors[`${tone}Text`],
        );
      });
    });
  });

  it("keeps the groove perceivable on the toast card", () => {
    themes.forEach((theme) => {
      const floor = contrastFloors[theme.contrast].surface;
      const ratio = contrastRatio(
        countdownStyle(theme, "info").groove,
        theme.colors.popover,
      );
      expect(ratio, theme.name).toBeGreaterThanOrEqual(floor);
    });
  });

  it("keeps the bar a mark on the groove", () => {
    themes.forEach((theme) => {
      const floor = contrastFloors[theme.contrast].mark;
      statusTones.forEach((tone) => {
        const style = countdownStyle(theme, tone);
        expect(
          contrastRatio(style.bar, style.groove),
          `${theme.name} ${tone}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("shows why the shipped `muted` groove cannot work", () => {
    const dark = themes.filter(
      (theme) => theme.mode === "dark" && theme.contrast === "default",
    );
    expect(dark.length).toBeGreaterThan(0);
    dark.forEach((theme) => {
      expect(
        contrastRatio(theme.colors.muted, theme.colors.popover),
        theme.name,
      ).toBeLessThan(contrastFloors.default.surface);
    });
  });

  it("does not fall back to the surface role it replaces", () => {
    themes.forEach((theme) => {
      expect(countdownStyle(theme, "info").groove, theme.name).not.toBe(
        theme.colors.muted,
      );
    });
  });
});
