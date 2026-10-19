/**
 * Guards the defect plan 673 fixes: the interaction ladders had no ordered
 * index, and the three prose surfaces that retyped them each drifted one plan
 * behind. The `DirectionFailure` JSDoc named five of the six ladders after plan
 * 622 added `rowPress`; `themeDirectionFailures`' JSDoc named five of the six
 * step-pair lists after plan 651 added `selectionPressStepPairs`; and the package
 * README's direction paragraph omitted the selected row's press entirely. No
 * suite read any of them — `docs.test.ts` guards the Markdown pages and
 * `readme.test.ts` the counts, not this paragraph.
 *
 * `node:fs` is deliberate, as in the other tree-local documentation guards: the
 * tokens package ships zero runtime dependencies and the read is deterministic.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  stateLadderNames,
  stateLadders,
  type DirectionFailure,
} from "./direction.js";
import { stateLadderRows } from "./state-ladder-index.example.js";
import { filledControlFamilies } from "./styles.js";
import { extendTheme, getTheme } from "./theme.js";

const source = readFileSync(new URL("./direction.ts", import.meta.url), "utf8");
const contrastSource = readFileSync(
  new URL("./contrast.ts", import.meta.url),
  "utf8",
);
const catalogue = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const designSystem = readFileSync(
  new URL("../../../docs/design-system.md", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const readme = readFileSync(
  new URL("../README.md", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

/** The published JSDoc block above `marker`, whitespace-normalised. */
const proseAt = (marker: string): string => {
  const at = source.indexOf(marker);
  const start = source.lastIndexOf("/**", at);
  const end = source.indexOf("*/", start);
  return source
    .slice(start + "/**".length, end)
    .replace(/^[ \t]*\*[ \t]?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
};

/** The published `DirectionFailure` declaration, field docs included. */
const directionFailureBody = (): string => {
  const start = source.indexOf("export interface DirectionFailure");
  const end = source.indexOf("\n}", start);
  return source.slice(start, end);
};

/** Every exported `*StepPairs` list, derived from the contract module. */
const stepPairLists = [
  ...contrastSource.matchAll(/^export const (\w+StepPairs)/gm),
].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

/** The ladders that are not one of the four families. */
const fixedLadders = stateLadderNames.filter(
  (name) => !filledControlFamilies.some((family) => family === name),
);

describe("the interaction ladders' index", () => {
  it("finds the published blocks and the step-pair lists", () => {
    expect(proseAt("interface DirectionFailure").length).toBeGreaterThan(0);
    expect(
      proseAt("export function themeDirectionFailures").length,
    ).toBeGreaterThan(0);
    expect(stepPairLists.length).toBeGreaterThanOrEqual(6);
    expect(fixedLadders.length).toBeGreaterThan(0);
  });

  it("names every ladder once, in documentation order", () => {
    expect(stateLadders.map(({ name }) => name)).toEqual([...stateLadderNames]);
    expect(new Set(stateLadderNames).size).toBe(stateLadderNames.length);
  });

  it("narrows the failure to a ladder from the index", () => {
    const inverted = extendTheme(getTheme("light"), {
      colors: {
        primary: "#3A2A9A",
        primaryHover: "#4A38AE",
        primaryActive: "#5A46C2",
      },
    });
    const rows = stateLadderRows(inverted);
    expect(rows).toHaveLength(stateLadderNames.length);
    expect(
      rows
        .filter(({ failures }) => failures.length > 0)
        .map(({ name }) => name),
    ).toEqual(["primary"]);
    const primary: ReadonlyArray<DirectionFailure> =
      rows.find(({ name }) => name === "primary")?.failures ?? [];
    expect(primary).toHaveLength(2);
    expect(primary.map(({ ladder }) => ladder)).toEqual(["primary", "primary"]);
  });

  it("names the index in both source paragraphs", () => {
    expect(directionFailureBody()).toContain("`stateLadderNames`");
    expect(proseAt("export function themeDirectionFailures")).toContain(
      "`stateLadderNames`",
    );
  });

  it("names every step-pair list the check defers to", () => {
    const prose = proseAt("export function themeDirectionFailures");
    stepPairLists.forEach((list) =>
      expect(prose, list).toContain(`\`${list}\``),
    );
  });

  it("names the index and every step list in the catalogue", () => {
    expect(catalogue).toContain("`stateLadderNames`");
    stepPairLists.forEach((list) =>
      expect(catalogue, list).toContain(`\`${list}\``),
    );
  });

  it("names the index in the design system", () => {
    expect(designSystem).toContain("`stateLadderNames`");
  });

  it("names the index and every fixed ladder in the README", () => {
    expect(readme).toContain("`stateLadderNames`");
    fixedLadders.forEach((name) =>
      expect(readme, name).toContain(`\`${name}\``),
    );
  });
});
