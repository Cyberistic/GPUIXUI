/**
 * Guards the offscreen `data-tree-core` scenario against the ids the shipped
 * tree example prints.
 *
 * The bug this holds shut: `220d23ae8` renamed the example's readout from
 * `tree-readout` to `data-tree-readout` so a batched live window could not read
 * the windowed tree's screen as this one's, and the offscreen scenario kept the
 * old id — it read `""` and failed `the tree paints its roots and one open
 * folder` on master. The scenario now reads the ids the fixture names, and this
 * file fails if a literal spelling comes back.
 *
 * `node:fs` is deliberate, as in `live/data-tree.test.ts`: the check is over the
 * repository's own TypeScript, not a runtime path.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DATA_TREE_READOUT,
  DATA_TREE_REVEAL,
  DATA_TREE_ROWS_ALL,
  dataTreeRow,
} from "../live/data-tree.js";

const scenario = readFileSync(
  new URL("./data-tree.tsx", import.meta.url),
  "utf8",
);
const example = readFileSync(
  new URL(
    "../../../../packages/data/examples/tree.example.tsx",
    import.meta.url,
  ),
  "utf8",
);

/** The test id the example's readout `<text>` declares. */
const exampleReadout = (): string =>
  /testId="([^"]+)"\s*\n\s*style=\{\{\s*\n\s*\.\.\.textStyle\(theme, "caption"\)/.exec(
    example,
  )?.[1] ?? "";

describe("the offscreen data-tree scenario", () => {
  it("reads the readout the shipped example prints", () => {
    expect(exampleReadout()).toBe(DATA_TREE_READOUT);
    expect(scenario).toContain("text(ctx, DATA_TREE_READOUT)");
    // `tree-readout` is the windowed tree's id now: reading it here would answer
    // the other probe's screen in a batched run, and `""` in this one.
    expect(scenario).not.toContain('"tree-readout"');
  });

  it("derives every row id from the tree's own id", () => {
    expect(scenario).toContain('dataTreeRow("readme.md")');
    // A hand-written row id drifts from `TreeView`'s `${testId}-row-${key}`.
    expect(scenario).not.toContain('"tree-row-');
    expect(dataTreeRow("src")).toBe("tree-row-src");
  });

  it("derives the readout lines the example prints", () => {
    expect(scenario).toContain("dataTreeReadout");
    expect(scenario).toContain("DATA_TREE_ROWS_ALL");
    expect(scenario).toContain("DATA_TREE_INITIAL");
    // The reveal action and the deep row are the fixture's, not a copy.
    expect(scenario).toContain("DATA_TREE_REVEAL");
    expect(example).toContain(`"${DATA_TREE_REVEAL}"`);
    expect(scenario).toContain('dataTreeRow("row.tsx")');
    expect(DATA_TREE_ROWS_ALL).toBe(11);
  });
});
