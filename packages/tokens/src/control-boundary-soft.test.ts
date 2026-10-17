/**
 * Guards the defect plan 092 fixes: `borderStrong` is the edge of a field and of
 * an unchecked checkbox, and the contract measured it on the plain surfaces, the
 * `muted` panel and the four row washes — but not the four soft status fills an
 * Alert, Badge or Toast paints, where an action button, a field or a "don't show
 * again" checkbox sits. Identity dark measured 2.77:1 on `successSoft`, 2.94:1
 * on `destructiveSoft` and 2.97:1 on `infoSoft`, under the 3:1 boundary floor,
 * while every other shipped set already cleared it.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  controlBoundarySoftPairs,
  extendTheme,
  getPlatformTheme,
  getTheme,
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
    foreground === "borderStrong" &&
    softFills.some((fill) => fill === background),
);

describe("the control boundary inside a soft status surface", () => {
  it("keeps every shipped theme's boundary perceivable", () => {
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

  it("keeps a checkbox edge visible inside a dark Alert", () => {
    const shipped = getTheme("dark").colors;
    // The pre-092 identity dark boundary.
    const previous = "#77808F";

    expect(shipped.borderStrong).toBe("#868FA0");
    expect(contrastRatio(previous, shipped.successSoft)).toBeLessThan(
      contrastFloors.default.boundary,
    );
    expect(contrastRatio(previous, shipped.destructiveSoft)).toBeLessThan(
      contrastFloors.default.boundary,
    );
    expect(contrastRatio(previous, shipped.infoSoft)).toBeLessThan(
      contrastFloors.default.boundary,
    );
    // The one soft fill the old value already cleared: the audit named three,
    // and a value that fixed four anyway would have overstated the defect.
    expect(contrastRatio(previous, shipped.warningSoft)).toBeGreaterThanOrEqual(
      contrastFloors.default.boundary,
    );
    softFills.forEach((fill) => {
      expect(
        contrastRatio(shipped.borderStrong, shipped[fill]),
        fill,
      ).toBeGreaterThanOrEqual(contrastFloors.default.boundary);
    });
  });

  it("holds the high-contrast boundary to its floor on the soft fills", () => {
    (["light", "dark"] as const).forEach((mode) => {
      expect(
        contrastRatio(
          getTheme(mode, "high").colors.borderStrong,
          getTheme(mode, "high").colors.successSoft,
        ),
        mode,
      ).toBeGreaterThanOrEqual(contrastFloors.high.boundary);
    });

    variants
      .filter(([label]) => label.includes(" high"))
      .forEach(([label, theme]) => {
        softFills.forEach((fill) => {
          expect(
            contrastRatio(theme.colors.borderStrong, theme.colors[fill]),
            `${label} ${fill}`,
          ).toBeGreaterThanOrEqual(contrastFloors.high.boundary);
        });
      });
  });

  it("names the soft fills when a theme regresses", () => {
    const regressed = extendTheme(getTheme("dark"), {
      colors: { borderStrong: "#77808F" },
    });
    const failures = themeContrastFailures(regressed);

    expect(
      failures.map(({ background, pairClass, floor }) => ({
        background,
        pairClass,
        floor,
      })),
    ).toEqual([
      { background: "infoSoft", pairClass: "boundary", floor: 3 },
      { background: "successSoft", pairClass: "boundary", floor: 3 },
      { background: "destructiveSoft", pairClass: "boundary", floor: 3 },
    ]);
  });

  it("publishes one pair per soft status fill", () => {
    expect(controlBoundarySoftPairs).toHaveLength(softFills.length);
    expect(new Set(controlBoundarySoftPairs).size).toBe(
      controlBoundarySoftPairs.length,
    );
    expect(softPairs).toHaveLength(softFills.length);
    expect(softPairs.map(([, background]) => background).toSorted()).toEqual(
      [...softFills].toSorted(),
    );
  });
});
