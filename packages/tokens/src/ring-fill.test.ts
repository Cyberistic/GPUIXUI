/**
 * The ring a filled action wears.
 *
 * The bug this guards: `keyboardFocusRing`'s outline sat at `outlineOffset: 0`,
 * flush against the fill the control paints. `ring` *is* the brand (`ring` and
 * `primary` are the same ramp step in twelve of the sixteen styles), so a
 * focused primary action painted its focus line in its own fill — measured at
 * **1.00–1.38:1** on `primary` and **1.00–1.54:1** on `destructive` in every
 * style, at rest and under the pointer. The pair was unsatisfiable, not unmet:
 * at offset 0 one colour must clear the boundary floor against both the page and
 * the fill, and no luminance does in 8 of the sixteen styles for `primary` (9 for
 * `destructive`).
 *
 * The fix is the geometry, not the palette: the line now sits **one line's
 * width outside the border box**, so the strip behind the control shows through
 * the gap and the ring is read against that strip instead of the fill. The
 * playground's `focus-ring-offset` probe measured the offset in a window on
 * `0.11.0` (28 checks): a two-point offset paints the ring three points out with
 * the strip showing through the gap, and the control and its sibling keep their
 * boxes. The suite holds the offset in every style, the measured premise that
 * forced it, the strips the ring is read on, the painters that declare it, the
 * probe that measured the geometry, and both pages.
 *
 * `node:fs` is deliberate here for the same reason as in `field-boundary.test.ts`:
 * this holds the token contract to the two consumer packages' painters and the
 * playground's probe, and `@gpuixui/tokens` keeps no dependency on either.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ThemeColors } from "./color.js";
import { contrastFloorsFor, contrastPairs, contrastRatio } from "./contrast.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import {
  filledFeedback,
  filledFeedbackStates,
  keyboardFocusRing,
  type FilledFeedbackState,
  type FilledRole,
} from "./styles.js";
import {
  highContrastThemes,
  platformTheme,
  themes,
  type Theme,
} from "./theme.js";

const styles: ReadonlyArray<readonly [string, Theme]> = [
  ["Light", themes.light],
  ["Dark", themes.dark],
  ["High contrast light", highContrastThemes.light],
  ["High contrast dark", highContrastThemes.dark],
  ...platformNames.flatMap((name) =>
    (["light", "dark"] as const).map(
      (mode) =>
        [
          `${mode === "light" ? "Light" : "Dark"} · ${name}`,
          platformTheme(themes[mode], name),
        ] as const,
    ),
  ),
  ...retroNames.flatMap((look) =>
    (["light", "dark"] as const).map(
      (mode) =>
        [
          `${mode === "light" ? "Light" : "Dark"} · ${look}`,
          retroTheme(themes[mode], look),
        ] as const,
    ),
  ),
];

const document = (path: string): string =>
  readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

/**
 * WCAG relative luminance, read through the public ratio: the package keeps
 * `relativeLuminance` private, and a ratio against black is exactly
 * `20 × luminance + 1`, so the proof needs no second copy of the transfer
 * function.
 */
const luminance = (colour: string): number | undefined => {
  const ratio = contrastRatio(colour, "#000000");
  return ratio === undefined ? undefined : (ratio - 1) / 20;
};

/** The luminances at which `colour` reaches `floor`, as closed intervals. */
const reachable = (
  colour: string,
  floor: number,
): ReadonlyArray<readonly [number, number]> => {
  const value = luminance(colour);
  if (value === undefined) {
    return [];
  }
  return [
    [0, (value + 0.05) / floor - 0.05],
    [floor * (value + 0.05) - 0.05, 1],
  ];
};

const overlap = (
  left: ReadonlyArray<readonly [number, number]>,
  right: ReadonlyArray<readonly [number, number]>,
): ReadonlyArray<readonly [number, number]> =>
  left.flatMap(([leftLow, leftHigh]) =>
    right
      .map(([rightLow, rightHigh]): [number, number] => [
        Math.max(leftLow, rightLow),
        Math.min(leftHigh, rightHigh),
      ])
      .filter(([low, high]) => low <= high),
  );

/** The face a filled role paints in one state, for a complete theme. */
const face = (
  theme: Theme,
  role: FilledRole,
  state: FilledFeedbackState | "rest",
): string | undefined =>
  state === "rest" ? theme.colors[role] : filledFeedback(theme, role, state);

/**
 * Every luminance that would have cleared the floor against **both** the page
 * the control sits on and the face it paints — the set a flush ring colour has
 * to come from, and the reason the line is separated now.
 */
