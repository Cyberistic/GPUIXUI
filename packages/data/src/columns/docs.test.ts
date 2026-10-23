/**
 * The column page's API tables, held to the props the types declare.
 *
 * The bug this guards: `docs/column-configuration.mdx` is the only page a
 * consumer reads for `ColumnMenu`, `TableColumnDivider` and `useColumns`, and
 * nothing tied its tables to the interfaces. A prop added to a type left the
 * page teaching an older API (a reader writes a prop the component ignores),
 * and a row removed from a table left the prop undocumented with every suite
 * green. The reader is deliberately small — these three interfaces are flat —
 * and it fails by name in both directions.
 *
 * `node:fs` is test-only, the shape `readme.test.ts` uses: this checks the
 * repository's Markdown from a plain vitest suite.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const page = read("../../docs/column-configuration.mdx");
const menu = read("./menu.tsx");
const divider = read("./divider.tsx");
const controller = read("./use-columns.ts");

/** The flat `readonly` fields an exported interface declares. */
const declaredProps = (source: string, name: string): ReadonlyArray<string> => {
  const body = new RegExp(
    `export interface ${name} \\{([\\s\\S]*?)\\n\\}`,
  ).exec(source)?.[1];
  if (body === undefined) throw new Error(`no ${name} interface`);
  return [...body.matchAll(/^ {2}readonly (\w+)\??:/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

/**
 * The props one heading's table documents: every backticked token in the first
 * cell, in source order.
 *
 * A row may document several props at once (`widthOf` / `offsetOf` /
 * `isVisible`), so the cell is split rather than read as one name.
 */
const documentedProps = (
  source: string,
  heading: string,
): ReadonlyArray<string> => {
  const section = new RegExp(
    `^### \`${heading}\`\\n([\\s\\S]*?)(?=^#{2,3} |$(?![\\s\\S]))`,
    "m",
  ).exec(source)?.[1];
  if (section === undefined) throw new Error(`no ${heading} section`);
  return Arr.dedupe(
    [...section.matchAll(/^\| (.+?) \|/gm)].flatMap((row) =>
      [...(row[1] ?? "").matchAll(/`([^`]+)`/g)].flatMap((cell) =>
        (cell[1] ?? "").split(" / ").map((name) => name.trim()),
      ),
    ),
  );
};

/** A page table against its interface, failing with the symmetric difference. */
const undocumented = (
  source: string,
  name: string,
  heading: string,
): ReadonlyArray<string> => {
  const declared = declaredProps(source, name);
  const documented = documentedProps(page, heading);
  return Arr.dedupe([
    ...Arr.filter(declared, (prop) => !documented.includes(prop)),
    ...Arr.filter(documented, (prop) => !declared.includes(prop)),
  ]);
};

describe("the column page's API tables", () => {
  it("documents every prop ColumnMenu declares", () => {
    expect(declaredProps(menu, "ColumnMenuProps").length).toBeGreaterThan(5);
    expect(undocumented(menu, "ColumnMenuProps", "ColumnMenu")).toEqual([]);
  });

  it("documents every prop TableColumnDivider declares", () => {
    expect(
      declaredProps(divider, "TableColumnDividerProps").length,
    ).toBeGreaterThan(5);
    expect(
      undocumented(divider, "TableColumnDividerProps", "TableColumnDivider"),
    ).toEqual([]);
  });

  it("documents every field the column controller answers", () => {
    expect(
      declaredProps(controller, "ColumnController").length,
    ).toBeGreaterThan(10);
    expect(undocumented(controller, "ColumnController", "useColumns")).toEqual(
      [],
    );
  });
});
