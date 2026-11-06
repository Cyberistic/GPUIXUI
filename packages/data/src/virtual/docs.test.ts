import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const page = read("../../docs/virtualization.mdx");
const table = read("./table.tsx");
const list = read("./list.tsx");

interface Section {
  readonly heading: string;

  readonly props: ReadonlyArray<string>;
}

const fieldsOf = (source: string, type: string): ReadonlyArray<string> => {
  const body = new RegExp(
    `interface ${type} extends[^{]*\\{([\\s\\S]*?)\\n\\}`,
  ).exec(source);
  if (body?.[1] === undefined) throw new Error(`no ${type}`);
  return [...body[1].matchAll(/^ {2}readonly (\w+)\??:/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

const listModeProps = (): ReadonlyArray<string> => {
  const start = list.indexOf("export type VirtualListProps =");
  const end = list.indexOf("\n\n", start);
  if (start === -1 || end === -1) throw new Error("no VirtualListProps");
  const union = list.slice(start, end);
  return Arr.dedupe(
    [...union.matchAll(/readonly (\w+)\??:/g)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    ),
  );
};

const hostProps: ReadonlyArray<string> = ["aria-label", "style", "ref"];

const sections: ReadonlyArray<Section> = [
  {
    heading: "`VirtualList`",
    props: Arr.dedupe([
      ...fieldsOf(list, "VirtualListShared"),
      ...listModeProps(),
    ]),
  },
  { heading: "`VirtualTable`", props: fieldsOf(table, "VirtualTableProps") },
  {
    heading: "`VirtualTableBody`",
    props: fieldsOf(table, "VirtualTableBodyProps"),
  },
];

const sectionOf = (site: string, heading: string): string => {
  const start = site.indexOf(`### ${heading}\n`);
  if (start === -1) throw new Error(`no ${heading} section`);
  const body = site.slice(start + heading.length + 5);
  const next = body.search(/^#{2,3} /m);
  return next === -1 ? body : body.slice(0, next);
};

const documentedProps = (body: string): ReadonlyArray<string> =>
  [...body.matchAll(/^\| `([^`]+)` \|/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );

const undocumented = (section: Section): ReadonlyArray<string> =>
  Arr.map(
    Arr.filter(
      section.props,
      (prop) =>
        !documentedProps(sectionOf(page, section.heading)).includes(prop),
    ),
    (prop) => `${section.heading}: ${prop}`,
  );

const invented = (section: Section): ReadonlyArray<string> =>
  Arr.map(
    Arr.filter(
      documentedProps(sectionOf(page, section.heading)),
      (prop) => !section.props.includes(prop) && !hostProps.includes(prop),
    ),
    (prop) => `${section.heading}: ${prop}`,
  );

describe("the virtualization page's API tables", () => {
  it("documents every prop each part declares", () => {
    expect(sections).toHaveLength(3);
    expect(
      Arr.length(documentedProps(sectionOf(page, "`VirtualList`"))),
    ).toBeGreaterThan(9);

    expect(Arr.flatMap(sections, undocumented)).toEqual([]);
  });

  it("names only props the part takes", () => {
    expect(Arr.flatMap(sections, invented)).toEqual([]);
  });

  it("names the parts each table documents", () => {
    expect(Arr.map(sections, (section) => section.heading)).toEqual([
      "`VirtualList`",
      "`VirtualTable`",
      "`VirtualTableBody`",
    ]);
    expect(
      Arr.filter(
        sections,
        (section) =>
          Arr.length(documentedProps(sectionOf(page, section.heading))) === 0,
      ),
    ).toEqual([]);
  });
});
