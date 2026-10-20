/**
 * Guards the descriptions of the solid status roles.
 *
 * Every present-tense description said the same thing: the solid status roles
 * are **fills**, and a dot is something else. The design system stated "The
 * solid roles are fills: … so it is never the colour of text or a dot", the
 * catalogue stated "The solid roles are fills, not foregrounds", and
 * `ThemeColors.destructive` said only "Destructive action background." — while
 * the contract measures `success` as five marks and `destructive` as six marks
 * and fourteen boundary pairs, and the shipped `Progress`, `Slider`, `Rating`
 * and `Timeline` paint exactly those compositions. `destructive`'s other job,
 * the invalid boundary, was named only as "the invalid field edge" — two of the
 * fourteen pairs, and never the ring that is an invalid control's only focus
 * indicator. Both wrong sentences were *guarded* by `docs.test.ts`, so the
 * suite enforced the overgeneralisation.
 *
 * The classes, mark surfaces and ring/edge split below are derived from
 * `contrastPairs`, `markPairs`, `trackMarkPairs` and `invalidRingPairs`, so a
 * contract change and a document edit cannot land apart, in either direction.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairClasses,
  contrastPairs,
  invalidRingPairs,
  markPairs,
  markRoles,
  trackMarkPairs,
} from "./index.js";

/** A document read as one line, so a wrapped claim is not a substring. */
const prose = (url: URL): string =>
  readFileSync(url, "utf8").replaceAll(/\s+/g, " ");

const catalogue = prose(new URL("../../../docs/tokens.md", import.meta.url));
const rawCatalogue = readFileSync(
  new URL("../../../docs/tokens.md", import.meta.url),
  "utf8",
);
const designSystem = prose(
  new URL("../../../docs/design-system.md", import.meta.url),
);
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

/** The surfaces a role is painted on as a functional boundary. */
const boundarySurfacesOf = (role: string): ReadonlyArray<string> =>
  contrastPairs
    .filter(
      ([foreground, background, pairClass]) =>
        pairClass === "boundary" &&
        (foreground === role || background === role),
    )
    .map(([, background]) => background);

/** The claim both documents made before this plan. */
const claimsSolidsAreFillOnly = (text: string): boolean =>
  /The solid roles are fills, not foregrounds\./.test(text) ||
  /The solid roles are fills: light `warning`/.test(text);

/** The compositions that paint a solid role as a mark (plan 332). */
const markCompositions = [
  "progress segment",
  "thumb ring",
  "rating star",
  "timeline dot",
] as const;

const markFloor = `${contrastFloors.default.mark}:1`;
const highMarkFloor = `${contrastFloors.high.mark}:1`;
const markSurfaces = [
  ...new Set([...markSurfacesOf("success"), ...markSurfacesOf("destructive")]),
];
const ringSurfaces = invalidRingPairs.map(([, surface]) => surface);

