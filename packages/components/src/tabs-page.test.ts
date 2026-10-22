/**
 * The Tabs page's measurement claim, held to the probe it documents.
 *
 * The bug these guard: `docs/tabs.mdx` still called `tabs-origin` a **1×1**
 * swatch, while the component had already moved it to fill the rail's padding
 * box. A 1×1 probe's own box never changes when the rail moves, and the runtime
 * only reports a layout it can see change, so it never reported the origin again
 * after the rail travelled — a trigger that re-measured then placed the pill at
 * the rail it *used* to start at. The behaviour suite measured that (the pill
 * 120px off its tab), so a page teaching the swatch explains neither the fix nor
 * why the pill keeps its place.
 *
 * `node:fs` is a test-time repository read, the boundary the package's other
 * page suites already use.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const page = readFileSync(
  fileURLToPath(new URL("../docs/tabs.mdx", import.meta.url)),
  "utf8",
);

const source = readFileSync(
  fileURLToPath(new URL("./tabs.tsx", import.meta.url)),
  "utf8",
);

/** The page with its line wraps collapsed, so a sentence is one string. */
const prose = page.replace(/\s+/g, " ");

/** The `tabs-origin` probe's JSX, up to the element that closes it. */
const probe = (): string => {
  const start = source.indexOf('testId="tabs-origin"');
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf("/>", start);
  return source.slice(start, end);
};

describe("the Tabs page", () => {
  it("teaches the probe that fills the rail, not the 1×1 swatch", () => {
    // The premise: the retracted word is what the old page said, and the source
    // paints the probe across the whole box rather than in one corner.
    expect(page).not.toContain("1×1");
    const element = probe();
    expect(element).toContain("left: 0");
    expect(element).toContain("top: 0");
    expect(element).toContain("right: 0");
    expect(element).toContain("bottom: 0");

    expect(prose).toContain("fills the rail's padding box");
    expect(prose).toContain("only reports a layout it can see change");
  });

  it("says both boxes come from the same paint and names the measured case", () => {
    expect(prose).toContain("Both boxes are **window coordinates**");
    expect(prose).toContain("from the same paint");
    expect(prose).toContain(
      "follows the rail when the window moves it, not the origin it first reported",
    );
  });
});
