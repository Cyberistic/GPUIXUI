/**
 * Guards the defect plan 080 fixed: the divider was measured only on
 * `background`, `card` and `popover`, but a bordered control paints its edge on
 * the fill behind it — `secondary` at rest, `hover` and `active` for an outline
 * control, and `accent` for an outline toggle that is on. In four shipped colour
 * sets the divider and the fill were the same value: the identity's light
 * `active`, the identity's dark `secondary`/`active`/`accent`, macOS dark's
 * `hover`/`secondary`/`accent` and high-contrast dark's `active` (2.53:1 against
 * the 3:1 AAA divider floor). An outlined control therefore lost its edge
 * exactly while pressed, while every suite stayed green.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  themeContrastFailures,
  themeModes,
  type Theme,
} from "./index.js";

const controlFills = ["secondary", "hover", "active", "accent"] as const;

const themes: ReadonlyArray<readonly [string, Theme]> = [
  ["light", getTheme("light")],
  ["dark", getTheme("dark")],
  ["high-contrast light", getTheme("light", "high")],
  ["high-contrast dark", getTheme("dark", "high")],
  ...(["darwin", "linux", "win32"] as const).flatMap(
    (platform): ReadonlyArray<readonly [string, Theme]> =>
      themeModes.map((mode) => [
        `${platform} ${mode}`,
        getPlatformTheme(platform, mode),
      ]),
  ),
];

const controlEdgePairs = contrastPairs.filter(
  ([foreground, background]) =>
    foreground === "border" && controlFills.some((fill) => fill === background),
);

describe("the control edge on the fills it paints", () => {
  it("documents one pair per fill a bordered control paints", () => {
    expect(
      controlEdgePairs.map(([, background]) => background).toSorted(),
    ).toEqual([...controlFills].toSorted());
  });

  it("clears the declared divider floor on every shipped theme", () => {
    themes.forEach(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].divider;
      controlEdgePairs.forEach(([foreground, background]) => {
        expect(
          contrastRatio(theme.colors[foreground], theme.colors[background]),
          `${label}: ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("keeps the edge visible on the fill a control paints", () => {
    const named = [
      "light",
      "dark",
      "darwin dark",
      "high-contrast dark",
    ] as const;

    themes
      .filter(([label]) => named.some((name) => name === label))
      .forEach(([label, theme]) => {
        const floor = contrastFloors[theme.contrast].divider;
        controlFills.forEach((fill) => {
          const edge = theme.colors.border;
          expect(edge, `${label}: border equals ${fill}`).not.toBe(
            theme.colors[fill],
          );
          expect(
            contrastRatio(edge, theme.colors[fill]),
            `${label}: border on ${fill}`,
          ).toBeGreaterThanOrEqual(floor);
        });
      });
  });

  it("names the fill when a theme regresses", () => {
    const regressed = extendTheme(getTheme("dark"), {
      // The pre-080 divider: the same value as the secondary and pressed fills.
      colors: { border: "#2A303B" },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground }) => foreground === "border",
    );

    expect(failures.map(({ background }) => background).toSorted()).toEqual([
      "accent",
      "active",
      "secondary",
      "selected",
    ]);
    expect(
      failures.every(
        ({ pairClass, floor }) => pairClass === "divider" && floor === 1.05,
      ),
    ).toBe(true);
  });
});
