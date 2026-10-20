/**
 * Guards the tint's measurement claim.
 *
 * The bug these cases catch: plan `505` made `shadow` a measured composition —
 * the contrast check composites each defined elevation level at its own alpha
 * over the surfaces the level floats above — but three current-state passages
 * still told a consumer the tint has no pair. The public `themeColorFailures`
 * JSDoc said "no other check sees it", the catalogue's *Colour format* section
 * said "The tint roles have no pair … while both other checks returned `[]`",
 * and the ledger's Theme colour check row repeated it in the present tense. The
 * practical harm is the direction the sentence implies: a consumer is told the
 * colour check is the only guard on an edited tint, while the tint that is a
 * valid hex and equals its backdrop — the case the elevation walk exists for —
 * is reported only by the contrast check.
 *
 * The catalogue contradicts itself one section later ("`scrollbar` is the one
 * role that is not a pair"), and `contrast.test.ts`'s exemption comment says
 * "`shadow` used to be here".
 *
 * The cases derive the painted pairs from `elevationSurfaces`,
 * `elevationContentSurfaces` and the shipped levels, so a level or surface that
 * joins the walk fails the prose until it names the owner. The last case runs
 * the same predicate over the pre-fix sentences, so it can fail.
 *
 * `node:fs` is deliberate, as in the other tree-local documentation guards.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  elevationContentSurfaces,
  elevationLevels,
  elevationSurfaces,
  extendTheme,
  getTheme,
  themeColorFailures,
  themeContrastFailures,
  themeMetricFailures,
  themeOpacityFailures,
  type ElevationLevel,
} from "./index.js";

const source = readFileSync(new URL("./contrast.ts", import.meta.url), "utf8");
const catalogueSource = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);
const ledgerSource = readFileSync(
  new URL("../../../COMPONENTS.md", import.meta.url),
  "utf8",
);

const collapse = (text: string): string => text.replace(/\s+/g, " ");

const catalogue = collapse(catalogueSource);

/** The JSDoc block directly above a module-level declaration, collapsed. */
const docBlockAbove = (declaration: string): string => {
  const at = source.indexOf(declaration);
  expect(at, declaration).toBeGreaterThan(-1);
  const start = source.lastIndexOf("/**", at);
  return collapse(
    source
      .slice(start, source.indexOf("*/", start))
      .replace(/^[ \t]*\*[ \t]?/gm, ""),
  );
};

/** The ledger's Theme colour check row. */
const colourRow = ledgerSource
  .split("\n")
  .find((line) => line.startsWith("| Theme colour check |"));
if (colourRow === undefined) {
  throw new Error("COMPONENTS.md has no Theme colour check row");
}
const colour = collapse(colourRow);

/**
 * The refuted phrases. Each one states the tint is unmeasured, which plan `505`
 * falsified; `scrollbar`, not the tint, is the one role with no pair.
 */
const refuted = ["tint roles have no pair", "no other check sees it"] as const;

const contradictions = (text: string): ReadonlyArray<string> =>
  refuted.filter((phrase) => collapse(text).includes(phrase));

const light = getTheme("light");
const tinted = extendTheme(light, { colors: { shadow: "black" } });

/** The surfaces one level's shadow lands on, from the two exported lists. */
const surfacesFor = (level: ElevationLevel): ReadonlyArray<string> => {
  if (light.elevation[level].length === 0) {
    return [];
  }
  return level === "md"
    ? [...elevationSurfaces, ...elevationContentSurfaces]
    : [...elevationSurfaces];
};

describe("the tint's measurement claim", () => {
  it("reports a malformed tint from the contrast check at every level", () => {
    expect(themeColorFailures(tinted)).toEqual([
      { role: "shadow", value: "black" },
    ]);
    expect(themeMetricFailures(tinted)).toEqual([]);
    expect(themeOpacityFailures(tinted)).toEqual([]);

    const failures = themeContrastFailures(tinted);
    const expected = elevationLevels.flatMap((level) =>
      surfacesFor(level).map((surface) => `${level} ${surface}`),
    );

    expect(
      failures.map(({ level, background }) => `${level} ${background}`),
    ).toEqual(expected);
    failures.forEach((failure) => {
      expect(failure.wash).toBe("shadow");
      expect(failure.pairClass).toBe("surface");
      expect(failure.floor).toBe(contrastFloors.default.surface);
      expect(Number.isNaN(failure.ratio)).toBe(true);
    });
  });

  it("has the public colour check name the elevation walk", () => {
    const block = docBlockAbove("export function themeColorFailures(");

    expect(block).toContain("elevationSurfaces");
    expect(block).toContain("`shadow`");
    expect(contradictions(block)).toEqual([]);
  });

  it("describes the measured tint in the catalogue's Colour format section", () => {
    const anchor = "This is the format half of the editable-theme guarantee";
    const at = catalogue.indexOf(anchor);

    expect(at).toBeGreaterThan(-1);
    const paragraph = catalogue.slice(at, at + 1100);
    expect(paragraph).toContain("elevationSurfaces");
    expect(paragraph).toContain("elevationContentSurfaces");
    expect(contradictions(paragraph)).toEqual([]);
  });

  it("keeps the ledger's history and states the walk that closes it", () => {
    expect(colour).toContain("plan 371");
    expect(colour).toContain("elevationSurfaces");
    expect(colour).toContain("plan 505");
    expect(contradictions(colour)).toEqual([]);
  });

  it("agrees with the completeness paragraph's one unmeasured role", () => {
    const anchor = "the one role that is not a pair";
    const at = catalogue.indexOf(anchor);

    expect(at).toBeGreaterThan(-1);
    expect(catalogue.slice(at, at + 200)).toContain("`scrollbar`");
  });

  it("reports the pre-fix sentences, so the guard can fail", () => {
    const before = [
      'for a measured role the contrast check then reports `NaN`, but the tint roles have no pair: a `shadow` of "black" makes every elevation level fully opaque because `alpha` returns an unparseable tint unchanged, and no other check sees it.',
      'The tint roles have no pair. `shadow` is applied to every elevation level through `alpha()` (plan `085`), and an unparseable tint is returned unchanged, so `shadow: "black"` painted a **fully opaque** shadow at every level — the shipped 0.08, 0.12 and 0.16 alphas gone — while both other checks returned `[]`.',
      'A measured role in another CSS form fails the contrast check as `NaN`; the tint roles have no pair, so a `shadow` of "black" made every elevation level fully opaque while both other checks returned `[]` (plan 371).',
    ];

    before.forEach((sentence) => {
      expect(contradictions(sentence).length).toBeGreaterThan(0);
    });
  });
});
