/**
 * The selection page's API tables, held to the props the two boxes declare.
 *
 * The bug this guards: `docs/table-selection.mdx` documented the two boxes in
 * one merged table, so a consumer could not tell which component takes
 * `indeterminate` (the header's partial set), which requires a `label` (the
 * row's, for the record it names) or which one the page was describing at all —
 * neither `TableSelectionHeader` nor `TableSelectionCell` appeared in its API.
 * The page now carries one table per box, and this suite fails by name in both
 * directions: a declared prop with no row, and a row neither type declares.
 *
 * `node:fs` is test-only, the shape `sort/docs.test.ts` uses: this checks the
 * repository's Markdown from a plain vitest suite.
 */

import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const page = read("../../docs/table-selection.mdx");
const source = read("./column.tsx");

/** The two boxes the page must document, and the type behind each table. */
const sections = [
  { heading: "`TableSelectionHeader`", type: "TableSelectionHeaderProps" },
  { heading: "`TableSelectionCell`", type: "TableSelectionCellProps" },
] as const;

/** The text under one `###` heading, up to the next heading at its level. */
const sectionOf = (site: string, heading: string): string => {
  const start = site.indexOf(`### ${heading}\n`);
  if (start === -1) throw new Error(`no ${heading} section`);
  const body = site.slice(start + heading.length + 5);
  const next = body.search(/^#{2,3} /m);
  return next === -1 ? body : body.slice(0, next);
};

/** The fields one props interface declares, in source order. */
const declaredProps = (type: string): ReadonlyArray<string> => {
  const body = new RegExp(
    `export interface ${type} \\{([\\s\\S]*?)\\n\\}`,
  ).exec(source);
  if (body?.[1] === undefined) throw new Error(`no ${type}`);
  return [...body[1].matchAll(/^ {2}readonly (\w+)\??:/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

/** The props one section's table documents, in page order. */
const documentedProps = (body: string): ReadonlyArray<string> =>
  [...body.matchAll(/^\| `([^`]+)` \|/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );

/** Every declared prop a section leaves without a row, named by section. */
const undocumented = (
  section: (typeof sections)[number],
): ReadonlyArray<string> => {
  const documented = documentedProps(sectionOf(page, section.heading));
  return Arr.map(
    Arr.filter(
      declaredProps(section.type),
      (prop) => !documented.includes(prop),
    ),
    (prop) => `${section.heading}: ${prop}`,
  );
};

/** Every row naming a prop the section does not declare. */
const invented = (
  section: (typeof sections)[number],
): ReadonlyArray<string> => {
  const declared = declaredProps(section.type);
  return Arr.map(
    Arr.filter(
      documentedProps(sectionOf(page, section.heading)),
      (prop) => !declared.includes(prop),
    ),
    (prop) => `${section.heading}: ${prop}`,
  );
};

describe("the selection page's API tables", () => {
  it("documents every prop each box declares", () => {
    expect(Arr.flatMap(sections, undocumented)).toEqual([]);
  });

  it("names only props the box takes", () => {
    expect(Arr.flatMap(sections, invented)).toEqual([]);
  });

  it("keeps the header's partial state out of the row's table", () => {
    const header = documentedProps(sectionOf(page, "`TableSelectionHeader`"));
    const row = documentedProps(sectionOf(page, "`TableSelectionCell`"));

    expect(header).toContain("indeterminate");
    expect(row).not.toContain("indeterminate");
    expect(row.length).toBeGreaterThan(4);
  });
});
