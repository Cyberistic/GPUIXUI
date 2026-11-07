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

const nestedHeadings = [
  "KeyValueEntry",
  "StatTrend",
  "PropertyRow",
  "ToolbarSearch",
  "AdvancedFilterField",
];

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
    expect(nestedHeadings).toHaveLength(5);
    const nested = claims.filter((claim) =>
      nestedHeadings.includes(claim.heading),
    );
    expect(nested).toHaveLength(5);
    expect(undocumentedProps(nested, readPage, readSource)).toEqual([]);
  });

  it("reads a real interface and a real table, so a silent reader cannot pass", () => {
    expect(
      declaredProps(readSource("./toolbar.tsx"), "ToolbarSearch"),
    ).toContain("debounceMs");
    expect(
      documentedProps(readPage("data-toolbar.mdx"), "ToolbarSearch"),
    ).toContain("debounceMs");
  });
});