const flushColours = (
  theme: Theme,
  role: FilledRole,
  state: FilledFeedbackState | "rest" = "rest",
): ReadonlyArray<readonly [number, number]> => {
  const fill = face(theme, role, state);
  if (fill === undefined) {
    return [];
  }
  const floor = contrastFloorsFor(theme).boundary;
  return overlap(
    reachable(theme.colors.background, floor),
    reachable(fill, floor),
  );
};

const ringRatio = (
  theme: Theme,
  role: FilledRole,
  state: FilledFeedbackState | "rest",
) => {
  const fill = face(theme, role, state);
  return fill === undefined
    ? undefined
    : contrastRatio(theme.colors.ring, fill);
};

/** The styles in which a flush ring missed its floor on one face. */
const misses = (
  role: FilledRole,
  state: FilledFeedbackState | "rest",
): ReadonlyArray<string> =>
  styles
    .filter(([, theme]) => {
      const ratio = ringRatio(theme, role, state);
      return ratio === undefined || ratio < contrastFloorsFor(theme).boundary;
    })
    .map(([name]) => name);

const ratios = (
  role: FilledRole,
  state: FilledFeedbackState | "rest",
): number[] => styles.map(([, theme]) => ringRatio(theme, role, state) ?? 0);

const spread = (values: ReadonlyArray<number>): string =>
  `${Math.min(...values).toFixed(2)}–${Math.max(...values).toFixed(2)}`;

/**
 * The strips a focused control is drawn on: the four content surfaces, a
 * segmented panel, the fill a field paints, the four row washes, and the four
 * soft tints a message's own action sits in. A separated line lies on the strip
 * behind the control, so these — not the control's own fill — are its pairs.
 */
const ringStrips: ReadonlyArray<keyof ThemeColors> = [
  "background",
  "card",
  "popover",
  "muted",
  "secondary",
  "input",
  "selected",
  "hover",
  "active",
  "accent",
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
];

const ringPairs = contrastPairs.filter(
  ({ foreground }) => foreground === "ring",
);

const stripRatio = (
  theme: Theme,
  over: keyof ThemeColors,
): number | undefined => contrastRatio(theme.colors.ring, theme.colors[over]);

/** The tightest ring placement over every style and strip. */
const tightest = (): {
  readonly style: string;
  readonly over: string;
  readonly ratio: number;
} =>
  styles
    .flatMap(([style, theme]) =>
      ringStrips.flatMap((over) => {
        const ratio = stripRatio(theme, over);
        return ratio === undefined ? [] : [{ style, over, ratio }];
      }),
    )
    .reduce((low, cell) => (cell.ratio < low.ratio ? cell : low));

