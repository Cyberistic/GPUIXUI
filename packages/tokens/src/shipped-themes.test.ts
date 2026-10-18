/**
 * Guards the gap plan 387 fixes: the package owned every theme axis and every
 * resolver, but not their enumeration, so each surface that said "every shipped
 * set" built its own list — `contrast.test.ts` enumerated 4 (identity only),
 * `theme-check.test.ts` 20 (recipes at the default contrast only),
 * `color-format.test.ts` 24, `metrics.test.ts` iterated `platformNames`
 * unfiltered and measured the identity four times at one contrast level, and the
 * README quoted a sixth number. `shippedThemes` derives from the axis owners and
 * the public resolvers, so the set and its provenance are one edit at the owner.
 */

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  caseSource,
  fullSetClaimOffenders,
  type SuiteSource,
} from "./full-set-claims.js";
import { isPlatformName, platformNames } from "./platforms.js";
import {
  isPlatformRecipeName,
  platformRecipeNames,
} from "./platform-recipes.js";
import {
  shippedThemeFailures,
  shippedThemeLabels,
} from "./shipped-themes.example.js";
import {
  platformVariants,
  shippedThemes,
  type ShippedTheme,
} from "./shipped-themes.js";
import { getTheme, themeContrasts, themeModes } from "./theme.js";
import { themeFailures } from "./theme-check.js";

/** The axis member a set came from, without its mode or contrast. */
const axisKey = (set: ShippedTheme): string =>
  set.source === "identity"
    ? "identity"
    : set.source === "platform"
      ? `platform:${set.platform}`
      : `recipe:${set.recipe}`;

/** One set's provenance and the level it claims, as a comparable key. */
const setKey = (set: ShippedTheme): string =>
  `${axisKey(set)}|${set.theme.mode}|${set.theme.contrast}`;

/** Every key the axes demand, in documentation order. */
const expectedKeys: ReadonlyArray<string> = [
  ...themeModes.flatMap((mode) =>
    themeContrasts.map((contrast) => `identity|${mode}|${contrast}`),
  ),
  ...platformVariants.flatMap((platform) =>
    themeModes.flatMap((mode) =>
      themeContrasts.map(
        (contrast) => `platform:${platform}|${mode}|${contrast}`,
      ),
    ),
  ),
  ...platformRecipeNames.flatMap((recipe) =>
    themeModes.flatMap((mode) =>
      themeContrasts.map((contrast) => `recipe:${recipe}|${mode}|${contrast}`),
    ),
  ),
];

describe("platformVariants", () => {
  it("is every shipped platform except the identity", () => {
    expect(platformVariants).not.toContain("default");
    // Read the count from the owner rather than retyping the four names: a
    // fifth platform must reach this assertion through `platformNames`.
    expect(platformVariants).toHaveLength(platformNames.length - 1);
    expect(platformVariants.every(isPlatformName)).toBe(true);
  });

  it("is not a recipe list", () => {
    expect(platformVariants.some(isPlatformRecipeName)).toBe(false);
  });
});

describe("shippedThemes", () => {
  it("covers every axis member at every mode and contrast", () => {
    expect(shippedThemes.map(setKey).toSorted()).toEqual(
      expectedKeys.toSorted(),
    );
    expect(shippedThemes).toHaveLength(
      themeModes.length *
        themeContrasts.length *
        (1 + platformVariants.length + platformRecipeNames.length),
    );
  });

  it("has a unique name per set, so a debug label names one set", () => {
    const names = shippedThemes.map(({ theme }) => theme.name);
    expect(new Set(names).size).toBe(shippedThemes.length);
  });

  it("returns the built-in identity objects, not rebuilds", () => {
    const identitySets = shippedThemes.filter(
      (set) => set.source === "identity",
    );
    const builtIns = themeModes.flatMap((mode) =>
      themeContrasts.map((contrast) => getTheme(mode, contrast)),
    );
    expect(identitySets.map(({ theme }) => theme)).toEqual(builtIns);
    expect(
      identitySets.every(({ theme }, index) => theme === builtIns[index]),
    ).toBe(true);
  });

  it("passes themeFailures on every shipped set", () => {
    const failures = shippedThemes.flatMap(({ theme }) =>
      themeFailures(theme).map((failure) => `${theme.name}: ${failure.kind}`),
    );
    expect(failures).toEqual([]);
  });
});

describe("shipped-themes example", () => {
  it("runs the documented loop and labels every source", () => {
    expect(shippedThemeFailures).toEqual([]);
    expect(shippedThemeLabels).toHaveLength(shippedThemes.length);
    expect(
      shippedThemeLabels.some((label) => label.endsWith("(identity)")),
    ).toBe(true);
    expect(
      shippedThemeLabels.some((label) => label.includes("(platform: ")),
    ).toBe(true);
    expect(
      shippedThemeLabels.some((label) => label.includes("(recipe: ")),
    ).toBe(true);
  });
});

/*
 * `node:fs` is used deliberately, as in `docs.test.ts`: these cases read the
 * tree's own test sources, and the tokens package ships zero runtime
 * dependencies by design.
 */

/** Every suite beside this one, with its source. */
const suiteSources = (): ReadonlyArray<SuiteSource> =>
  readdirSync(new URL(".", import.meta.url))
    .filter(
      (file) => file.endsWith(".test.ts") && file !== "shipped-themes.test.ts",
    )
    .map((file) => ({
      file,
      source: readFileSync(new URL(file, import.meta.url), "utf8"),
    }));

/** A fixture case that claims the full shipped set. */
const claim = "keeps every shipped theme above its floor";

describe("full-set claims", () => {
  it("reads the enumeration in every suite that claims it", () => {
    expect(fullSetClaimOffenders(suiteSources())).toEqual([]);
  });

  it("reports a claim that rebuilds its own matrix", () => {
    expect(
      fullSetClaimOffenders([
        { file: "sample.test.ts", source: caseSource(claim) },
      ]),
    ).toEqual(["sample.test.ts"]);
  });

  it("accepts a claim that reads the enumeration", () => {
    expect(
      fullSetClaimOffenders([
        {
          file: "sample.test.ts",
          source: caseSource(
            claim,
            'import { shippedThemes } from "./shipped-themes.js";\n',
          ),
        },
      ]),
    ).toEqual([]);
  });
});
