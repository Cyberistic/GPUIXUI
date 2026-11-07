import { describe, expect, it } from "vitest";
import { platformStyles } from "./platforms.js";
import { densityPresets } from "./scale.js";
import { keyboardFocusRing } from "./styles.js";
import { platformTheme, themes } from "./theme.js";

const style = platformStyles.win32;
const light = platformTheme(themes.light, "win32");
const dark = platformTheme(themes.dark, "win32");

describe("Windows 11 (Fluent 2)", () => {
  it("corners controls at 4px and surfaces at 8px", () => {
    expect(style.radius).toEqual({
      none: 0,
      sm: 4,
      md: 4,
      lg: 8,
      xl: 8,
      full: 9999,
    });
    expect([light.radius.sm, light.radius.md]).toEqual([4, 4]);
    expect([light.radius.lg, light.radius.xl]).toEqual([8, 8]);
  });

  it("keeps the standard control at 32px on the 28/32/36 density", () => {
    expect(style.density).toBe("comfortable");
    expect(densityPresets[style.density].controlHeight).toEqual({
      sm: 28,
      md: 32,
      lg: 36,
    });

    expect(light.density.controlHeight).toEqual({ sm: 28, md: 32, lg: 36 });
  });

  it("paints the Fluent accent on the action and the focus rect", () => {
    expect(light.colors.primary).toBe("#0078D4");
    expect(light.colors.ring).toBe("#0078D4");
    expect(dark.colors.primary).toBe("#4CC2FF");
    expect(dark.colors.ring).toBe("#4CC2FF");

    expect(light.colors.primaryForeground).toBe("#FFFFFF");
    expect(dark.colors.primaryForeground).toBe("#11141A");
  });

  it("layers the Fluent neutral surfaces", () => {
    expect(light.colors.background).toBe("#F3F3F3");
    expect(light.colors.card).toBe("#FFFFFF");
    expect(dark.colors.background).toBe("#202020");
    expect(dark.colors.card).toBe("#2C2C2C");
    expect(dark.colors.card).not.toBe(dark.colors.background);
  });

  it("draws the focus rect as a 2px outline, not a layout border", () => {
    const ring = keyboardFocusRing(light).focusVisible;
    expect(ring.outlineWidth).toBe(2);
    expect(ring.outlineOffset).toBe(2);
    expect(ring.outlineColor).toBe(light.colors.ring);
    expect(Object.keys(keyboardFocusRing(light))).toEqual(["focusVisible"]);
  });
});
