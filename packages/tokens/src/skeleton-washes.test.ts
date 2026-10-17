/**
 * Guards the defect plan 094 fixes: `skeleton` is the loading placeholder of a
 * mission-named state, but the contract measured it only on `background`,
 * `card` and `popover` — not on the `muted` panel of a sidebar list or the
 * `hover`/`active`/`selected` washes a loading row paints. Seventeen shipped
 * pairs were under the 1.05:1 floor, ten of them exactly 1.000:1, because the
 * identity and high-contrast skeletons *were* the `active` fill: a pressed
 * loading row erased the placeholder.
 *
 * Plan 322 closes the last row wash: a selectable `List` row paints `accent` on
 * hover (`list.tsx`), so a placeholder row in a selectable list can sit on it.
 * The skeleton has no designed edge to fall back on, so an edited theme could
 * erase it while the checker returned `[]`.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  palette,
  themeContrastFailures,
  themeContrasts,
  themeModes,
  type Theme,
} from "./index.js";

const platforms = ["darwin", "linux", "win32"] as const;

const surfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

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

const skeletonPairs = contrastPairs.filter(
  ([foreground, background]) =>
    foreground === "skeleton" &&
    surfaces.some((surface) => surface === background),
);

describe("the loading skeleton on a row surface", () => {
  it("keeps every shipped theme's placeholder perceivable", () => {
    const failures = variants.flatMap(([label, theme]) =>
      skeletonPairs.flatMap(([foreground, background, pairClass]) => {
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

  it("keeps a pressed loading row visible", () => {
    const light = getTheme("light").colors;
    const dark = getTheme("dark").colors;

    expect(light.skeleton).toBe(palette.neutral[300]);
    expect(dark.skeleton).toBe(palette.neutral[700]);
    expect(contrastRatio(palette.neutral[200], light.active)).toBeLessThan(
      contrastFloors.default.surface,
    );
    expect(contrastRatio(palette.neutral[800], dark.selected)).toBeLessThan(
      contrastFloors.default.surface,
    );
    surfaces.forEach((surface) => {
      expect(
        contrastRatio(light.skeleton, light[surface]),
        `light ${surface}`,
      ).toBeGreaterThanOrEqual(contrastFloors.default.surface);
      expect(
        contrastRatio(dark.skeleton, dark[surface]),
        `dark ${surface}`,
      ).toBeGreaterThanOrEqual(contrastFloors.default.surface);
    });
  });

  it("holds the high-contrast skeletons off the pressed wash", () => {
    themeModes.forEach((mode) => {
      const theme = getTheme(mode, "high");
      expect(
        contrastRatio(theme.colors.skeleton, theme.colors.active),
        mode,
      ).toBeGreaterThanOrEqual(contrastFloors.high.surface);
    });
    expect(getTheme("light", "high").colors.skeleton).toBe("#B0B0B0");
    expect(getTheme("dark", "high").colors.skeleton).toBe("#565656");
  });

  it("names the pressed row when a theme regresses", () => {
    const light = getTheme("light");
    const regressed = extendTheme(light, {
      colors: { skeleton: light.colors.active },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground }) => foreground === "skeleton",
    );

    expect(
      failures.map(({ background, pairClass, floor }) => ({
        background,
        pairClass,
        floor,
      })),
    ).toEqual([
      {
        background: "active",
        pairClass: "surface",
        floor: contrastFloors.default.surface,
      },
    ]);
  });

  it("names the accent wash when a selectable row regresses", () => {
    const light = getTheme("light");
    const regressed = extendTheme(light, {
      colors: { skeleton: light.colors.accent },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground }) => foreground === "skeleton",
    );

    expect(
      failures.map(({ background, pairClass, floor }) => ({
        background,
        pairClass,
        floor,
      })),
    ).toContainEqual({
      background: "accent",
      pairClass: "surface",
      floor: contrastFloors.default.surface,
    });
  });

  it("publishes one pair per surface a placeholder fills", () => {
    expect(skeletonPairs).toHaveLength(surfaces.length);
    expect(new Set(skeletonPairs).size).toBe(skeletonPairs.length);
    expect(skeletonPairs.map(([, background]) => background)).toEqual([
      ...surfaces,
    ]);
  });
});
