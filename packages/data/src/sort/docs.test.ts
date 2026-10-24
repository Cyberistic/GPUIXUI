/**
 * The sorting page's API table, held to the props the header declares.
 *
 * The bug this guards: `docs/table-sorting.mdx` is the page a consumer reads
 * for `TableSortHeader`, and nothing tied its rows to the type. The page listed
 * ten of the eleven props — `testId` was missing — so the one handle a
 * behaviour test or an app locates the header by was undocumented while every
 * suite stayed green. The reader fails by name in both directions: a prop the
 * type gains without a row, and a row the type does not declare.
 *
 * `node:fs` is test-only, the shape `columns/docs.test.ts` uses: this checks
 * the repository's Markdown from a plain vitest suite.
 */

import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const page = read("../../docs/table-sorting.mdx");
const header = read("./header.tsx");

/** The fields `TableSortHeaderShape` declares, in source order. */
const shapeProps = (source: string): ReadonlyArray<string> => {
  const body = /interface TableSortHeaderShape \{([\s\S]*?)\n\}/.exec(source);
  if (body?.[1] === undefined) throw new Error("no TableSortHeaderShape");
  return [...body[1].matchAll(/^ {2}readonly (\w+)\??:/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

/** The props the page's table documents for `TableSortHeader`. */
const documentedProps = (source: string): ReadonlyArray<string> =>
  Arr.dedupe(
    [...source.matchAll(/^\| `TableSortHeader` \| `([^`]+)` \|/gm)].flatMap(
      (match) => (match[1] === undefined ? [] : [match[1]]),
    ),
  );

/** The callbacks the props type adds beside the shape, one union member each. */
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
