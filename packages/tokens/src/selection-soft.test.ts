/**
 * Guards the defect plan 091 fixed: the selection contract named nine surfaces
 * but not the four soft status surfaces a tone-tinted Alert or Badge paints, so
 * selecting their text was not measured. Identity light `successSoftForeground`
 * through the wash measured 5.83:1, under the 7:1 body floor, and Windows
 * dark's 20% wash over `destructiveSoft` measured 1.005:1 — an invisible
 * highlight.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  statusTones,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const shipped: ReadonlyArray<Theme> = shippedThemes.map(({ theme }) => theme);

const washed = (
  theme: Theme,
  role: "info" | "success" | "warning" | "destructive",
) => compositeOver(theme.colors.selection, theme.colors[`${role}Soft`]);

describe("selection inside a soft status surface", () => {
  it("keeps the tone's text at the body floor and the wash visible", () => {
    shipped.forEach((theme) => {
      const floors = contrastFloors[theme.contrast];
      statusTones.forEach((tone) => {
        const paint = washed(theme, tone);
        expect(
          contrastRatio(theme.colors[`${tone}SoftForeground`], paint),
          `${theme.name} ${tone}SoftForeground through the wash`,
        ).toBeGreaterThanOrEqual(floors.body);
        expect(
          contrastRatio(paint, theme.colors[`${tone}Soft`]),
          `${theme.name} selection wash on ${tone}Soft`,
        ).toBeGreaterThanOrEqual(floors.surface);
      });
    });
  });

  it("replaces the light success text that fell through the wash", () => {
    const theme = getTheme("light");
    const paint = washed(theme, "success");

    expect(contrastRatio("#0E5135", paint)).toBeLessThan(7);
    expect(
      contrastRatio(theme.colors.successSoftForeground, paint),
    ).toBeGreaterThanOrEqual(7);
    expect(theme.colors.successSoftForeground).not.toBe("#0E5135");
  });

  it("replaces the Windows dark wash that vanished on destructiveSoft", () => {
    const windows = getPlatformTheme("win32", "dark");
    const fill = windows.colors.destructiveSoft;

    expect(contrastRatio(compositeOver("#0067C033", fill), fill)).toBeLessThan(
      1.05,
    );
    expect(
      contrastRatio(compositeOver(windows.colors.selection, fill), fill),
    ).toBeGreaterThanOrEqual(1.05);
    expect(windows.colors.selection).toBe("#0067C066");
  });

  it("keeps Linux dark's body text on the washes it paints", () => {
    const linux = getPlatformTheme("linux", "dark");
    const floors = contrastFloors.default;

    expect(linux.colors.destructiveSoft).toBe("#3A0B0D");
    expect(
      contrastRatio(
        linux.colors.foreground,
        compositeOver(linux.colors.selection, linux.colors.active),
      ),
      "foreground on active",
    ).toBeGreaterThanOrEqual(floors.body);
    (["active", "selected"] as const).forEach((surface) => {
      expect(
        contrastRatio(
          linux.colors.mutedForeground,
          compositeOver(linux.colors.selection, linux.colors[surface]),
        ),
        `mutedForeground on ${surface}`,
      ).toBeGreaterThanOrEqual(floors.secondary);
    });
    expect(
      contrastRatio(
        linux.colors.selectedForeground,
        compositeOver(linux.colors.selection, linux.colors.selected),
      ),
      "selectedForeground on selected",
    ).toBeGreaterThanOrEqual(floors.secondary);
  });

  it("reports both failures through the public checker", () => {
    const light = getTheme("light");
    const faded = extendTheme(light, {
      colors: { successSoftForeground: "#0E5135" },
    });
    const fadedFailure = themeContrastFailures(faded).find(
      (failure) => failure.foreground === "successSoftForeground",
    );
    expect(fadedFailure?.wash).toBe("selection");
    expect(fadedFailure?.ratio).toBeLessThan(7);

    const windows = getPlatformTheme("win32", "dark");
    const flat = extendTheme(windows, { colors: { selection: "#0067C033" } });
    const flatFailure = themeContrastFailures(flat).find(
      (failure) =>
        failure.background === "destructiveSoft" &&
        failure.foreground === "selection",
    );
    expect(flatFailure?.pairClass).toBe("surface");
    expect(flatFailure?.ratio).toBeLessThan(1.05);
  });
});
