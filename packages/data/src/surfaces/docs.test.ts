/**
 * The five surface pages' API tables, held to the props their types declare.
 *
 * The bug this guards: `key-value`, `stat-card`, `property-panel`,
 * `data-toolbar` and `advanced-filter` are the only pages a consumer reads for
 * these components, and nothing tied their tables to the interfaces. Measured
 * while writing this guard: every one of the five components' `className` was
 * undocumented, and **five nested shapes had no table at all** — a toolbar's
 * `ToolbarSearch` (so the only route to `debounceMs`, the behaviour the
 * component exists for, was the source), a key-value `KeyValueEntry`, a
 * statistic card's `StatTrend`, a property row and a filter's
 * `AdvancedFilterField`. A prop added to a type left the page teaching an older
 * API (a reader writes a prop the component ignores), and a row removed from a
 * table left the prop undocumented with every suite green.
 *
 * The reader is {@link undocumentedProps} — shared with the pages that
 * document a tree, an expandable row, a frozen grid and the windowed tree, so
 * there is one rule for the whole lane.
 *
 * `node:fs` is test-only, the shape `readme.test.ts` and the sibling
 * `columns/docs.test.ts` use: this checks the repository's Markdown from a
 * plain vitest suite.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  declaredProps,
  documentedProps,
  undocumentedProps,
  type PageClaim,
} from "../internal/docs.js";

const readPage = (file: string): string =>
  readFileSync(new URL(`../../docs/${file}`, import.meta.url), "utf8");

const readSource = (file: string): string =>
  readFileSync(new URL(file, import.meta.url), "utf8");

/** The page of each component, in the shape {@link undocumentedProps} reads. */
const claims: ReadonlyArray<PageClaim> = [
  {
    page: "key-value.mdx",
    types: [{ source: "./key-value.tsx", name: "KeyValueProps" }],
    heading: "KeyValue",
  },
  {
    page: "key-value.mdx",
    types: [{ source: "./key-value.tsx", name: "KeyValueEntry" }],
    heading: "KeyValueEntry",
  },
  {
    page: "stat-card.mdx",
    types: [{ source: "./stat-card.tsx", name: "StatCardProps" }],
    heading: "StatCard",
  },
  {
    page: "stat-card.mdx",
    types: [{ source: "./stat-card.tsx", name: "StatTrend" }],
    heading: "StatTrend",
  },
  {
    page: "property-panel.mdx",
    types: [{ source: "./property-panel.tsx", name: "PropertyPanelProps" }],
    heading: "PropertyPanel",
  },
  {
    page: "property-panel.mdx",
    types: [
      { source: "./property-panel.tsx", name: "ReadonlyPropertyRow" },
      { source: "./property-panel.tsx", name: "EditablePropertyRow" },
    ],
    heading: "PropertyRow",
  },
  {
    page: "data-toolbar.mdx",
    types: [{ source: "./toolbar.tsx", name: "DataToolbarProps" }],
    heading: "DataToolbar",
  },
  {
    page: "data-toolbar.mdx",
    types: [{ source: "./toolbar.tsx", name: "ToolbarSearch" }],
    heading: "ToolbarSearch",
  },
  {
    page: "advanced-filter.mdx",
    types: [{ source: "./advanced-filter.tsx", name: "AdvancedFilterProps" }],
    heading: "AdvancedFilter",
  },
  {
    page: "advanced-filter.mdx",
    types: [{ source: "./advanced-filter.tsx", name: "AdvancedFilterField" }],
    heading: "AdvancedFilterField",
  },
];

/** The five shapes a caller writes by hand. */
const nestedHeadings = [
  "KeyValueEntry",
  "StatTrend",
  "PropertyRow",
  "ToolbarSearch",
  "AdvancedFilterField",
];

/** The five components' own tables, which every page must carry. */
const componentClaims = claims.filter(
  (claim) => !nestedHeadings.includes(claim.heading),
);

describe("the surface pages' API tables", () => {
  it("documents every prop each component declares", () => {
    expect(undocumentedProps(componentClaims, readPage, readSource)).toEqual(
      [],
    );
  });

  it("documents every field of every nested shape", () => {
    // A list that stopped naming the nested shapes must not pass: each of the
    // five is a shape a caller writes by hand.
    expect(nestedHeadings).toHaveLength(5);
    const nested = claims.filter((claim) =>
      nestedHeadings.includes(claim.heading),
    );
    expect(nested).toHaveLength(5);
    expect(undocumentedProps(nested, readPage, readSource)).toEqual([]);
  });

  it("reads a real interface and a real table, so a silent reader cannot pass", () => {
    // The premise both cases rest on: the reader finds the props a type
    // declares, and the page's own rows.
    expect(
      declaredProps(readSource("./toolbar.tsx"), "ToolbarSearch"),
    ).toContain("debounceMs");
    expect(
      documentedProps(readPage("data-toolbar.mdx"), "ToolbarSearch"),
    ).toContain("debounceMs");
  });
});
