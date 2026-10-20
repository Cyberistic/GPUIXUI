/**
 * Guards the defect plan 817 fixed: `docs/design-system.md` §8's state table
 * quotes the class floor for seven states — `hover` and `loading` at the
 * surface floor, `selected` at the step floor, `unchecked` and `status` at the
 * surface floor, `disabled` at the inactive pair and `invalid` at the boundary
 * pair — and three passages state the library's one non-WCAG floor, the
 * `inactive` pair. None of those figures was owned: mutating any of them, or
 * moving the corresponding `contrastFloors` entry, left all 219 files and 7127
 * tests green, because the §9 table is derived while the §8 vocabulary beside it
 * is prose. The library ships the safest floors in the package and the page
 * argues for them; the argument must fail when the contract moves.
 *
 * `node:fs` is deliberate: this is a documentation test over the tree's own
 * pages, and the package ships zero runtime dependencies by design.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairClasses,
  type ContrastPairClass,
} from "./contrast.js";

const here = import.meta.url;

const prose = (path: string): string =>
  readFileSync(new URL(path, here), "utf8").replace(/\s+/g, " ");

const designSystem = prose("../../../docs/design-system.md");
const readme = prose("../README.md");

const between = (text: string, start: string, end: string): string => {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from);
  if (from === -1 || to === -1) {
    throw new Error(`no slice from ${JSON.stringify(start)}`);
  }
  return text.slice(from, to);
};

const floor = (
  level: "default" | "high",
  pairClass: ContrastPairClass,
): string => `${contrastFloors[level][pairClass]}:1`;

const row = (state: string, next: string): string =>
  between(designSystem, `| ${state} |`, next);

const states = {
  hover: row("hover", "| pressed |"),
  loading: row("loading", "| selected |"),
  selected: row("selected", "| unchecked |"),
  unchecked: row("unchecked", "| link |"),
  disabled: row("disabled", "| invalid |"),
  invalid: row("invalid", "| focus |"),
  status: row("status", "Find highlighting is"),
} as const;

const inactivePair = `(${floor("default", "inactive")}, ${floor("high", "inactive")} at AAA)`;
const boundaryPair = `(${floor("default", "boundary")}, ${floor("high", "boundary")} at AAA)`;

const designInactive = between(
  designSystem,
  "An inactive control is not an opacity composite",
  "A filled primary action at 50% opacity",
);
const designRationale = between(
  designSystem,
  "The inactive state is measured too",
  "The `disabled` fill is held like any other fill",
);
const readmeInactive = between(
  readme,
  "The inactive state is measured too",
  "A disabled field keeps its own",
);

describe("documented state floors", () => {
  it("is the floor set the classes own", () => {
    expect(contrastPairClasses).toEqual(
      expect.arrayContaining(["surface", "step", "inactive", "boundary"]),
    );
    expect(floor("default", "surface")).toBe("1.05:1");
    expect(floor("high", "surface")).toBe("1.05:1");
    expect(floor("default", "step")).toBe("1.05:1");
    expect(floor("high", "step")).toBe("1.05:1");
    expect(floor("default", "inactive")).toBe("3:1");
    expect(floor("high", "inactive")).toBe("4.5:1");
    expect(floor("default", "boundary")).toBe("3:1");
    expect(floor("high", "boundary")).toBe("4.5:1");
  });

  it("states each state row's class floor", () => {
    const surface = floor("default", "surface");

    expect(states.hover).toContain(
      `held to the ${surface} perceivability floor`,
    );
    expect(states.loading).toContain(
      `held to the ${surface} perceivability floor`,
    );
    expect(states.selected).toContain(
      `one ${floor("default", "step")} step past`,
    );
    expect(states.unchecked).toContain(
      `held to ${surface} on the four plain surfaces`,
    );
    expect(states.status).toContain(`held to ${surface} on the nine surfaces`);
    expect(states.disabled).toContain(inactivePair);
    expect(states.invalid).toContain(boundaryPair);
  });

  it("states the inactive floor from the same numbers", () => {
    expect(designInactive).toContain(`readable dim ${inactivePair}`);
    expect(designRationale).toContain(
      `requires ${floor("default", "inactive")} for a disabled label (${floor("high", "inactive")} at AAA)`,
    );
    expect(readmeInactive).toContain(
      `holds \`disabledForeground\` to ${floor("default", "inactive")} (${floor("high", "inactive")} at AAA)`,
    );
  });
});
