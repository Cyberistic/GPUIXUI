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
 * action. `selectionFillWashPairs` holds it to the perceivability floor on every
 * shipped filled family, and `selectionFillPairs` holds each family's own
 * foreground through it to the floor that foreground already has on its fill.
 *
 * Plan 382 guards the fourth family: the package ships `primary`, `secondary`,
 * `destructive` and `accent` (`filledControlFamilies`), but both lists named
 * three. Selecting the label on an accent fill measured **4.140:1** on macOS
 * light and **4.430:1** on Linux dark through the veil — under the 4.5:1 the
 * on-colour role has — while `themeContrastFailures` returned `[]`. Both lists
 * now derive from the family index, and the two foregrounds move one designed
 * step.
 *
 * Plan 504 guards the fill family the index never reached: a solid status chip
 * (its `Solid fill` pair is published, plan 399) and the status panel's
 * `softAction` (plan 394) both carry their own on-colour, and both are missing
 * from `filledControlFamilies`. The accent-tinted wash is under the perceivability
 * floor on fourteen of their shipped compositions — identity light `success`
 * 1.046:1, Windows light `info` 1.011:1 and every high-contrast dark
 * `softAction` 1.047:1 — so selecting a chip's label or a Retry action showed no
 * highlight while the checker returned `[]`. `selectionFillRoles` is the index
 * (the four families, the three solid status chips, `softAction`) and both lists
 * derive from it.
 */

import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  filledControlFamilies,
  getTheme,
  selectionFillPairs,
  selectionFillRoles,
  selectionFillWashPairs,
  selectionStyle,
  statusTones,
  themeContrastFailures,
  type Theme,
} from "./index.js";
import { filledContentStyle } from "./selection.example.js";
import { statusSolidStyles } from "./status-tone.example.js";

const variants: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

describe("the selection veil on a filled action", () => {
  it("publishes one wash and one text pair per opaque fill", () => {
    expect(selectionFillWashPairs).toEqual(
      selectionFillRoles.map((fill) => ["selectionOnFill", fill, "surface"]),
    );
    expect(selectionFillPairs).toEqual(
      selectionFillRoles.map((fill) => [
        `${fill}Foreground`,
        fill,
        "secondary",
      ]),
    );
    expect(selectionFillRoles).toHaveLength(8);
    expect(new Set(selectionFillRoles).size).toBe(8);
  });

  it("covers every opaque fill a reader can select a label on", () => {
    expect(selectionFillRoles).toEqual([
      ...filledControlFamilies,
      ...statusTones.filter((tone) => tone !== "destructive"),
      "softAction",
    ]);
  });

  it("keeps every shipped set's veil and fill text at their floors", () => {
    const failures = variants.flatMap(([label, theme]) =>
      selectionFillRoles.flatMap((fill) => {
        const painted = compositeOver(
          theme.colors.selectionOnFill,
          theme.colors[fill],
        );
        const floors = contrastFloors[theme.contrast];
        const wash = contrastRatio(painted, theme.colors[fill]);
        const text = contrastRatio(theme.colors[`${fill}Foreground`], painted);
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
        "Light · Windows 7",
        "Dark · macOS",
        "Light · macOS",
        "Dark",
        "Light · Linux",
        "Light · Windows",
      ].toSorted(),
    );
  });

  it("records the accent wash under a solid status chip", () => {
    // The same defect one fill family over: a solid status chip carries its own
    // on-colour, and the accent-tinted wash vanishes on eleven of the shipped
    // compositions. `softAction` was among them until plan 504 moved the AAA dark
    // fill one step darker; the veil is still its designed wash, because a
    // filled action takes the neutral veil like every other opaque fill. The list
    // is exact, so a palette edit that changes which sets are affected fails here
    // and the veil's rationale is revisited.
    const invisible = variants
      .flatMap(([label, theme]) =>
        [...statusTones, "softAction" as const].flatMap((role) =>
          contrastRatio(
            compositeOver(theme.colors.selection, theme.colors[role]),
            theme.colors[role],
          ) < contrastFloors[theme.contrast].surface
            ? [`${label} ${role}`]
            : [],
        ),
      )
      .toSorted();

    expect(invisible).toEqual(
      [
        "Light destructive",
        "Light success",
        "Dark destructive",
        "Dark info",
        "Dark success",
        "Light · macOS success",
        "Light · Linux info",
        "Light · Linux success",
        "Light · Windows info",
        "Light · Windows XP destructive",
        "Light · Windows 7 info",
      ].toSorted(),
    );
  });

  it("reports an edited theme whose veil matches its fill", () => {
    const base = getTheme("light");
    const regressed = extendTheme(base, {
      colors: { selectionOnFill: base.colors.primary },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ wash, background, pairClass }) =>
        wash === "selectionOnFill" &&
        background === "primary" &&
        pairClass === "surface",
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

  it("reports an edited theme whose veil matches its accent fill", () => {
    const base = getTheme("dark");
    const regressed = extendTheme(base, {
      colors: { selectionOnFill: base.colors.accent },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ wash, background, pairClass }) =>
        wash === "selectionOnFill" &&
        background === "accent" &&
        pairClass === "surface",
    );

    expect(
      failures.map(({ foreground, pairClass, floor, ratio }) => ({
        foreground,
        pairClass,
        floor,
        ratio,
      })),
    ).toEqual([
      {
        foreground: "selectionOnFill",
        pairClass: "surface",
        floor: contrastFloors.default.surface,
        ratio: 1,
      },
    ]);
  });

  it("reports an accent foreground that vanishes through the veil", () => {
    const base = getTheme("light");
    const regressed = extendTheme(base, {
      colors: { accentForeground: base.colors.accent },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ wash, foreground, background }) =>
        wash === "selectionOnFill" &&
        foreground === "accentForeground" &&
        background === "accent",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("secondary");
    expect(failures[0]?.floor).toBe(contrastFloors.default.secondary);
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

  it("reports an edited theme whose veil matches a solid status fill", () => {
    const base = getTheme("light");
    const regressed = extendTheme(base, {
      colors: { selectionOnFill: base.colors.success },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ wash, background, pairClass }) =>
        wash === "selectionOnFill" &&
        background === "success" &&
        pairClass === "surface",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]?.ratio).toBe(1);
    expect(failures[0]?.floor).toBe(contrastFloors.default.surface);
  });

  it("reports an edited theme whose veil matches the panel action", () => {
    const base = getTheme("dark", "high");
    const regressed = extendTheme(base, {
      colors: { selectionOnFill: base.colors.softAction },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ wash, background, pairClass }) =>
        wash === "selectionOnFill" &&
        background === "softAction" &&
        pairClass === "surface",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]?.ratio).toBe(1);
    expect(failures[0]?.floor).toBe(contrastFloors.high.surface);
  });

  it("reports a solid status foreground that vanishes through the veil", () => {
    const base = getTheme("light");
    const regressed = extendTheme(base, {
      colors: { successForeground: base.colors.success },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ wash, foreground, background }) =>
        wash === "selectionOnFill" &&
        foreground === "successForeground" &&
        background === "success",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("secondary");
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

  it("paints the solid status chip with the inverse veil", () => {
    variants.forEach(([label, theme]) => {
      statusTones.forEach((tone) => {
        expect(
          statusSolidStyles(theme, tone).container,
          `${label} ${tone}`,
        ).toMatchObject(selectionStyle(theme, "fill"));
      });
    });
  });
});
