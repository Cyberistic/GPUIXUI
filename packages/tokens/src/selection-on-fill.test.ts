/**
 * Guards the defect plan 344 fixes: a user message bubble paints body text on
 * `primary` (`components/message.tsx` `bubble()`), and the accent-tinted
 * `selection` wash composites to **1.000:1** there in seven shipped sets —
 * identity dark, macOS light and dark, Linux light, Windows light, Aero light and
 * the `default` platform dark — so selecting a sent message shows no highlight.
 * The contract measured selection on nine content surfaces and the four soft
 * status fills, but never on a filled action.
 *
 * `selectionOnFill` is the neutral 15% veil for content painted on a filled
 * action. `selectionFillWashPairs` holds it to the perceivability floor on
 * `primary`, `secondary` and `destructive`, and `selectionFillPairs` holds each
 * family's own foreground through it to the floor that foreground already has on
 * its fill.
 */

import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  getPlatformRecipeTheme,
  getPlatformTheme,
  getTheme,
  platformRecipeNames,
  selectionFillPairs,
  selectionFillWashPairs,
  selectionStyle,
  themeContrastFailures,
  themeContrasts,
  themeModes,
  type Theme,
} from "./index.js";
import { filledContentStyle } from "./selection.example.js";

const platforms = ["darwin", "linux", "win32"] as const;

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
      ...platformRecipeNames.map(
        (recipe) =>
          [
            `${recipe} ${mode} ${contrast}`,
            getPlatformRecipeTheme(recipe, mode, contrast),
          ] as const,
      ),
    ]),
);

const fills = ["primary", "secondary", "destructive"] as const;

describe("the selection veil on a filled action", () => {
  it("publishes one wash and one text pair per filled family", () => {
    expect(
      selectionFillWashPairs.map(([role, fill, pairClass]) => [
        role,
        fill,
        pairClass,
      ]),
    ).toEqual(fills.map((fill) => ["selectionOnFill", fill, "surface"]));
    expect(selectionFillPairs.map(([role, fill]) => [role, fill])).toEqual([
      ["primaryForeground", "primary"],
      ["secondaryForeground", "secondary"],
      ["destructiveForeground", "destructive"],
    ]);
    expect(
      selectionFillPairs.every(([, , pairClass]) => pairClass === "secondary"),
    ).toBe(true);
  });

  it("keeps every shipped set's veil and family text at their floors", () => {
    const failures = variants.flatMap(([label, theme]) =>
      fills.flatMap((fill) => {
        const painted = compositeOver(
          theme.colors.selectionOnFill,
          theme.colors[fill],
        );
        const floors = contrastFloors[theme.contrast];
        const wash = contrastRatio(painted, theme.colors[fill]);
        const text = contrastRatio(
          theme.colors[
            fill === "primary"
              ? "primaryForeground"
              : fill === "secondary"
                ? "secondaryForeground"
                : "destructiveForeground"
          ],
          painted,
        );
        return wash >= floors.surface && text >= floors.secondary
          ? []
          : [
              `${label}: ${fill} veil ${wash.toFixed(3)} text ${text.toFixed(2)}`,
            ];
      }),
    );

    expect(failures).toEqual([]);
  });

  it("records the accent wash the veil replaces", () => {
    // The measured defect: the accent-tinted wash is the accent, so on the brand
    // fill it paints nothing. The list is exact, so a palette edit that changes
    // which sets are affected fails here and the role's rationale is revisited.
    const invisible = variants
      .filter(
        ([, theme]) =>
          contrastRatio(
            compositeOver(theme.colors.selection, theme.colors.primary),
            theme.colors.primary,
          ) < contrastFloors[theme.contrast].surface,
      )
      .map(([label]) => label)
      .toSorted();

    expect(invisible).toEqual(
      [
        "aero light default",
        "darwin dark default",
        "darwin light default",
        "identity dark default",
        "linux light default",
        "win32 light default",
      ].toSorted(),
    );
  });

  it("reports an edited theme whose veil matches its fill", () => {
    const base = getTheme("light");
    const regressed = extendTheme(base, {
      colors: { selectionOnFill: base.colors.primary },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ wash, pairClass }) =>
        wash === "selectionOnFill" && pairClass === "surface",
    );

    expect(
      failures.map(({ foreground, background, pairClass, floor, ratio }) => ({
        foreground,
        background,
        pairClass,
        floor,
        ratio,
      })),
    ).toEqual([
      {
        foreground: "selectionOnFill",
        background: "primary",
        pairClass: "surface",
        floor: contrastFloors.default.surface,
        ratio: 1,
      },
    ]);
  });

  it("reports an opaque veil that erases the family label", () => {
    const base = getTheme("dark");
    const regressed = extendTheme(base, {
      colors: { selectionOnFill: base.colors.primaryForeground },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ wash, foreground, background }) =>
        wash === "selectionOnFill" &&
        foreground === "primaryForeground" &&
        background === "primary",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("secondary");
    expect(failures[0]?.floor).toBe(contrastFloors.default.secondary);
  });

  it("maps the fill selector to the inverse role and the default to the content wash", () => {
    variants.forEach(([label, theme]) => {
      expect(selectionStyle(theme), label).toEqual({
        selectionColor: theme.colors.selection,
      });
      expect(selectionStyle(theme, "fill"), label).toEqual({
        selectionColor: theme.colors.selectionOnFill,
      });
      expect(theme.colors.selectionOnFill, label).not.toBe(
        theme.colors.selection,
      );
      expect(theme.colors.selectionOnFill, label).toMatch(/^#[0-9A-F]{8}$/);
    });
  });

  it("paints the example bubble with the brand fill and the inverse veil", () => {
    variants.forEach(([label, theme]) => {
      expect(filledContentStyle(theme), label).toEqual({
        ...selectionStyle(theme, "fill"),
        backgroundColor: theme.colors.primary,
        color: theme.colors.primaryForeground,
      });
    });
  });
});
