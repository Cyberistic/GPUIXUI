/**
 * Guards the three places that describe what `primary` is measured as.
 *
 * Plan 332 split a solid role into a fill and a mark, so `primary` carries nine
 * `mark` pairs beside its five `surface` pairs, its on-colour pair and its
 * step. `docs/tokens.md` and the package README still said the role was
 * "measured only as a fill", and neither sentence was read by a suite: the same
 * paragraph's `primaryText` half is held by `docs.test.ts` and its `primary`
 * half was not, while the mark compositions — a progress segment, a slider fill
 * or thumb ring, a rating star, a combobox check, a timeline dot — are exactly
 * the pixels a copied palette erases first (the tightest shipped primary mark
 * is 3.149:1, macOS light `primary` on `track`).
 *
 * The classes and surfaces below are derived from `contrastPairs`,
 * `markPairs`, `trackMarkPairs` and `contrastFloors`, so a contract change and a
 * document edit cannot land apart, in either direction.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairClasses,
  contrastPairs,
  markPairs,
  markRoles,
  trackMarkPairs,
} from "./contrast.js";

/** A document read as one line, so a wrapped claim is not a substring. */
const prose = (url: URL): string =>
  readFileSync(url, "utf8").replaceAll(/\s+/g, " ");

const rawCatalogue = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);
const catalogue = prose(new URL("../../../docs/tokens.md", import.meta.url));
const readme = prose(new URL("../README.md", import.meta.url));
const typeSource = prose(new URL("./color.ts", import.meta.url));

/** The slice of `text` between two markers a reader sees. */
const between = (text: string, start: string, end: string): string => {
  const from = text.indexOf(start);
  expect(from, start).toBeGreaterThanOrEqual(0);
  const to = text.indexOf(end, from + start.length);
  expect(to, `${start} … ${end}`).toBeGreaterThan(from);
  return text.slice(from, to);
};

/** The pair classes the contract measures for a role, in floor-class order. */
const classesOf = (role: string): ReadonlyArray<string> =>
  contrastPairClasses.filter((pairClass) =>
    contrastPairs.some(
      ([foreground, background, measured]) =>
        measured === pairClass && (foreground === role || background === role),
    ),
  );

/** The surfaces a role marks, from the two published mark lists. */
const markSurfacesOf = (role: string): ReadonlyArray<string> => [
  ...new Set([
    ...markPairs
      .filter(
        ([foreground, , pairClass]) =>
          foreground === role && pairClass === "mark",
      )
      .map(([, background]) => background),
    ...trackMarkPairs
      .filter(([foreground]) => foreground === role)
      .map(([, background]) => background),
  ]),
];

/** The claim both documents made before plan 806. */
const claimsOnlyFill = (text: string): boolean =>
  /measured only as a fill|only (?:measured )?as a fill/.test(text);

/** The five compositions that paint a solid role as a mark. */
const markCompositions = [
  "progress segment",
  "thumb ring",
  "rating star",
  "combobox check",
  "timeline dot",
] as const;

const primaryMarks = markSurfacesOf("primary");
const markFloor = `${contrastFloors.default.mark}:1`;
const highMarkFloor = `${contrastFloors.high.mark}:1`;

describe("primary is a fill and a mark", () => {
  it("is measured as four classes and nine marks", () => {
    expect(classesOf("primary")).toEqual([
      "secondary",
      "mark",
      "surface",
      "step",
    ]);
    expect(primaryMarks).toEqual([
      "background",
      "card",
      "popover",
      "muted",
      "input",
      "hover",
      "selected",
      "selectedActive",
      "track",
    ]);
  });

  it("names every mark surface in the catalogue's brand-action paragraph", () => {
    const paragraph = between(
      catalogue,
      "The same fill-versus-text split applies to the brand action.",
      "A runnable example lives in",
    );
    const marks = between(
      paragraph,
      "It is also a **mark**",
      "a chosen option marks",
    );
    primaryMarks.forEach((surface) =>
      expect(marks, surface).toContain(`\`${surface}\``),
    );
    expect(marks).toContain(markFloor);
    expect(marks).toContain(highMarkFloor);
    markCompositions.forEach((composition) =>
      expect(marks, composition).toContain(composition),
    );
    expect(paragraph).toContain("markPairs");
    expect(paragraph).toContain("trackMarkPairs");
  });

  it("names every mark surface in the README's role paragraph", () => {
    const paragraph = between(
      readme,
      "`primary` is a fill:",
      "A runnable example lives in",
    );
    const marks = between(
      paragraph,
      "It is also a mark",
      "a chosen option marks",
    );
    primaryMarks.forEach((surface) =>
      expect(marks, surface).toContain(`\`${surface}\``),
    );
    expect(marks).toContain(markFloor);
    expect(marks).toContain(highMarkFloor);
    markCompositions.forEach((composition) =>
      expect(marks, composition).toContain(composition),
    );
    expect(paragraph).toContain("markPairs");
    expect(paragraph).toContain("trackMarkPairs");
  });

  it("holds the role's JSDoc and its table row to the same rule", () => {
    const jsdoc = between(
      typeSource,
      "Primary action background.",
      "Primary action background while hovered.",
    );
    expect(jsdoc).toContain("markPairs");
    expect(jsdoc).toContain("trackMarkPairs");

    const row = rawCatalogue
      .split("\n")
      .find((line) => line.startsWith("| `primary` |"));
    expect(row, "the `primary` role row").toBeDefined();
    expect(row).toContain("mark");
    expect(row).toContain("rating star");
  });

  it("rejects the pre-806 claim, and the predicate can fail", () => {
    expect(claimsOnlyFill(catalogue)).toBe(false);
    expect(claimsOnlyFill(readme)).toBe(false);
    expect(claimsOnlyFill("it is measured only as a fill")).toBe(true);
    expect(claimsOnlyFill("and it is only measured as a fill.")).toBe(true);
    expect(claimsOnlyFill("`primary` is a fill")).toBe(false);
  });

  it("covers every role the mark rule names, and no other", () => {
    expect([...markRoles]).toEqual(["primary", "success", "destructive"]);
    markRoles.forEach((role) =>
      expect(classesOf(role), role).toContain("mark"),
    );
    expect(catalogue).toContain("markPairs");
    expect(readme).toContain("markPairs");
  });
});
