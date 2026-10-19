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
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  highContrastLightTheme,
  lightTheme,
  statusTones,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const platforms = ["darwin", "linux", "win32"] as const;

const washes = ["hover", "active", "accent", "selected"] as const;

const variants: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
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
        platform === "linux" ? lightTheme.colors.warningText : "#4B3100",
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
    // Plan 366 moved the role one half-step darker so a selected label keeps
    // its floor through the selection wash too.
    expect(highContrastLightTheme.colors.warningText).toBe("#3A2500");

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
    const failures = themeContrastFailures(regressed).filter(
      ({ wash, pairClass }) => wash === undefined && pairClass === "secondary",
    );

    expect(failures.map(({ background }) => background).toSorted()).toEqual([
      "active",
      "selected",
    ]);
    expect(
      failures.every(
        ({ foreground, pairClass, floor }) =>
          foreground === "warningText" &&
          pairClass === "secondary" &&
          floor === contrastFloors.default.secondary,
      ),
    ).toBe(true);
    expect(
      failures.every(({ ratio }) => ratio < contrastFloors.default.secondary),
    ).toBe(true);
    // The code plane holds the same role at body strength, which the regression
    // also misses: code is body copy, not a status label.
    expect(
      themeContrastFailures(regressed).some(
        ({ foreground, background, pairClass }) =>
          foreground === "warningText" &&
          background === "card" &&
          pairClass === "body",
      ),
    ).toBe(true);
  });

  it("publishes all sixteen status-wash pairs", () => {
    const washPairs = statusPairs.filter(([, background]) =>
      washes.some((wash) => wash === background),
    );

    expect(washPairs).toHaveLength(statusTones.length * washes.length);
  });
});
