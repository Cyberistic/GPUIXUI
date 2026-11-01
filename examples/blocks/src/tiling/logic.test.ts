/**
 * The tiling desktop's focus order and palette decoding.
 */
import { describe, expect, it } from "vitest";
import { paletteNames } from "./data.js";
import { nextFocus, paletteTheme, titleOf } from "./logic.js";

describe("the tiling desktop", () => {
  it("moves focus through the tiles and wraps", () => {
    expect(nextFocus("settings", 1)).toBe("terminal");
    expect(nextFocus("monitor", 1)).toBe("settings");
    expect(nextFocus("settings", -1)).toBe("monitor");
    expect(titleOf("monitor")).toBe("btop");
  });

  it("decodes every palette into its own theme", () => {
    const accents = paletteNames.map(
      (name) => paletteTheme(name).colors.primary,
    );
    expect(new Set(accents).size).toBe(paletteNames.length);
    expect(paletteTheme("tokyo-night").colors.background.toLowerCase()).toBe(
      "#1a1b26",
    );
  });
});
