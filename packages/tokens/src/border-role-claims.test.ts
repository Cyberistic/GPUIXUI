/**
 * Guards the defect plan 815 fixed: `border` and `borderStrong` are documented
 * as a floor plus a fill list, and the three present-tense passages that state
 * them quoted four floor figures (1.05:1 / 3:1 for the decorative divider,
 * 3:1 / 4.5:1 for the functional boundary) and two count words (the eight
 * control fills, the four soft status fills) that no test read — changing any
 * of them left all 7121 tests green. `docs.test.ts` holds §7's enumerations and
 * the `borderStrong` surface list, but not the numbers or the counts, so a
 * `contrastFloors` edit or a ninth control fill could leave every page quoting
 * the old value. The catalogue's role introduction was also wrong: it named six
 * of the eight fills `controlFillRoles` measures and omitted the toggle's
 * `accentHover`/`accentActive` pointer states, which the same page's
 * Verification paragraph names.
 *
 * `node:fs` is deliberate: this is a documentation test over the tree's own
 * pages, and the package ships zero runtime dependencies by design.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastFloors, contrastPairs, controlFillRoles } from "./contrast.js";
import { statusTones } from "./styles.js";

const read = (path: string, from: string): string =>
  readFileSync(new URL(path, from), "utf8").replace(/\s+/g, " ");

const here = import.meta.url;

const catalogue = read("../../../docs/tokens.md", here);
const designSystem = read("../../../docs/design-system.md", here);
const readme = read("../README.md", here);

/**
 * The slice between two markers. A moved paragraph fails with the slice's name
 * rather than passing on an empty string.
 */
const between = (text: string, start: string, end: string): string => {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from);
  if (from === -1 || to === -1) {
    throw new Error(`no slice from ${JSON.stringify(start)}`);
  }
  return text.slice(from, to);
};

const catalogueIntro = between(
  catalogue,
  "`border` is decorative; `borderStrong` is the essential",
  "There are 71 roles",
);
const catalogueVerify = between(
  catalogue,
  "if a decorative `border` is imperceptible",
  "Each soft surface also has a role for its edge",
);
const designBorder = between(
  designSystem,
  "- `border` is decorative",
  "- `borderStrong` is functional",
);
const designStrong = between(
  designSystem,
  "- `borderStrong` is functional",
  "Elevation is a semantic level",
);
const readmeBorder = between(
  readme,
  "the decorative `border` at",
  "outline action sits on in a selected row",
);

const floor = (
  level: "default" | "high",
  pairClass: "divider" | "boundary",
): string => `${contrastFloors[level][pairClass]}:1`;

const countWord = (count: number): string =>
  "zero one two three four five six seven eight nine ten".split(" ")[count] ??
  String(count);

const namesEveryFill = (text: string): void => {
  controlFillRoles.forEach((role) => {
    expect(text, role).toContain(`\`${role}\``);
  });
};

describe("docs border role floors and fills", () => {
  it("is the contract the pages describe", () => {
    expect(controlFillRoles).toHaveLength(8);
    expect(contrastFloors.default.divider).toBe(1.05);
    expect(contrastFloors.high.divider).toBe(3);
    expect(contrastFloors.default.boundary).toBe(3);
    expect(contrastFloors.high.boundary).toBe(4.5);

    controlFillRoles.forEach((role) => {
      expect(contrastPairs, role).toContainEqual(["border", role, "divider"]);
    });
    statusTones.forEach((tone) => {
      expect(contrastPairs, tone).toContainEqual([
        "border",
        `${tone}Soft`,
        "divider",
      ]);
    });
  });

  it("states the decorative border's two floors in every passage", () => {
    const divider = floor("default", "divider");
    const dividerHigh = floor("high", "divider");

    expect(designBorder).toContain(
      `held to a ${divider} perceivability floor (${dividerHigh} at high contrast)`,
    );
    expect(catalogueVerify).toContain(
      `(${divider}, and ${dividerHigh} at high contrast)`,
    );
    expect(readmeBorder).toContain(
      `at ${divider} (${dividerHigh} at high contrast)`,
    );
  });

  it("states the functional boundary's two floors", () => {
    const boundary = floor("default", "boundary");
    const boundaryHigh = floor("high", "boundary");

    expect(catalogueIntro).toContain(
      `to ${boundary} (${boundaryHigh} at high contrast)`,
    );
    expect(designStrong).toContain(
      `It meets ${boundary} (${boundaryHigh} at high contrast)`,
    );
  });

  it("names every fill a bordered control paints", () => {
    [catalogueIntro, catalogueVerify, designBorder, readmeBorder].forEach(
      namesEveryFill,
    );
    // Plan 327 added these two, and the catalogue's introduction omitted them.
    expect(catalogueIntro).toContain("`accentHover`");
    expect(catalogueIntro).toContain("`accentActive`");
  });

  it("states the count words the lists own", () => {
    const fills = countWord(controlFillRoles.length);

    expect(designBorder).toContain(`those ${fills} fills`);
    expect(designBorder).toContain(
      `those ${countWord(statusTones.length)} fills carry the same floor`,
    );
    expect(catalogueIntro).toContain(`those ${fills} fills too`);
    expect(catalogueVerify).toContain(`the ${fills} fills a bordered control`);
  });

  it("detects the six-fill sentence it replaced", () => {
    const namesSix = (text: string): boolean =>
      text.includes("and `accent` for an outline toggle that is on") &&
      !text.includes("`accentHover`");

    expect(
      namesSix(
        "and `accent` for an outline toggle that is on — so the divider is held to its floor on those fills too",
      ),
    ).toBe(true);
    expect(namesSix(catalogueIntro)).toBe(false);
  });
});
