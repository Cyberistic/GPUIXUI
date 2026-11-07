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

const luminance = (colour: string): number | undefined => {
  const ratio = contrastRatio(colour, "#000000");
  return ratio === undefined ? undefined : (ratio - 1) / 20;
};

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

const face = (
  theme: Theme,
  role: FilledRole,
  state: FilledFeedbackState | "rest",
): string | undefined =>
  state === "rest" ? theme.colors[role] : filledFeedback(theme, role, state);

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

    const wide: Theme = {
      ...themes.light,
      borderWidth: { thin: 1, strong: 3 },
    };
    expect(keyboardFocusRing(wide).focusVisible.outlineOffset).toBe(3);
  });

  it("keeps the measured reason a flush line cannot serve a filled action", () => {
    expect(misses("primary", "rest")).toHaveLength(styles.length);
    expect(misses("destructive", "rest")).toHaveLength(styles.length);
    expect(misses("primary", "pressed")).toHaveLength(styles.length);
    expect(misses("destructive", "pressed")).toHaveLength(styles.length);
    expect(spread(ratios("primary", "rest"))).toBe("1.00–1.15");
    expect(spread(ratios("destructive", "rest"))).toBe("1.00–1.38");

    expect(misses("secondary", "rest")).toEqual([]);
    expect(misses("accent", "rest")).toEqual([]);

    expect(misses("secondary", "pressed")).toHaveLength(9);
    expect(misses("accent", "pressed")).toHaveLength(7);
    expect(misses("secondary", "hover")).toHaveLength(3);
    expect(misses("accent", "hover")).toHaveLength(3);
    filledFeedbackStates.forEach((state) => {
      expect(misses("secondary", state).length).toBeLessThan(styles.length);
    });

    const brandFaces: ReadonlyArray<FilledRole> = ["primary", "destructive"];
    const sameStep = styles.filter(
      ([, theme]) => theme.colors.ring === theme.colors.primary,
    ).length;
    const empty = (role: FilledRole) =>
      styles.filter(([, theme]) => flushColours(theme, role).length === 0)
        .length;
    expect(empty("primary")).toBe(10);
    expect(empty("destructive")).toBe(10);

    const tokens = document("docs/tokens.md").replace(/\s+/g, " ");
    const design = document("docs/design-system.md").replace(/\s+/g, " ");
    const readme = document("packages/tokens/README.md").replace(/\s+/g, " ");
    const secondary = misses("secondary", "pressed").length;
    const accent = misses("accent", "pressed").length;

    expect(tokens).toContain(
      `same ramp step in ${sameStep} of the ${styles.length} styles`,
    );
    expect(tokens).toContain(
      `in **${secondary} of the ${styles.length}** styles for \`secondary\` and **${accent}** for \`accent\``,
    );
    expect(design).toContain(
      `in **${secondary} of the ${styles.length}** styles for \`secondary\` and ${accent} for \`accent\``,
    );
    expect(readme).toContain(`in all ${styles.length} styles`);
    expect(readme).toContain(`over the ${styles.length} styles`);

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
    expect(Math.min(...distances)).toBeGreaterThan(0.09);
  });

  it("reads the line against the strip behind the control", () => {
    expect(ringPairs.map(({ background }) => background)).toEqual([
      ...ringStrips,
    ]);

    const paired = new Set(ringPairs.map(({ background }) => background));
    expect(paired.has("primary")).toBe(false);
    expect(paired.has("destructive")).toBe(false);

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

    const cell = tightest();
    expect(`${cell.style} ring/${cell.over}`).toBe(
      "Light · win32 ring/destructiveSoft",
    );
    expect(cell.ratio.toFixed(2)).toBe("3.05");
  });

  it("paints the offset the window probe measured", () => {
    const probe = document("apps/playground/src/live/ring-offset.ts");
    const offset = keyboardFocusRing(themes.dark).focusVisible.outlineOffset;
    expect(probe).toContain(`RING_OFFSET = ${offset}`);

    const scenario = document("apps/playground/src/live/scenarios.tsx");
    expect(scenario).toContain("offset={RING_OFFSET}");
  });

  it("reads the geometry and the painters that make it true", () => {
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
      expect(text).toContain("3.05");
      expect(text).toContain("gap");
    });

    [surfaces[0], surfaces[2]].forEach((text) =>
      expect(text).toContain("focus-ring-offset"),
    );

    expect(surfaces[0]).not.toContain("a two-tone ring is the other route");
  });
});
