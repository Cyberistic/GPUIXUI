import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { examples } from "../../lib/examples-data";
import { ExamplesIndex } from "./examples-index";

/**
 * The examples page's rendered rows.
 *
 * The page mounts this component instead of listing files by hand, so the guard
 * is that every generated row reaches the markup with its link and its summary
 * — a row dropped here has no other symptom. The source is deliberately absent
 * until a reader asks for it: the page must not ship fifty code blocks it does
 * not show.
 */

const markup = renderToStaticMarkup(<ExamplesIndex />);

/**
 * The text a reader sees, with the entities React writes for it.
 *
 * A header is prose, so it can carry an apostrophe (`the reader's
 * preference`); React renders it as `&#x27;`, and comparing the raw markup with
 * the header's own text made a correct row look missing. The check is that the
 * reader sees the sentence, not that the bytes match.
 */
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
