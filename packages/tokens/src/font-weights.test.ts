/**
 * Guards the defect plan 518 fixes: the shipped type scale uses three weights
 * (`400`, `500`, `600`), but two unguarded surfaces still claimed four. The
 * public `FontWeight` JSDoc in `typography.ts` named a `700` no role uses, and
 * `docs/design-system.md` said “The four weights are a scale choice” while
 * `docs/tokens.md` and its guard already said three. The weights were also the
 * only shipped scale with no public index, so `docs.test.ts` re-derived the set
 * locally and a font bundle had no list to load.
 *
 * Cases 2 and 3 fail on the pre-fix sentences; case 1 fails if `fontWeights`
 * becomes a stale literal. `node:fs` is deliberate, as in `docs.test.ts` and
 * `snippets.test.ts`: this is a policy check over the tree's own documents, and
 * the package ships zero runtime dependencies by design.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shippedTypeManifest } from "./font-weights.example.js";
import { fontWeights, textRoles, typography } from "./typography.js";

const source = (url: URL): string => readFileSync(url, "utf8");

const typographySource = source(new URL("./typography.ts", import.meta.url));
const designSystem = source(
  new URL("../../../docs/design-system.md", import.meta.url),
);
const catalogue = source(new URL("../../../docs/tokens.md", import.meta.url));

/** The weights the roles actually name, ascending — the index's only source. */
const derived = [
  ...new Set(textRoles.map((role) => typography[role].fontWeight)),
].toSorted((left, right) => left - right);

const countWords = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

const countWord = (count: number): string => countWords[count] ?? String(count);

const quoted = (weights: ReadonlyArray<number>): ReadonlyArray<string> =>
  weights.map((weight) => `\`${weight}\``);

/** The weight list as prose: “`400`, `500` and `600`”. */
const listPhrase = (weights: ReadonlyArray<number>): string => {
  const parts = quoted(weights);
  const last = parts.at(-1);
  if (last === undefined) {
    return "";
  }
  return `${parts.slice(0, -1).join(", ")} and ${last}`;
};

/** Every backticked three-digit number in a passage — a claimed weight. */
const claimedWeights = (passage: string): ReadonlyArray<number> =>
  [...passage.matchAll(/`(\d{3})`/g)].flatMap((match) => {
    const value = match[1];
    return value === undefined ? [] : [Number(value)];
  });

const fontWeightDoc =
  typographySource.match(/\/\*\*[\s\S]*?\*\/\s*export type FontWeight/)?.[0] ??
  "";

/** The design-system paragraph that states the scale's weights. */
const designWeightsParagraph = ((): string => {
  const marker = "shipped weights";
  const at = designSystem.indexOf(marker);
  if (at === -1) {
    return "";
  }
  const start = designSystem.lastIndexOf("\n", at) + 1;
  const end = designSystem.indexOf("\n\n", at);
  return designSystem.slice(start, end === -1 ? undefined : end);
})();

describe("the shipped font weights", () => {
  it("indexes exactly the weights the roles use, ascending and once", () => {
    expect(fontWeights).toEqual(derived);
    expect(new Set(fontWeights).size).toBe(fontWeights.length);
    fontWeights.forEach((weight) => {
      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThanOrEqual(1000);
    });
  });

  it("names the shipped set in the public FontWeight JSDoc", () => {
    expect(fontWeightDoc).toContain("{@link fontWeights}");
    expect(new Set(claimedWeights(fontWeightDoc))).toEqual(new Set(derived));
  });

  it("names the shipped set and its count in the design system", () => {
    expect(designWeightsParagraph).toContain(
      `The ${countWord(fontWeights.length)} shipped weights`,
    );
    expect(new Set(claimedWeights(designWeightsParagraph))).toEqual(
      new Set(derived),
    );
  });

  it("names the index and the set in the catalogue", () => {
    expect(catalogue).toContain("`fontWeights`");
    expect(catalogue.replace(/\s+/g, " ")).toContain(listPhrase(fontWeights));
  });

  it("runs the font manifest against the roles it describes", () => {
    const manifest = shippedTypeManifest();
    expect(manifest.weights).toEqual(fontWeights);
    expect(manifest.roles.map(({ role }) => role)).toEqual([...textRoles]);
    manifest.roles.forEach(({ role, weight }) => {
      expect(weight).toBe(typography[role].fontWeight);
      expect(fontWeights).toContain(weight);
    });
  });
});
