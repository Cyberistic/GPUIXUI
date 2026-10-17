/**
 * Guards the gap plan 093 closes: the focus ring was measured on the eight
 * surfaces a focused control sits on, but not the four soft status fills — and a
 * Toast's action button ("Retry", "Undo") is focused while it sits directly on
 * `warningSoft` or `destructiveSoft`. No shipped set failed the floor when the
 * pairs were added (identity light `warningSoft` at 3.37:1 is the tightest), so
 * no colour moves; the pairs exist so an edited theme cannot make a focused
 * control lose its only focus indicator there.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  ringSoftPairs,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const platforms = ["darwin", "linux", "win32"] as const;

const softFills = [
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;

const variants: ReadonlyArray<readonly [string, Theme]> = (
  ["light", "dark"] as const
).flatMap((mode) =>
  (["default", "high"] as const).flatMap((contrast) => [
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

const softPairs = contrastPairs.filter(
  ([foreground, background]) =>
    foreground === "ring" && softFills.some((fill) => fill === background),
);

describe("the focus ring on a soft status surface", () => {
  it("keeps every shipped theme's ring perceivable", () => {
    const failures = variants.flatMap(([label, theme]) =>
      softPairs.flatMap(([foreground, background, pairClass]) => {
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

  it("holds the high-contrast ring to 4.5:1 on the soft fills", () => {
    variants
      .filter(([label]) => label.includes(" high"))
      .forEach(([label, theme]) => {
        softFills.forEach((fill) => {
          expect(
            contrastRatio(theme.colors.ring, theme.colors[fill]),
            `${label} ${fill}`,
          ).toBeGreaterThanOrEqual(contrastFloors.high.boundary);
        });
      });
  });

  it("names the tightest default pair instead of assuming a uniform tint", () => {
    const theme = getTheme("light");
    const measured = softFills.map((fill) => ({
      fill,
      ratio: contrastRatio(theme.colors.ring, theme.colors[fill]),
    }));
    const weakest = measured.reduce((left, right) =>
      left.ratio <= right.ratio ? left : right,
    );

    expect(weakest.fill).toBe("warningSoft");
    expect(weakest.ratio).toBeGreaterThanOrEqual(
      contrastFloors.default.boundary,
    );
  });

  it("names the soft fills when a theme regresses", () => {
    const light = getTheme("light");
    const regressed = extendTheme(light, {
      colors: { ring: light.colors.background },
    });
    const failures = themeContrastFailures(regressed).filter(({ background }) =>
      softFills.some((fill) => fill === background),
    );

    expect(
      failures.map(({ background, pairClass, floor }) => ({
        background,
        pairClass,
        floor,
      })),
    ).toEqual([
      { background: "infoSoft", pairClass: "boundary", floor: 3 },
      { background: "successSoft", pairClass: "boundary", floor: 3 },
      { background: "warningSoft", pairClass: "boundary", floor: 3 },
      { background: "destructiveSoft", pairClass: "boundary", floor: 3 },
    ]);
  });

  it("publishes one pair per soft status fill", () => {
    expect(ringSoftPairs).toHaveLength(softFills.length);
    expect(new Set(ringSoftPairs).size).toBe(ringSoftPairs.length);
    expect(softPairs).toHaveLength(softFills.length);
    expect(softPairs.map(([, background]) => background).toSorted()).toEqual(
      [...softFills].toSorted(),
    );
  });
});
