import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { filterEntries, verdictMark } from "../../lib/component-index";
import { componentIndex } from "../../lib/component-index-data";
import { ComponentIndexView } from "./component-index";

/**
 * The index's rendered rows.
 *
 * The page mounts this component instead of listing pages by hand, so the guard
 * is that the rendered list carries every row of the generated index — a page
 * dropped here has no other symptom — and that the count and the control are
 * what a reader sees before typing.
 *
 * The mount reads its filter off the page URL, which is the one fact a server
 * render of the view cannot show: the last case reads the mount's own source,
 * so a filter held in local state alone (the bug that made a filtered view
 * unlinkable) fails here by name.
 */

const noop = (): void => undefined;

const markup = renderToStaticMarkup(
  <ComponentIndexView onQueryChange={noop} query="" />,
);

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

  it("paints the rows a linked filter matches, and no others", () => {
    // The filter travels in the URL, so the first paint of a shared link is
    // already the narrowed view. The expected rows are the pure filter's own
    // answer, so the markup cannot list a row the query rejects.
    const query = "DialogFooter";
    const matches = filterEntries(componentIndex, query);
    const linked = renderToStaticMarkup(
      <ComponentIndexView onQueryChange={noop} query={query} />,
    );

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThan(componentIndex.length);
    expect(linked).toContain(
      `${matches.length} of ${componentIndex.length} pages`,
    );
    expect(matches.filter((entry) => !linked.includes(entry.url))).toEqual([]);
    expect(
      componentIndex.filter(
        (entry) => !matches.includes(entry) && linked.includes(entry.url),
      ),
    ).toEqual([]);
  });

  it("reads the filter off the URL instead of state the page cannot share", () => {
    // The mount is what the MDX page renders; the view is the markup. A filter
    // that never touches `location.search` is the defect this holds shut. The
    // rule lives in the shared hook now that the icon gallery carries the same
    // filter, so both surfaces are held by one read.
    const mount = readFileSync(
      new URL("./component-index.tsx", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const hook = readFileSync(
      new URL("./use-index-query.ts", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const page = readFileSync(
      new URL("../../../content/docs/components/index.mdx", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(mount).toContain("useIndexQuery()");
    expect(hook).toContain("select: (state) => state.location.searchStr");
    expect(hook).toContain("indexQueryFromSearch(search)");
    expect(hook).toContain('history.replaceState(null, "", url.toString())');
    expect(hook).toContain("componentIndexSearch(next, url.search)");
    // The page teaches the parameter it writes, so a reader can link a view.
    expect(page).toContain("`?q=partial`");
    // And it mounts the URL-backed component, not the view directly.
    expect(page).toContain("<ComponentIndex />");
  });
});
