/**
 * Guards the defect plan 083 fixes: status text (`xText`) was measured only on
 * `background`, `card` and `popover`, so a status label or indicator dot inside
 * a row that paints a state wash was never checked. Every light set had a
 * warning label below the 4.5:1 floor on the pressed wash — macOS 4.22:1, Linux
 * 4.24:1, Windows 4.36:1 — and high-contrast light measured 5.83:1 on `active`,
 * 6.70:1 on `accent`/`selected` and 6.92:1 on `hover` under the AAA 7:1 floor,
 * while the suite stayed green because the pair was absent.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  highContrastLightTheme,
  lightTheme,
  statusTones,
  themeContrastFailures,
  themeContrasts,
  themeModes,
  type Theme,
} from "./index.js";

const platforms = ["darwin", "linux", "win32"] as const;

const washes = ["hover", "active", "accent", "selected"] as const;

const variants: ReadonlyArray<readonly [string, Theme]> = themeModes.flatMap(
  (mode) =>
    themeContrasts.flatMap((contrast) => [
      [`identity ${mode} ${contrast}`, getTheme(mode, contrast)] as const,
      ...platforms.map(
        (platform) =>
          [
            `${platform} ${mode} ${contrast}`,
            getPlatformTheme(platform, mode, contrast),
          ] as const,
      ),
    ]),
);

const statusPairs = contrastPairs.filter(([foreground]) =>
  statusTones.some((tone) => foreground === `${tone}Text`),
);

describe("status text on the state washes", () => {
  it("keeps every shipped theme above its declared floor", () => {
    const failures = variants.flatMap(([label, theme]) =>
      statusPairs.flatMap(([foreground, background, pairClass]) => {
        const ratio = contrastRatio(
          theme.colors[foreground],
          theme.colors[background],
        );
        const floor = contrastFloors[theme.contrast][pairClass];
        return ratio >= floor
          ? []
          : [`${label}: ${foreground} on ${background} at ${ratio}`];
      }),
    );

    expect(failures).toEqual([]);
  });

  it("keeps a warning label readable in a pressed row", () => {
    expect(lightTheme.colors.warningText).toBe("#6B4500");

    platforms.forEach((platform) => {
      const theme = getPlatformTheme(platform, "light");
      expect(theme.colors.warningText, platform).toBe(
        lightTheme.colors.warningText,
      );
      expect(
        contrastRatio(theme.colors.warningText, theme.colors.active),
        platform,
      ).toBeGreaterThanOrEqual(contrastFloors.default.secondary);
    });

    expect(
      contrastRatio(lightTheme.colors.warningText, lightTheme.colors.active),
    ).toBeGreaterThanOrEqual(contrastFloors.default.secondary);
  });

  it("holds the high-contrast warning tonality to AAA on every wash", () => {
    expect(highContrastLightTheme.colors.warningText).toBe("#4B3100");

    washes.forEach((wash) => {
      expect(
        contrastRatio(
          highContrastLightTheme.colors.warningText,
          highContrastLightTheme.colors[wash],
        ),
        wash,
      ).toBeGreaterThanOrEqual(contrastFloors.high.secondary);
    });
  });

  it("names the pressed wash when a theme regresses", () => {
    const regressed = extendTheme(getPlatformTheme("darwin", "light"), {
      colors: { warningText: "#8E5B00" },
    });
    const failures = themeContrastFailures(regressed);

    expect(failures).toHaveLength(1);
    expect(failures[0]?.foreground).toBe("warningText");
    expect(failures[0]?.background).toBe("active");
    expect(failures[0]?.pairClass).toBe("secondary");
    expect(failures[0]?.floor).toBe(contrastFloors.default.secondary);
    expect(failures[0]?.ratio).toBeLessThan(contrastFloors.default.secondary);
  });

  it("publishes all sixteen status-wash pairs", () => {
    const washPairs = statusPairs.filter(([, background]) =>
      washes.some((wash) => wash === background),
    );

    expect(washPairs).toHaveLength(statusTones.length * washes.length);
    expect(new Set(washPairs).size).toBe(washPairs.length);
  });
});
