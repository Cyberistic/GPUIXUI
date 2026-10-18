/**
 * Guards the defect plan 095 fixes: the decorative `border` was measured on the
 * canvas, the card, the popover and the fills a bordered control paints, but not
 * the four soft status fills an Alert, Badge or Toast can paint — and a status
 * panel separates a footer or an action row with a line. Four dark pairs were
 * under the 1.05:1 divider floor: Windows dark 1.015:1 on `successSoft`, the
 * identity 1.023:1, identity dark `destructiveSoft` 1.040:1 and Linux dark
 * 1.047:1. The identity's two soft fills move 20% of the way to their family's
 * 950 step, which lifts the divider above the floor while every tint keeps the
 * 1.05:1 surface floor on its canvas.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  themeContrastFailures,
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

const softDividerPairs = contrastPairs.filter(
  ([foreground, background]) =>
    foreground === "border" && softFills.some((fill) => fill === background),
);

describe("a divider inside a soft status surface", () => {
  it("keeps every shipped theme's divider perceivable", () => {
    const failures = variants.flatMap(([label, theme]) =>
      softDividerPairs.flatMap(([foreground, background, pairClass]) => {
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

  it("closes the dark success fill's 1.015–1.047 regression", () => {
    const identity = getTheme("dark").colors;
    const windows = getPlatformTheme("win32", "dark").colors;
    const linux = getPlatformTheme("linux", "dark").colors;

    // The pre-095 inherited fill.
    const previous = "#0C452D";
    expect(contrastRatio(identity.border, previous)).toBeLessThan(
      contrastFloors.default.divider,
    );
    expect(contrastRatio(windows.border, previous)).toBeLessThan(
      contrastFloors.default.divider,
    );
    expect(contrastRatio(linux.border, previous)).toBeLessThan(
      contrastFloors.default.divider,
    );
    expect(identity.successSoft).toBe("#0A3E28");
    expect(identity.destructiveSoft).toBe("#66191B");
  });

  it("keeps the tint perceivable after the move", () => {
    const identity = getTheme("dark").colors;
    expect(contrastRatio(identity.successSoft, identity.card)).toBeGreaterThan(
      1.3,
    );
    expect(
      contrastRatio(identity.destructiveSoft, identity.card),
    ).toBeGreaterThan(1.3);
    // Linux dark inherits the success fill; its card is the lightest canvas.
    const linux = getPlatformTheme("linux", "dark").colors;
    expect(contrastRatio(linux.successSoft, linux.card)).toBeGreaterThanOrEqual(
      contrastFloors.default.surface,
    );
  });

  it("names the soft fills when a theme regresses", () => {
    const light = getTheme("light");
    const regressed = extendTheme(light, {
      colors: { border: light.colors.successSoft },
    });
    const failures = themeContrastFailures(regressed).filter(({ background }) =>
      softFills.some((fill) => fill === background),
    );

    expect(failures.map(({ background }) => background)).toContain(
      "successSoft",
    );
    expect(
      failures.every(
        ({ pairClass, floor }) => pairClass === "divider" && floor === 1.05,
      ),
    ).toBe(true);
  });

  it("publishes one pair per soft status fill", () => {
    expect(softDividerPairs).toHaveLength(softFills.length);
    expect(softDividerPairs.map(([, background]) => background)).toEqual([
      ...softFills,
    ]);
  });
});
