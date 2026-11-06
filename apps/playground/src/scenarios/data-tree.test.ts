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

const exampleReadout = (): string =>
  /testId="([^"]+)"\s*\n\s*style=\{\{\s*\n\s*\.\.\.textStyle\(theme, "caption"\)/.exec(
    example,
  )?.[1] ?? "";

describe("the offscreen data-tree scenario", () => {
  it("reads the readout the shipped example prints", () => {
    expect(exampleReadout()).toBe(DATA_TREE_READOUT);
    expect(scenario).toContain("text(ctx, DATA_TREE_READOUT)");

    expect(scenario).not.toContain('"tree-readout"');
  });

  it("derives every row id from the tree's own id", () => {
    expect(scenario).toContain('dataTreeRow("readme.md")');

    expect(scenario).not.toContain('"tree-row-');
    expect(dataTreeRow("src")).toBe("tree-row-src");
  });

  it("derives the readout lines the example prints", () => {
    expect(scenario).toContain("dataTreeReadout");
    expect(scenario).toContain("DATA_TREE_ROWS_ALL");
    expect(scenario).toContain("DATA_TREE_INITIAL");

    expect(scenario).toContain("DATA_TREE_REVEAL");
    expect(example).toContain(`"${DATA_TREE_REVEAL}"`);
    expect(scenario).toContain('dataTreeRow("row.tsx")');
    expect(DATA_TREE_ROWS_ALL).toBe(11);
  });
});
