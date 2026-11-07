import { describe, expect, it } from "vitest";
import { Option } from "effect";
import { readFileSync } from "node:fs";
import {
  decodeSearchResults,
  dedupeSearchResults,
  encodeSearchResults,
  type SearchResult,
} from "./search-results";

const row = (url: string, content: string): SearchResult => ({
  url,
  type: "text",
  content,
});

describe("the search result list", () => {
  it("keeps the best-ranked row for an address the index chunked", () => {
    const rows = [
      row("/components/button", "Button"),
      row("/components/button#api-reference", "| Prop | Type |"),
      row("/components/button#api-reference", "## Defaults"),
      row("/components/button#api-reference", "## Variants"),
      row("/components/button#limitations", "Role button"),
      row("/components/button#limitations", "No aria-disabled"),
    ];

    expect(dedupeSearchResults(rows)).toEqual([rows[0], rows[1], rows[4]]);
  });

  it("keeps a different heading on the same page", () => {
    const rows = [
      row("/components/tabs#api", "Tabs"),
      row("/components/tabs#keyboard", "Arrows"),
    ];

    expect(dedupeSearchResults(rows)).toHaveLength(2);
  });

  it("keeps pages apart, so a repeat is the only thing removed", () => {
    const rows = [
      row("/components/button", "Button"),
      row("/primitives/toggle", "Toggle"),
      row("/components/button", "Button again"),
    ];

    expect(dedupeSearchResults(rows)).toEqual([rows[0], rows[1]]);
  });

  it("returns nothing for nothing", () => {
    expect(dedupeSearchResults([])).toEqual([]);
  });

  it("round-trips the rows and leaves fields it does not model alone", () => {
    const body =
      '[{"id":"/components/button","type":"page",' +
      '"url":"/components/button","content":"Button",' +
      '"breadcrumbs":["Docs","Components"]},' +
      '{"id":"/components/button-2","type":"text",' +
      '"url":"/components/button#api-reference",' +
      '"content":"| Prop | Type |",' +
      '"breadcrumbs":["Docs","Components"]}]';

    const decoded = decodeSearchResults(body);
    expect(Option.isSome(decoded)).toBe(true);
    const rows = Option.getOrElse(decoded, () => []);

    expect(rows.map((entry) => entry.type)).toEqual(["page", "text"]);
    expect(rows[1]?.breadcrumbs).toEqual(["Docs", "Components"]);

    const encoded = encodeSearchResults(rows);
    expect(Option.isSome(encoded)).toBe(true);
    expect(
      decodeSearchResults(
        Option.match(encoded, {
          onNone: () => "",
          onSome: (text) => text,
        }),
      ),
    ).toEqual(decoded);
  });

  it("refuses a body that is not the list, rather than editing it", () => {
    expect(Option.isNone(decodeSearchResults("{}"))).toBe(true);
    expect(Option.isNone(decodeSearchResults('{"results":[]}'))).toBe(true);
    expect(Option.isNone(decodeSearchResults("not json"))).toBe(true);
  });

  it("is the response the endpoint actually answers with", () => {
    const route = readFileSync(
      new URL("../routes/api/search.ts", import.meta.url),
      "utf8",
    );

    expect(route).toContain("decodeSearchResults(");
    expect(route).toContain("encodeSearchResults(dedupeSearchResults(rows))");
    expect(route).toContain("onNone: () => response");
  });
});
