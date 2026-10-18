/**
 * Guards the defect plan 367 fixes: the design system publishes the type scale
 * as two ladders — prose `display` → `caption` and code `code` → `codeBlock` —
 * with `bodyStrong` as the weight variant of `body`, but `themeMetricFailures`
 * only checked that each role had a positive size and leading above that size.
 * An edited theme could therefore render a heading smaller than the body under
 * it, invert the code ladder, shrink `bodyStrong` below `body`, or flatten its
 * weight onto body's — emphasis the reader cannot see — while both
 * `themeMetricFailures` and `themeContrastFailures` returned `[]`.
 *
 * The compositions are first-class: `CardTitle` paints `h3`, an Alert and a
 * Toast paint `bodyStrong` for the panel title, and field helper text paints
 * `caption`. Each case below fails without its rule in `metrics.ts`.
 */
import { describe, expect, it } from "vitest";
import { themeContrastFailures } from "./contrast.js";
import { themeMetricFailures } from "./metrics.js";
import {
  getPlatformRecipeTheme,
  platformRecipeNames,
} from "./platform-recipes.js";
import { platformNames } from "./platforms.js";
import {
  extendTheme,
  getPlatformTheme,
  getTheme,
  lightTheme,
  themeContrasts,
  themeModes,
  type Theme,
} from "./theme.js";
import { codeLadder, proseLadder, textRoles } from "./typography.js";

/** Every shipped set: identity, platform variant and recipe, in both modes. */
const shipped: ReadonlyArray<readonly [string, Theme]> = [
  ...themeModes.flatMap((mode) =>
    themeContrasts.map(
      (contrast) => [`${mode}/${contrast}`, getTheme(mode, contrast)] as const,
    ),
  ),
  ...platformNames.flatMap((platform) =>
    themeModes.map(
      (mode) =>
        [`${platform}/${mode}`, getPlatformTheme(platform, mode)] as const,
    ),
  ),
  ...platformRecipeNames.flatMap((recipe) =>
    themeModes.map(
      (mode) =>
        [
          `recipe:${recipe}/${mode}`,
          getPlatformRecipeTheme(recipe, mode),
        ] as const,
    ),
  ),
];

describe("the type scale contract", () => {
  it("reports an inverted prose ladder", () => {
    const edited = extendTheme(lightTheme, {
      typography: { h1: { fontSize: 12, lineHeight: 16 } },
    });
    expect(themeContrastFailures(edited)).toEqual([]);
    expect(themeMetricFailures(edited)).toEqual([
      {
        group: "typography",
        member: "h1.fontSize",
        rule: "non-decreasing",
        actual: 12,
        bound: 20,
      },
    ]);
  });

  it("reports an inverted code ladder", () => {
    const edited = extendTheme(lightTheme, {
      typography: { codeBlock: { fontSize: 14, lineHeight: 20 } },
    });
    expect(themeContrastFailures(edited)).toEqual([]);
    expect(themeMetricFailures(edited)).toEqual([
      {
        group: "typography",
        member: "code.fontSize",
        rule: "non-decreasing",
        actual: 13,
        bound: 14,
      },
    ]);
  });

  it("reports emphasis that matches body text", () => {
    const edited = extendTheme(lightTheme, {
      typography: { bodyStrong: { fontWeight: 400 } },
    });
    expect(themeContrastFailures(edited)).toEqual([]);
    expect(themeMetricFailures(edited)).toEqual([
      {
        group: "typography",
        member: "bodyStrong.fontWeight",
        rule: "increasing",
        actual: 400,
        bound: 400,
      },
    ]);
  });

  it("reports an emphasis role smaller than body", () => {
    const edited = extendTheme(lightTheme, {
      typography: { bodyStrong: { fontSize: 12, lineHeight: 16 } },
    });
    expect(themeContrastFailures(edited)).toEqual([]);
    expect(themeMetricFailures(edited)).toEqual([
      {
        group: "typography",
        member: "bodyStrong.fontSize",
        rule: "non-decreasing",
        actual: 12,
        bound: 14,
      },
    ]);
  });

  it("allows equal adjacent steps and an emphasis role above body", () => {
    const collapsed = extendTheme(lightTheme, {
      typography: { h2: { fontSize: 16, lineHeight: 24 } },
    });
    expect(themeMetricFailures(collapsed)).toEqual([]);

    const raised = extendTheme(lightTheme, {
      typography: { bodyStrong: { fontSize: 15, fontWeight: 700 } },
    });
    expect(themeMetricFailures(raised)).toEqual([]);
  });

  it("passes every shipped theme, platform variant and recipe", () => {
    shipped.forEach(([label, theme]) => {
      expect(themeMetricFailures(theme), label).toEqual([]);
    });
  });

  it("organises every type role into the two documented ladders", () => {
    const laddered = [...proseLadder, "bodyStrong", ...codeLadder];
    expect(laddered.toSorted()).toEqual([...textRoles].toSorted());
    expect(new Set(laddered).size).toBe(laddered.length);
    expect(proseLadder[0]).toBe("display");
    expect(proseLadder.at(-1)).toBe("caption");
    expect(codeLadder[0]).toBe("code");
    expect(codeLadder.at(-1)).toBe("codeBlock");
  });
});
