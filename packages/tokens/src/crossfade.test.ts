import { describe, expect, it } from "vitest";
import { mixColor, mixThemes } from "./crossfade.js";
import { darkTheme, lightTheme } from "./theme.js";

describe("mixColor", () => {
  it("meets halfway", () => {
    expect(mixColor("#000000", "#ffffff", 0.5)).toBe("#808080ff");
  });

  it("carries alpha", () => {
    expect(mixColor("#ff000000", "#ff0000ff", 0.5)).toBe("#ff000080");
  });
});

describe("mixThemes", () => {
  it("is exactly the endpoints when settled", () => {
    expect(mixThemes(darkTheme, lightTheme, 0)).toBe(darkTheme);
    expect(mixThemes(darkTheme, lightTheme, 1)).toBe(lightTheme);
  });

  it("passes through a colour between the two", () => {
    const mid = mixThemes(darkTheme, lightTheme, 0.5).colors.background;
    expect(mid).not.toBe(darkTheme.colors.background);
    expect(mid).not.toBe(lightTheme.colors.background);
    expect(mid).toMatch(/^#[0-9a-f]{8}$/);
  });

  it("keeps structure the mix does not own", () => {
    expect(mixThemes(darkTheme, lightTheme, 0.5).spacing).toBe(lightTheme.spacing);
  });
});
