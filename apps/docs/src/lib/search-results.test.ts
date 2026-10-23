import { describe, expect, it } from "vitest";
import { Option } from "effect";
import { readFileSync } from "node:fs";
import {
  decodeSearchResults,
  dedupeSearchResults,
  encodeSearchResults,
  type SearchResult,
} from "./search-results";

/**
 * The search endpoint's answer, trimmed to one row per address.
 *
 * Fumadocs splits a long heading into several index chunks, and every chunk
 * carries the heading's own anchor: a query for "button" answered with
 * `/docs/components/button#api-reference` three times and `#limitations` twice.
 * The dialog rendered each one, so a reader saw the same section under the same
 * label. The rows arrive ranked, so the first is the one to keep.
 */

const row = (url: string, content: string): SearchResult => ({
  url,
  type: "text",
  content,
});

describe("the search result list", () => {
  it("keeps the best-ranked row for an address the index chunked", () => {
    const rows = [
      row("/docs/components/button", "Button"),
      row("/docs/components/button#api-reference", "| Prop | Type |"),
      row("/docs/components/button#api-reference", "## Defaults"),
      row("/docs/components/button#api-reference", "## Variants"),
      row("/docs/components/button#limitations", "Role button"),
      row("/docs/components/button#limitations", "No aria-disabled"),
    ];

    expect(dedupeSearchResults(rows)).toEqual([rows[0], rows[1], rows[4]]);
  });

  it("keeps a different heading on the same page", () => {
    // The fragment is the destination: two sections are two answers, even when
    // the reader lands on one page.
    const rows = [
      row("/docs/components/tabs#api", "Tabs"),
      row("/docs/components/tabs#keyboard", "Arrows"),
    ];

    expect(dedupeSearchResults(rows)).toHaveLength(2);
  });

  it("keeps pages apart, so a repeat is the only thing removed", () => {
    const rows = [
      row("/docs/components/button", "Button"),
      row("/docs/primitives/toggle", "Toggle"),
      row("/docs/components/button", "Button again"),
    ];

    expect(dedupeSearchResults(rows)).toEqual([rows[0], rows[1]]);
  });

  it("returns nothing for nothing", () => {
    expect(dedupeSearchResults([])).toEqual([]);
  });

  it("round-trips the rows and leaves fields it does not model alone", () => {
    // The site edits the address only; `type`, the snippet and the breadcrumbs
    // are Fumadocs' and have to come back unchanged.
    const body =
      '[{"id":"/docs/components/button","type":"page",' +
      '"url":"/docs/components/button","content":"Button",' +
      '"breadcrumbs":["Docs","Components"]},' +
      '{"id":"/docs/components/button-2","type":"text",' +
      '"url":"/docs/components/button#api-reference",' +
      '"content":"| Prop | Type |",' +
      '"breadcrumbs":["Docs","Components"]}]';

    const decoded = decodeSearchResults(body);
    expect(Option.isSome(decoded)).toBe(true);
    const rows = Option.getOrElse(decoded, () => []);

    expect(rows.map((entry) => entry.type)).toEqual(["page", "text"]);
    expect(rows[1]?.breadcrumbs).toEqual(["Docs", "Components"]);

    // The key order is the codec's, so the round trip is compared as rows.
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
    // A future endpoint with another envelope must reach the dialog whole: the
    // route passes the response through when decoding fails.
    expect(Option.isNone(decodeSearchResults("{}"))).toBe(true);
    expect(Option.isNone(decodeSearchResults('{"results":[]}'))).toBe(true);
    expect(Option.isNone(decodeSearchResults("not json"))).toBe(true);
  });

  it("is the response the endpoint actually answers with", () => {
    // The guard is only a guard if the route reads and writes through it.
    const route = readFileSync(
      new URL("../routes/api/search.ts", import.meta.url),
      "utf8",
    );

    expect(route).toContain("decodeSearchResults(");
    expect(route).toContain("encodeSearchResults(dedupeSearchResults(rows))");
    expect(route).toContain("onNone: () => response");
  });
});