describe("the ring separated from a filled action", () => {
  it("separates the line from the fill by one line's width", () => {
    styles.forEach(([name, theme]) => {
      const { focusVisible } = keyboardFocusRing(theme);
      expect(focusVisible.outlineOffset, name).toBe(theme.borderWidth.strong);
      expect(focusVisible.outlineOffset, name).toBeGreaterThan(0);
    });

    // A theme that widens its border widens the gap with it, so the geometry is
    // the theme's rather than a literal.
    const wide: Theme = {
      ...themes.light,
      borderWidth: { thin: 1, strong: 3 },
    };
    expect(keyboardFocusRing(wide).focusVisible.outlineOffset).toBe(3);
  });

  it("keeps the measured reason a flush line cannot serve a filled action", () => {
    // The brand faces: a flush line merges with the fill in every style, at rest
    // and under the pointer.
    expect(misses("primary", "rest")).toHaveLength(styles.length);
    expect(misses("destructive", "rest")).toHaveLength(styles.length);
    expect(misses("primary", "pressed")).toHaveLength(styles.length);
    expect(misses("destructive", "pressed")).toHaveLength(styles.length);
    expect(spread(ratios("primary", "rest"))).toBe("1.00–1.38");
    expect(spread(ratios("destructive", "rest"))).toBe("1.00–1.54");

    // The neutral faces at rest held, which is what made the finding a statement
    // about brand faces rather than about the model.
    expect(misses("secondary", "rest")).toEqual([]);
    expect(misses("accent", "rest")).toEqual([]);

    // The derived pointer fills did not: the press dropped the neutral faces
    // under the floor in eight and six of the sixteen styles.
    expect(misses("secondary", "pressed")).toHaveLength(8);
    expect(misses("accent", "pressed")).toHaveLength(6);
    expect(misses("secondary", "hover")).toHaveLength(3);
    expect(misses("accent", "hover")).toHaveLength(3);
    filledFeedbackStates.forEach((state) => {
      expect(misses("secondary", state).length).toBeLessThan(styles.length);
    });

    // No flush colour could clear both the page and a brand face, and where one
    // existed it was far from the brand.
    const brandFaces: ReadonlyArray<FilledRole> = ["primary", "destructive"];
    const empty = (role: FilledRole) =>
      styles.filter(([, theme]) => flushColours(theme, role).length === 0)
        .length;
    expect(empty("primary")).toBe(8);
    expect(empty("destructive")).toBe(9);

    const distances = styles.flatMap(([, theme]) => {
      const ring = luminance(theme.colors.ring);
      if (ring === undefined) {
        return [];
      }
      return brandFaces.flatMap((role) =>
        flushColours(theme, role).flatMap(([low, high]) =>
          [low, high].map((edge) => Math.abs(edge - ring)),
        ),
      );
    });
    expect(Math.min(...distances)).toBeGreaterThan(0.1);
  });

  it("reads the line against the strip behind the control", () => {
    expect(ringPairs.map(({ background }) => background)).toEqual([
      ...ringStrips,
    ]);
    // The two brand faces are no longer ring surfaces: the line never touches a
    // control's own fill, and no shipped control sits on a `primary` or
    // `destructive` fill. The neutral filled roles (`secondary`, `accent`) stay,
    // because they are also strips a control sits on or inside.
    const paired = new Set(ringPairs.map(({ background }) => background));
    expect(paired.has("primary")).toBe(false);
    expect(paired.has("destructive")).toBe(false);
    // The fill a field paints is a strip because a focusable action lives inside
    // it (`TimePickerClear` is a `role="button"` in a field filled `input`).
    expect(document("packages/components/src/time-picker.tsx")).toContain(
      "keyboardRing(theme)",
    );
  });

  it("clears the boundary floor on every strip in every style", () => {
    styles.forEach(([name, theme]) => {
      ringStrips.forEach((over) => {
        const ratio = stripRatio(theme, over);
        expect(ratio, `${name} ring/${over}`).toBeDefined();
        expect(ratio ?? 0, `${name} ring/${over}`).toBeGreaterThanOrEqual(
          contrastFloorsFor(theme).boundary,
        );
      });
    });

    // The tightest placement is the authored Aero light look on a red message
    // tint, the number both pages print.
    const cell = tightest();
    expect(`${cell.style} ring/${cell.over}`).toBe(
      "Light · aero ring/destructiveSoft",
    );
    expect(cell.ratio.toFixed(2)).toBe("3.09");
  });

  it("paints the offset the window probe measured", () => {
    // The probe is the evidence the geometry works: it paints a control at the
    // token's offset and samples the ring band. Its constant must stay the
    // offset the token sets, so the proof cannot drift from the paint.
    const probe = document("apps/playground/src/live/ring-offset.ts");
    const offset = keyboardFocusRing(themes.dark).focusVisible.outlineOffset;
    expect(probe).toContain(`RING_OFFSET = ${offset}`);

    const scenario = document("apps/playground/src/live/scenarios.tsx");
    expect(scenario).toContain("offset={RING_OFFSET}");
  });

  it("reads the geometry and the painters that make it true", () => {
    // Both seams declare the ring on a control, so the token is what the
    // packages paint.
    expect(document("packages/primitives/src/core/focus.ts")).toContain(
      "controlFocusRing",
    );
    expect(document("packages/components/src/internal/theme.ts")).toContain(
      "controlFocusRing",
    );
    const variants = document("packages/primitives/src/core/variants.ts");
    expect(variants).toContain('filled("primary")');
    expect(variants).toContain('filled("secondary")');
    expect(variants).toContain("destructive:");
  });

  it("teaches the resolution on every surface", () => {
    const surfaces = [
      document("docs/tokens.md"),
      document("docs/design-system.md"),
      document("packages/tokens/README.md"),
    ].map((text) => text.replace(/\s+/g, " "));
    surfaces.forEach((text) => {
      expect(text).toContain("one line's width");
      expect(text).toContain("3.09");
      expect(text).toContain("gap");
    });
    // The probe is the evidence the pages owe, on the two that cite it.
    [surfaces[0], surfaces[2]].forEach((text) =>
      expect(text).toContain("focus-ring-offset"),
    );
    // The retracted story: the fix is no longer an open interlock.
    expect(surfaces[0]).not.toContain("a two-tone ring is the other route");
  });
});
