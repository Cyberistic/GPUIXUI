/**
 * Guards the defect plan 092 fixes: `borderStrong` is the edge of a field and of
 * an unchecked checkbox, and the contract measured it on the plain surfaces, the
 * `muted` panel and the four row washes — but not the four soft status fills a
 * tone-tinted Alert paints, where an action button, a field or a "don't show
 * again" checkbox sits. Identity dark measured 2.77:1 on `successSoft`, 2.94:1
 * on `destructiveSoft` and 2.97:1 on `infoSoft`, under the 3:1 boundary floor,
 * while every other shipped set already cleared it.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  controlBoundarySoftPairs,
  extendTheme,
  getTheme,
  themeContrastFailures,
  themeModes,
  type Theme,
} from "./index.js";

const softFills = [
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;

const variants: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
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
    // The pre-092 identity dark boundary and the pre-095 soft fills it painted.
    const previous = "#77808F";
    const previousFills = {
      infoSoft: shipped.infoSoft,
      successSoft: "#0C452D",
      warningSoft: shipped.warningSoft,
      destructiveSoft: "#6B1A1D",
    };

    expect(shipped.borderStrong).toBe("#868FA0");
    expect(contrastRatio(previous, previousFills.successSoft)).toBeLessThan(
      contrastFloors.default.boundary,
    );
    expect(contrastRatio(previous, previousFills.destructiveSoft)).toBeLessThan(
      contrastFloors.default.boundary,
    );
    expect(contrastRatio(previous, previousFills.infoSoft)).toBeLessThan(
      contrastFloors.default.boundary,
    );
    // The one soft fill the old value already cleared: the audit named three,
    // and a value that fixed four anyway would have overstated the defect.
    expect(
      contrastRatio(previous, previousFills.warningSoft),
    ).toBeGreaterThanOrEqual(contrastFloors.default.boundary);
    softFills.forEach((fill) => {
      expect(
        contrastRatio(shipped.borderStrong, shipped[fill]),
        fill,
      ).toBeGreaterThanOrEqual(contrastFloors.default.boundary);
    });
  });

  it("holds the high-contrast boundary to its floor on the soft fills", () => {
    themeModes.forEach((mode) => {
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
      colors: { borderStrong: "#6B7484" },
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
    expect(controlBoundarySoftPairs).toHaveLength(softFills.length);
    expect(softPairs).toHaveLength(softFills.length);
    expect(softPairs.map(([, background]) => background).toSorted()).toEqual(
      [...softFills].toSorted(),
    );
  });
});
