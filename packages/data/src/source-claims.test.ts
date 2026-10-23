/**
 * The package's own source keeps its claims true.
 *
 * Two comments outlived the work they described. `index.ts` sent a reader to
 * "plan 610 for the remaining phases" after every phase of that plan shipped,
 * and `columns/logic.ts` called frozen columns "plan 610's remaining
 * frozen-column row" after `FrozenTable` landed — the same claim the README
 * already had retracted. A reader of either file was told the package was
 * unfinished, and the next plan would have re-derived a frozen column that
 * already exists.
 *
 * The retraction is held here rather than in the README's suite because these
 * are source comments: `src/readme.test.ts` guards the consumer-facing claims,
 * and this guards the two module headers a contributor reads first.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const index = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
const columns = readFileSync(
  new URL("./columns/logic.ts", import.meta.url),
  "utf8",
);

describe("the package's source claims", () => {
  it("names the frozen composition that ships instead of a phase still to come", () => {
    // The component is the truth the prose has to agree with.
    expect(index).toContain("FrozenTable");
    expect(columns).toContain("FrozenTable");
    expect(index).not.toContain("plan 610 for the remaining phases");
    expect(columns).not.toContain("plan 610's remaining");
    expect(columns).not.toContain("frozen-column row owns it");
  });

  it("lists every subtree the root actually exports from", () => {
    // A shape list that stops at the controller would hide the tree, chart and
    // surface exports a consumer opens the file to find.
    expect(index).toContain("`tree/`");
    expect(index).toContain("`chart/`");
    expect(index).toContain("`surfaces/`");
  });
});
