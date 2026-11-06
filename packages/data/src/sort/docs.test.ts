import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const page = read("../../docs/table-sorting.mdx");
const header = read("./header.tsx");

const shapeProps = (source: string): ReadonlyArray<string> => {
  const body = /interface TableSortHeaderShape \{([\s\S]*?)\n\}/.exec(source);
  if (body?.[1] === undefined) throw new Error("no TableSortHeaderShape");
  return [...body[1].matchAll(/^ {2}readonly (\w+)\??:/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

const documentedProps = (source: string): ReadonlyArray<string> =>
  Arr.dedupe(
    [...source.matchAll(/^\| `TableSortHeader` \| `([^`]+)` \|/gm)].flatMap(
      (match) => (match[1] === undefined ? [] : [match[1]]),
    ),
  );

const callbacks = ["onSort", "onSortPress"] as const;

describe("the sorting page's API table", () => {
  it("documents every prop TableSortHeader declares", () => {
    const declared = shapeProps(header);
    expect(declared.length).toBeGreaterThan(8);

    const documented = documentedProps(page);
    expect(Arr.filter(declared, (prop) => !documented.includes(prop))).toEqual(
      [],
    );
    expect(Arr.filter(callbacks, (prop) => !documented.includes(prop))).toEqual(
      [],
    );
  });

  it("names only props the header takes", () => {
    const declared: ReadonlyArray<string> = [
      ...shapeProps(header),
      ...callbacks,
    ];
    expect(
      Arr.filter(documentedProps(page), (prop) => !declared.includes(prop)),
    ).toEqual([]);
  });
});
