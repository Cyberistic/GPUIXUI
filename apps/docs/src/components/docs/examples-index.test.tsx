import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { examples } from "../../lib/examples-data";
import { ExamplesIndex } from "./examples-index";

const markup = renderToStaticMarkup(<ExamplesIndex />);

const visible = (html: string): string =>
  html
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const text = visible(markup);

describe("the examples index", () => {
  it("renders every example with its page link and summary", () => {
    expect(
      examples.filter(
        (entry) => !text.includes(entry.url) || !text.includes(entry.summary),
      ),
    ).toEqual([]);
  });

  it("prints the full count before a query narrows it", () => {
    expect(markup).toContain(
      `${examples.length} of ${examples.length} examples`,
    );
  });

  it("labels the filter box and every source toggle", () => {
    expect(markup).toContain("Filter examples by name, purpose or package");
    expect(markup).toContain('type="search"');
    expect(markup).toContain("Show the source for Card");
    expect(markup).toContain('aria-expanded="false"');
  });

  it("keeps the source out of the first paint", () => {
    const firstLines = examples.map(
      (entry) => entry.source.split("\n")[0] ?? "",
    );
    const leaks = firstLines.filter(
      (line) => line.length > 0 && markup.includes(line),
    );
    expect(leaks).toEqual([]);
  });
});
