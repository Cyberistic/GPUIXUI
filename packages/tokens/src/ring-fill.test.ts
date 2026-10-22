/**
 * The ring a filled action wears.
 *
 * The bug this guards: `keyboardFocusRing`'s outline sits at `outlineOffset: 0`,
 * flush against the fill the control paints, and the contrast contract measures
 * the ring on that fill for a field, a row and a wash — the surfaces where one
 * colour can clear the floor against both neighbours. A **filled action's** own
 * face was never one of them, and it is the one class where no colour can be:
 * `ring` *is* the brand (`ring` and `primary` are the same ramp step in twelve
 * of the sixteen styles), so a focused primary action paints its focus line in
 * its own fill at 1.00:1, and the pair is unsatisfiable by construction rather
 * than by palette choice — measured, no luminance clears the boundary floor
 * against both a dark page and a light brand fill (the feasible set is empty in
 * eight of the sixteen styles for `primary` and nine for `destructive`), and
 * where a colour does exist it is at least 0.11 of relative luminance away from
 * the brand, i.e. never the brand the ring is.
 *
 * So the contract names the exception instead of pairing a floor every shipped
 * style would fail: the ring is measured against the **strips** a filled action
 * is drawn on (already in `contrastPairs`), the four faces are held here, and the
 * fix — a ring separated from the fill, an outline offset or a two-tone ring —
 * is the interlock recorded in `TODO.md` because its geometry has to be measured
 * in a window first. The suite fails if a filled role appears that is neither
 * measured nor provably unusable, if a palette moves a number this page prints,
 * or if a page stops teaching the exception.
 *
 * `node:fs` is deliberate here for the same reason as in `field-boundary.test.ts`:
 * this holds the token contract to the two consumer packages' painters, and
 * `@gpuixui/tokens` keeps no dependency on either.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastFloorsFor, contrastPairs, contrastRatio } from "./contrast.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import {
  filledFeedback,
  filledFeedbackStates,
  filledRoles,
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
 * Every luminance that would clear the floor against **both** the page the
 * control sits on and the face it paints — the set a ring colour has to come
 * from, because the line is flush against both.
 */
const ringColours = (
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

/** The styles in which the ring misses its floor on one face. */
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

const paired = (role: FilledRole): boolean =>
  contrastPairs.some(
    (pair) => pair.foreground === "ring" && pair.background === role,
  );

describe("the ring on a filled action", () => {
  it("names every face either measured or provably unusable", () => {
    // A pair the gate can ask for holds in every style; a face the ring cannot
    // reach is one where no ring colour exists in at least one style.
    const forbidden = filledRoles.filter((role) =>
      styles.some(([, theme]) => ringColours(theme, role).length === 0),
    );
    expect(filledRoles.filter((role) => !paired(role))).toEqual(forbidden);
    expect(forbidden).toEqual(["primary", "destructive"]);
  });

  it("measures the ring on the face a filled action paints", () => {
    // The brand faces: the ring merges with the fill in every style, at rest and
    // under the pointer.
    expect(misses("primary", "rest")).toHaveLength(styles.length);
    expect(misses("destructive", "rest")).toHaveLength(styles.length);
    expect(misses("primary", "pressed")).toHaveLength(styles.length);
    expect(misses("destructive", "pressed")).toHaveLength(styles.length);
    expect(spread(ratios("primary", "rest"))).toBe("1.00–1.38");
    expect(spread(ratios("destructive", "rest"))).toBe("1.00–1.54");

    // The neutral faces at rest are the two the contract pairs, and they hold —
    // which is what makes the exception a statement about brand faces rather
    // than about the model.
    expect(misses("secondary", "rest")).toEqual([]);
    expect(misses("accent", "rest")).toEqual([]);

    // The derived pointer fills were never measured either: the press drops the
    // neutral faces under the floor in eight and six of the sixteen styles.
    expect(misses("secondary", "pressed")).toHaveLength(8);
    expect(misses("accent", "pressed")).toHaveLength(6);
    expect(misses("secondary", "hover")).toHaveLength(3);
    expect(misses("accent", "hover")).toHaveLength(3);
    // The neutral pairs are the ring's own, and they read the same states.
    filledFeedbackStates.forEach((state) => {
      expect(misses("secondary", state).length).toBeLessThan(styles.length);
    });
  });

  it("proves no ring colour clears both the page and a brand face", () => {
    const brandFaces: ReadonlyArray<FilledRole> = ["primary", "destructive"];
    const empty = (role: FilledRole) =>
      styles.filter(([, theme]) => ringColours(theme, role).length === 0)
        .length;
    expect(empty("primary")).toBe(8);
    expect(empty("destructive")).toBe(9);

    // Where a set survives, its nearest member is far from the brand: the ring
    // can be the brand or be found on the fill, never both.
    const distances = styles.flatMap(([, theme]) => {
      const ring = luminance(theme.colors.ring);
      if (ring === undefined) {
        return [];
      }
      return brandFaces.flatMap((role) =>
        ringColours(theme, role).flatMap(([low, high]) =>
          [low, high].map((edge) => Math.abs(edge - ring)),
        ),
      );
    });
    expect(Math.min(...distances)).toBeGreaterThan(0.1);

    // The paired faces are the contrast: a colour exists and the shipped ring
    // is inside it, so the exception is not the whole model failing.
    styles.forEach(([, theme]) => {
      const ring = luminance(theme.colors.ring);
      expect(ring).toBeDefined();
      if (ring === undefined) {
        return;
      }
      const pairedRoles: ReadonlyArray<FilledRole> = ["secondary", "accent"];
      pairedRoles.forEach((role) => {
        const interval = ringColours(theme, role);
        expect(
          interval.some(([low, high]) => ring >= low && ring <= high),
        ).toBe(true);
      });
    });
  });

  it("reads the geometry and the painters that make it true", () => {
    styles.forEach(([, theme]) => {
      // The line is flush against the fill, which is why both neighbours count.
      expect(keyboardFocusRing(theme).focusVisible.outlineOffset).toBe(0);
    });

    // Both seams declare the ring on a control, and the primitive paints the
    // faces the measurement names.
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

  it("teaches the exception on every surface", () => {
    const surfaces = [
      document("docs/tokens.md"),
      document("docs/design-system.md"),
      document("packages/tokens/README.md"),
    ];
    const numbers = [
      spread(ratios("primary", "rest")),
      spread(ratios("destructive", "rest")),
      `${misses("secondary", "pressed").length} of the sixteen`,
    ];
    numbers.forEach((value) => {
      surfaces.forEach((text) => expect(text).toContain(value));
    });
    surfaces.forEach((text) => {
      expect(text).toContain("filled action");
      expect(text).toContain("outlineOffset");
    });
  });
});