describe("the solid status roles", () => {
  it("measures three of the four as marks and one as the invalid boundary", () => {
    expect(classesOf("success")).toEqual(["secondary", "mark", "surface"]);
    expect(classesOf("destructive")).toEqual([
      "secondary",
      "boundary",
      "mark",
      "surface",
      "step",
    ]);
    expect(classesOf("warning")).toEqual(["secondary", "surface"]);
    expect(classesOf("info")).toEqual(["secondary", "surface"]);
    expect([...markRoles]).toEqual(["primary", "success", "destructive"]);
  });

  it("names the five and the six mark surfaces", () => {
    expect(markSurfacesOf("success")).toEqual([
      "background",
      "card",
      "popover",
      "muted",
      "track",
    ]);
    expect(markSurfacesOf("destructive")).toEqual([
      "background",
      "card",
      "popover",
      "muted",
      "input",
      "track",
    ]);
    expect(markSurfacesOf("warning")).toEqual([]);
    expect(markSurfacesOf("info")).toEqual([]);
  });

  it("splits the invalid boundary into twelve rings and two field edges", () => {
    expect(ringSurfaces).toHaveLength(12);
    invalidRingPairs.forEach(([foreground, , pairClass]) => {
      expect(foreground).toBe("destructive");
      expect(pairClass).toBe("boundary");
    });
    expect(boundarySurfacesOf("destructive")).toEqual([
      ...ringSurfaces,
      "input",
      "background",
    ]);
  });

  it("names the split in the design system's status paragraph", () => {
    const paragraph = between(
      designSystem,
      "The four status families",
      "This keeps a brand theme small:",
    );

    expect(paragraph).toContain("markPairs");
    expect(paragraph).toContain("trackMarkPairs");
    expect(paragraph).toContain("invalidRingPairs");
    expect(paragraph).toContain("fill-only");
    expect(paragraph).toContain(markFloor);
    expect(paragraph).not.toContain("never the colour of text or a dot");
    markRoles.forEach((role) =>
      expect(paragraph, role).toContain(`\`${role}\``),
    );
    markCompositions.forEach((composition) =>
      expect(paragraph, composition).toContain(composition),
    );
  });

  it("names the mark job and the boundary in the catalogue's role summary", () => {
    const paragraph = between(
      catalogue,
      "There are 71 roles.",
      "A status panel's action is a family of its own:",
    );

    expect(paragraph).toContain("the value indicator");
    expect(paragraph).toContain("markPairs");
    expect(paragraph).toContain("trackMarkPairs");
    expect(paragraph).toContain("invalidRingPairs");
    expect(paragraph).toContain("the invalid boundary");
    expect(paragraph).toContain("fill-only");
    expect(paragraph).toContain(markFloor);
    markCompositions.forEach((composition) =>
      expect(paragraph, composition).toContain(composition),
    );
  });

  it("names every mark surface and both floors in the catalogue's rule paragraph", () => {
    const paragraph = between(
      catalogue,
      "The solid roles are fills and marks, never foregrounds.",
      "`xText` is the readable tonality",
    );

    markSurfaces.forEach((surface) =>
      expect(paragraph, surface).toContain(`\`${surface}\``),
    );
    expect(paragraph).toContain(markFloor);
    expect(paragraph).toContain(highMarkFloor);
    expect(paragraph).toContain("invalidRingPairs");
    expect(paragraph).toContain(markFloor);
    markCompositions
      .slice(0, 3)
      .forEach((composition) =>
        expect(paragraph, composition).toContain(composition),
      );
  });

  it("holds both colour tables to the mark claim, in both directions", () => {
    const rows = rawCatalogue.split("\n");
    /** A colour-table row: a role and its light and dark hex values. */
    const rowsFor = (role: string): ReadonlyArray<string> =>
      rows.filter((line) =>
        new RegExp(
          `^\\| \`${role}\` \\| \`#[0-9A-F]{6}\` \\| \`#[0-9A-F]{6}\` \\|`,
        ).test(line),
      );

    (["success", "destructive"] as const).forEach((role) => {
      const roleRows = rowsFor(role);
      expect(roleRows, role).toHaveLength(2);
      roleRows.forEach((row) => {
        expect(row, role).toContain("also the mark a progress segment");
        expect(row, role).toContain("rating star");
        expect(row, role).toContain("mark floor");
      });
    });

    (["info", "warning"] as const).forEach((role) => {
      const roleRows = rowsFor(role);
      expect(roleRows, role).toHaveLength(2);
      roleRows.forEach((row) => expect(row, role).not.toContain("mark"));
    });
  });

  it("carries the same jobs in every role's JSDoc", () => {
    const destructive = between(
      typeSource,
      "Destructive action background.",
      "Destructive action background while hovered.",
    );
    expect(destructive).toContain("markPairs");
    expect(destructive).toContain("trackMarkPairs");
    expect(destructive).toContain("invalidRingPairs");
    expect(destructive).toContain("invalid");

    const success = between(
      typeSource,
      "Success background,",
      "Text and icons on `success`.",
    );
    expect(success).toContain("markPairs");
    expect(success).toContain("trackMarkPairs");

    const warning = between(
      typeSource,
      "Warning background.",
      "Text and icons on `warning`.",
    );
    expect(warning).toContain("fill only");
    expect(warning).toContain("warningText");

    const info = between(
      typeSource,
      "Informational status fill",
      "Text and icons on `info`.",
    );
    expect(info).toContain("fill only");
    expect(info).toContain("infoText");
  });

  it("rejects the pre-810 claim everywhere, and the predicate can fail", () => {
    expect(
      claimsSolidsAreFillOnly(
        "The solid roles are fills, not foregrounds. Light `warning` …",
      ),
    ).toBe(true);
    expect(
      claimsSolidsAreFillOnly(
        "The solid roles are fills: light `warning` is 1.78:1 against the canvas, so it is never the colour of text or a dot.",
      ),
    ).toBe(true);
    expect(claimsSolidsAreFillOnly(catalogue)).toBe(false);
    expect(claimsSolidsAreFillOnly(designSystem)).toBe(false);
    expect(claimsSolidsAreFillOnly(readme)).toBe(false);
  });
});
