/**
 * The five surface pages' API tables, held to the props their types declare.
 *
 * The bug this guards: `key-value`, `stat-card`, `property-panel`,
 * `data-toolbar` and `advanced-filter` are the only pages a consumer reads for
 * these components, and nothing tied their tables to the interfaces. Measured
 * while writing this guard: every one of the five components' `className` was
 * undocumented, and **three nested shapes had no table at all** — a toolbar's
 * `ToolbarSearch` (so the only route to `debounceMs`, the behaviour the
 * component exists for, was the source), a key-value `KeyValueEntry`, a
 * statistic card's `StatTrend`, a property row and a filter's
 * `AdvancedFilterField`. A prop added to a type left the page teaching an older
 * API (a reader writes a prop the component ignores), and a row removed from a
 * table left the prop undocumented with every suite green.
 *
 * The reader is deliberately small — these interfaces are flat — and it fails
 * by name in both directions. A union (`PropertyRow`) is read as the fields of
 * its members, so the two row kinds share one table.
 *
 * `node:fs` is test-only, the shape `readme.test.ts` and the sibling
 * `columns/docs.test.ts` use: this checks the repository's Markdown from a
 * plain vitest suite.
 */

import * as Arr from "effect/Array";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** One page, the types it documents and the heading each table sits under. */
interface PageClaim {
  readonly page: string;
  readonly source: string;
  readonly types: ReadonlyArray<string>;
  readonly heading: string;
}

const claims: ReadonlyArray<PageClaim> = [
  {
    page: "key-value.mdx",
    source: "./key-value.tsx",
    types: ["KeyValueProps"],
    heading: "KeyValue",
  },
  {
    page: "key-value.mdx",
    source: "./key-value.tsx",
    types: ["KeyValueEntry"],
    heading: "KeyValueEntry",
  },
  {
    page: "stat-card.mdx",
    source: "./stat-card.tsx",
    types: ["StatCardProps"],
    heading: "StatCard",
  },
  {
    page: "stat-card.mdx",
    source: "./stat-card.tsx",
    types: ["StatTrend"],
    heading: "StatTrend",
  },
  {
    page: "property-panel.mdx",
    source: "./property-panel.tsx",
    types: ["PropertyPanelProps"],
    heading: "PropertyPanel",
  },
  {
    page: "property-panel.mdx",
    source: "./property-panel.tsx",
    types: ["ReadonlyPropertyRow", "EditablePropertyRow"],
    heading: "PropertyRow",
  },
  {
    page: "data-toolbar.mdx",
    source: "./toolbar.tsx",
    types: ["DataToolbarProps"],
    heading: "DataToolbar",
  },
  {
    page: "data-toolbar.mdx",
    source: "./toolbar.tsx",
    types: ["ToolbarSearch"],
    heading: "ToolbarSearch",
  },
  {
    page: "advanced-filter.mdx",
    source: "./advanced-filter.tsx",
    types: ["AdvancedFilterProps"],
    heading: "AdvancedFilter",
  },
  {
    page: "advanced-filter.mdx",
    source: "./advanced-filter.tsx",
    types: ["AdvancedFilterField"],
    heading: "AdvancedFilterField",
  },
];

/** The flat `readonly` fields an exported interface declares. */
const declaredProps = (source: string, name: string): ReadonlyArray<string> => {
  const body = new RegExp(
    `export interface ${name}(?:\\s+extends[^{]*)?\\s*\\{([\\s\\S]*?)\\n\\}`,
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
 * The section ends at the next heading of the same or a higher level, so a
 * nested shape's table is not counted as part of the component's.
 */
const documentedProps = (
  page: string,
  heading: string,
): ReadonlyArray<string> => {
  const section = new RegExp(
    `^### \`${heading}\`\\n([\\s\\S]*?)(?=^#{2,3} |$(?![\\s\\S]))`,
    "m",
  ).exec(page)?.[1];
  if (section === undefined) throw new Error(`no ${heading} section`);
  return Arr.dedupe(
    [...section.matchAll(/^\| (.+?) \|/gm)].flatMap((match) =>
      [...(match[1] ?? "").matchAll(/`([^`]+)`/g)].flatMap((cell) =>
        (cell[1] ?? "").split(" / ").map((name) => name.trim()),
      ),
    ),
  );
};

/** One page's table against its types, failing with the symmetric difference. */
const undocumented = (claim: PageClaim): ReadonlyArray<string> => {
  const page = read(`../../docs/${claim.page}`);
  const source = read(claim.source);
  const declared = Arr.dedupe(
    Arr.flatMap(claim.types, (name) => declaredProps(source, name)),
  );
  const documented = documentedProps(page, claim.heading);
  return Arr.dedupe([
    ...Arr.filter(declared, (prop) => !documented.includes(prop)),
    ...Arr.filter(documented, (prop) => !declared.includes(prop)),
  ]);
};

describe("the surface pages' API tables", () => {
  it("documents every prop each component declares", () => {
    const stale = claims.filter(
      (claim) => !claim.heading.endsWith("Props") && undocumented(claim).length,
    );
    expect(
      stale.map(
        (claim) => `${claim.heading}: ${undocumented(claim).join(", ")}`,
      ),
    ).toEqual([]);
  });

  it("documents every field of every nested shape", () => {
    const nested = claims.filter(
      (claim) =>
        claim.heading.endsWith("Entry") ||
        claim.heading === "StatTrend" ||
        claim.heading === "PropertyRow" ||
        claim.heading === "ToolbarSearch" ||
        claim.heading === "AdvancedFilterField",
    );
    // A list that stopped naming the nested shapes must not pass: each of the
    // five is a shape a caller writes by hand.
    expect(nested).toHaveLength(5);
    const stale = nested.filter((claim) => undocumented(claim).length);
    expect(
      stale.map(
        (claim) => `${claim.heading}: ${undocumented(claim).join(", ")}`,
      ),
    ).toEqual([]);
  });

  it("reads a real interface and a real table, so a silent reader cannot pass", () => {
    // The premise both cases rest on: the reader finds the props a type
    // declares, and the page's own rows.
    expect(declaredProps(read("./toolbar.tsx"), "ToolbarSearch")).toContain(
      "debounceMs",
    );
    expect(
      documentedProps(read("../../docs/data-toolbar.mdx"), "ToolbarSearch"),
    ).toContain("debounceMs");
  });
});
