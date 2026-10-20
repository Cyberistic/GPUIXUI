/**
 * Guards the defect plan 332 fixes: a solid role painted as a **mark** — a
 * progress segment on the `muted` track, a slider fill, a slider thumb's ring on
 * its `input` fill, a rating star, a combobox check or a timeline dot — was
 * measured only as an interactive fill, at the 1.05:1 wash floor. A theme could
 * therefore collapse `primary`, `success` or `destructive` into the surface
 * behind the mark while `themeContrastFailures` returned `[]`, and a 4px bar or
 * a 16px glyph disappeared.
 *
 * The three shipped marks that paint the *wrong* role are held by TODO rows, not
 * by a pair: the avatar's presence dot paints the solid `warning` (1.78:1 on a
 * light card), the timeline's upcoming dot paints `muted` (1.036:1 on the
 * identity canvas), and the menu row's highlight bar paints `accent`
 * (1.118–1.392:1 on `popover`). A status mark is `xText`, which the status-text
 * pairs already measure, and a 2px bar needs `borderStrong`; adding a pair for
 * the bad composition would bless it.
 */

import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import { quietMarkFailures } from "./contrast.example.js";
import {
  colorRoles,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getTheme,
  markPairs,
  markRoles,
  themeContrastFailures,
  themeContrasts,
  type ContrastPairClass,
  type Theme,
} from "./index.js";

const markSurfaces = ["background", "card", "popover", "muted"] as const;

/** Every shipped colour set: identity, the real platform variants and recipes. */
const variants: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const markClassPairs = contrastPairs.filter(
  ([, , pairClass]) => pairClass === "mark",
);

describe("the mark contract", () => {
  it("measures every mark role on every surface it can sit on", () => {
    const expected = [
      ...markRoles.flatMap((role) =>
        markSurfaces.map((surface) => `${role} on ${surface}`),
      ),
      ...(["primary", "destructive"] as const).map(
        (role) => `${role} on input`,
      ),
      "primary on hover",
      "primary on selected",
      "primary on selectedActive",
      "primaryText on input",
      ...(
        [
          "primary",
          "success",
          "destructive",
          "mutedForeground",
          "foreground",
        ] as const
      ).map((role) => `${role} on track`),
    ].toSorted();

    expect(
      markClassPairs
        .map(([foreground, background]) => `${foreground} on ${background}`)
        .toSorted(),
    ).toEqual(expected);
  });

  it("names only colour roles and the mark class", () => {
    markPairs.forEach(([foreground, background, pairClass]) => {
      expect(colorRoles).toContain(foreground);
      expect(colorRoles).toContain(background);
      expect(pairClass).toBe("mark");
    });
  });

  it("holds a mark above the wash floor at both levels", () => {
    themeContrasts.forEach((contrast) => {
      const floors: Readonly<Record<ContrastPairClass, number>> =
        contrastFloors[contrast];
      expect(floors.mark, contrast).toBe(contrast === "high" ? 4.5 : 3);
      expect(floors.mark, contrast).toBeGreaterThan(floors.surface);
    });
  });

  it("keeps every shipped mark perceivable", () => {
    const failures = variants.flatMap(([label, theme]) =>
      markPairs.flatMap(([foreground, background, pairClass]) => {
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

  it("reports a mark that matches the card it sits on", () => {
    const base = getTheme("light");
    const regressed = extendTheme(base, {
      colors: { primary: base.colors.card },
    });

    const failures = themeContrastFailures(regressed).filter(
      ({ pairClass }) => pairClass === "mark",
    );
    expect(failures.map(({ background }) => background).toSorted()).toEqual([
      "background",
      "card",
      "hover",
      "input",
      "muted",
      "popover",
      "selected",
      "selectedActive",
      "track",
    ]);
    expect(failures[0]).toMatchObject({
      foreground: "primary",
      pairClass: "mark",
      floor: contrastFloors.default.mark,
    });
  });

  it("is the check the executed quiet-mark example demonstrates", () => {
    expect(
      quietMarkFailures
        .filter(({ pairClass }) => pairClass === "mark")
        .map(({ background }) => background)
        .toSorted(),
    ).toEqual([
      "background",
      "card",
      "hover",
      "input",
      "muted",
      "popover",
      "selected",
      "selectedActive",
      "track",
    ]);
  });

  it("reports a success segment that vanishes into its track", () => {
    const base = getTheme("light");
    const regressed = extendTheme(base, {
      colors: { success: base.colors.muted },
    });

    expect(
      themeContrastFailures(regressed)
        .filter(
          ({ foreground, pairClass }) =>
            foreground === "success" && pairClass === "mark",
        )
        .map(({ background }) => background),
    ).toContain("muted");
  });

  it("reports an invalid thumb ring that vanishes into its own fill", () => {
    const base = getTheme("light");
    const regressed = extendTheme(base, {
      colors: { destructive: base.colors.input },
    });

    expect(
      themeContrastFailures(regressed)
        .filter(
          ({ foreground, pairClass }) =>
            foreground === "destructive" && pairClass === "mark",
        )
        .map(({ background }) => background),
    ).toContain("input");
  });
});
