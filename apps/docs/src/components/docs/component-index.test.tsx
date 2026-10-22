import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { verdictMark } from "../../lib/component-index";
import { componentIndex } from "../../lib/component-index-data";
import { ComponentIndex } from "./component-index";

/**
 * The index's rendered rows.
 *
 * The page mounts this component instead of listing pages by hand, so the guard
 * is that the rendered list carries every row of the generated index — a page
 * dropped here has no other symptom — and that the count and the control are
 * what a reader sees before typing.
 */

const markup = renderToStaticMarkup(<ComponentIndex />);

/** One rendered row: from its link to the list item's close. */
const row = (url: string): string => {
  const start = markup.indexOf(`href="${url}"`);
  if (start === -1) return "";
  const end = markup.indexOf("</li>", start);
  return markup.slice(start, end === -1 ? undefined : end);
};

describe("the component index", () => {
  it("renders every page in the index", () => {
    expect(componentIndex.length).toBeGreaterThan(60);
    expect(
      componentIndex.filter((entry) => !markup.includes(entry.url)),
    ).toEqual([]);
    expect(
      componentIndex.filter((entry) => !markup.includes(entry.title)),
    ).toEqual([]);
  });

  it("marks the rows that open with a browser preview, and no others", () => {
    // The index says only the curated pages preview the component, so a reader
    // scanning the rows can see which one to open first — and a package page,
    // which has no preview, must not wear the badge.
    const marked = componentIndex.filter((entry) => entry.preview);

    expect(marked.length).toBeGreaterThanOrEqual(4);
    expect(
      marked.filter((entry) => !row(entry.url).includes("Browser preview")),
    ).toEqual([]);
    expect(
      componentIndex
        .filter((entry) => !entry.preview)
        .filter((entry) => row(entry.url).includes("Browser preview")),
    ).toEqual([]);
  });

  it("wears the inventory verdict on the rows that are not whole", () => {
    // The page says status is per component but the strip is on the page a
    // reader has not opened; the row itself has to carry the verdict, and a
    // component the runtime supports whole must not wear a mark.
    const partial = componentIndex.filter(
      (entry) => verdictMark(entry.verdict)?.label === "partial",
    );
    const whole = componentIndex.filter(
      (entry) => verdictMark(entry.verdict) === undefined,
    );

    expect(partial.length).toBeGreaterThan(30);
    expect(whole.length).toBeGreaterThan(0);
    expect(
      partial.filter((entry) => !row(entry.url).includes(">partial<")),
    ).toEqual([]);
    expect(
      whole.filter((entry) => row(entry.url).includes(">partial<")),
    ).toEqual([]);
  });

  it("prints the full count before a query narrows it", () => {
    expect(markup).toContain(
      `${componentIndex.length} of ${componentIndex.length} pages`,
    );
  });

  it("labels the filter box for a screen reader", () => {
    expect(markup).toContain(
      "Filter components by name, part, prop or purpose",
    );
    expect(markup).toContain('type="search"');
  });
});
