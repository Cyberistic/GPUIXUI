import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const page = read("../../docs/table-selection.mdx");
const source = read("./column.tsx");

const sections = [
  { heading: "`TableSelectionHeader`", type: "TableSelectionHeaderProps" },
  { heading: "`TableSelectionCell`", type: "TableSelectionCellProps" },
] as const;

const sectionOf = (site: string, heading: string): string => {
  const start = site.indexOf(`### ${heading}\n`);
  if (start === -1) throw new Error(`no ${heading} section`);
  const body = site.slice(start + heading.length + 5);
  const next = body.search(/^#{2,3} /m);
  return next === -1 ? body : body.slice(0, next);
};

const declaredProps = (type: string): ReadonlyArray<string> => {
  const body = new RegExp(
    `export interface ${type} \\{([\\s\\S]*?)\\n\\}`,
  ).exec(source);
  if (body?.[1] === undefined) throw new Error(`no ${type}`);
  return [...body[1].matchAll(/^ {2}readonly (\w+)\??:/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

const documentedProps = (body: string): ReadonlyArray<string> =>
  [...body.matchAll(/^\| `([^`]+)` \|/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );

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
