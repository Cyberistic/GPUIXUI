import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { marksFor, sweptRanges } from "./highlight-text/logic.js";
import { washFor } from "./highlight-text/wash.js";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const page = read("../docs/highlight-text.mdx");

describe("the range rule the page teaches", () => {
  it("teaches the pair the entry points paint, not the one it was given", () => {
    expect(marksFor("native", { ranges: [[-1, 3]] })).toEqual([[0, 3]]);
    expect(marksFor("native", { ranges: [[1.5, 3.9]] })).toEqual([[1, 3]]);
    expect(marksFor("native", { ranges: [[0, 99]] })).toEqual([[0, 6]]);
    expect(
      marksFor("native", {
        ranges: [
          [Number.NaN, 4],
          [3, 3],
          [5, 2],
        ],
      }),
    ).toEqual([]);
    expect(
      sweptRanges(
        "native",
        [
          [Number.NaN, 4],
          [-1, 2],
        ],
        9,
      ),
    ).toEqual([[0, 2]]);

    expect(page).toContain("inside the phrase");
    expect(page).toContain("clamped to it");
    expect(page).toMatch(/truncated\s+to\s+the unit it names/);
    expect(page).toContain("no range at all");
    expect(page).toContain("indexOf` answers `-1` for no match");
  });

  it("keeps the units and the precedence the API row declares", () => {
    expect(page).toContain("UTF-16 units");
    expect(page).toMatch(/wins\s+over `query`/);
    expect(Str.includes("| `ranges` |")(page)).toBe(true);
  });
});

describe("the wash a truncated theme hands over", () => {
  const component = read("./highlight-text.tsx");
  const seam = read("./highlight-text/wash.ts");

  it("leaves the host its own wash", () => {
    expect(washFor({}, {}, 1)).toBeUndefined();
    expect(seam).toContain("if (derived === undefined) return undefined;");
    expect(component).toContain("wash === undefined");
    expect(component).toContain("? { ranges: marksOnHost }");
    expect(component).toContain("{ ranges: marksOnHost, ...wash }");
  });
});
