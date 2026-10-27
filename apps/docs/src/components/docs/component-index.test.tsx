import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  filterEntries,
  otherLaneMatches,
  verdictMark,
} from "../../lib/component-index";
import { componentIndex, componentPages } from "../../lib/component-index-data";
import { ComponentIndexView } from "./component-index";

/**
 * The index's rendered tiles.
 *
 * The page mounts this component instead of listing pages by hand, so the guard
 * is that the grid carries every row of the generated lane — a page dropped here
 * has no other symptom — that every tile with a demo renders it, and that the
 * count and the control are what a reader sees before typing.
 *
 * The mount reads its filter off the page URL, which is the one fact a server
 * render of the view cannot show: the last case reads the mount's own source,
 * so a filter held in local state alone (the bug that made a filtered view
 * unlinkable) fails here by name.
 */

const noop = (): void => undefined;

// The switch resolves through the router, which a server render of the grid
// does not mount; its own guards cover that. The grid's guard is about the
// tiles and the demos they carry, so both read the dark macOS theme.
vi.mock("./platform-toggle", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./platform-toggle")>();
  const { resolvePlatformTheme } = await import("../../lib/platform");
  const choose = (): void => undefined;
  return {
    ...actual,
    usePlatform: () => ({
      platform: "darwin" as const,
      look: "native" as const,
      mode: "dark" as const,
      theme: resolvePlatformTheme("darwin", "dark"),
      setPlatform: choose,
      setLook: choose,
      setMode: choose,
    }),
  };
});

vi.mock("./preview-surface", () => ({
  PreviewSurface: ({ children }: { readonly children: ReactNode }) => (
    <div className="gx-demo">{children}</div>
  ),
  usePreviewInteractive: () => true,
}));

const markup = renderToStaticMarkup(
  <ComponentIndexView onQueryChange={noop} previews query="" />,
);

/**
 * One rendered tile: from its link to the next tile's marker.
 *
 * A demo can render its own list, so `</li>` is not the tile's edge; the tile's
 * own marker is.
 */
const row = (url: string): string => {
  const link = markup.indexOf(`href="${url}"`);
  if (link === -1) return "";
  const start = markup.lastIndexOf("data-component=", link);
  const end = markup.indexOf("data-component=", link);
  return markup.slice(start, end === -1 ? undefined : end);
};

describe("the component index", () => {
  it("renders every page in the index", () => {
    expect(componentPages.length).toBeGreaterThan(60);
    expect(
      componentPages.filter((entry) => !markup.includes(entry.url)),
    ).toEqual([]);
    expect(
      componentPages.filter((entry) => !markup.includes(entry.title)),
    ).toEqual([]);
  });

  it("renders a demo in every component tile", () => {
    // Every component page mounts one now that `MultiStepForm` has a preview;
    // a tile that rendered an empty frame would make the page's claim false.
    const previewed = componentPages.filter(
      (entry) => entry.demo !== undefined,
    );

    expect(previewed.length).toBeGreaterThanOrEqual(76);
    expect(previewed).toHaveLength(componentPages.length);
    expect(
      previewed.filter(
        (entry) => !row(entry.url).includes('data-preview="demo"'),
      ),
    ).toEqual([]);
    expect(markup).not.toContain('data-preview="none"');
  });

  it("lays the tiles out three across on a desktop, two on a tablet, one on a phone", () => {
    // The grid replaces a one- or two-column list; a regression to the old
    // width is invisible to every other assertion here.
    expect(markup).toContain("grid-cols-1");
    expect(markup).toContain("md:grid-cols-2");
    expect(markup).toContain("lg:grid-cols-3");
  });

  it("paints the same placeholder on the server, then mounts the demos", () => {
    // The demos carry seeded drawings and timers. Rendering them during SSR
    // made React's first client pass disagree with the server (a hydration
    // error across the grid), so the server and first client pass paint a
    // placeholder and the mount turns the scenes on in an effect.
    const firstPaint = renderToStaticMarkup(
      <ComponentIndexView onQueryChange={noop} query="" />,
    );
    const mount = readFileSync(
      new URL("./component-index.tsx", import.meta.url),
      "utf8",
    );

    expect(firstPaint).toContain(">Preview<");
    expect(firstPaint).not.toContain("gx-grid-preview");
    expect(mount).toContain("useEffect(() => setPreviews(true), [])");
    expect(mount).toContain("<Scene />");
  });

  it("wears the inventory verdict on the tiles that are not whole", () => {
    // The page says status is per component but the strip is on the page a
    // reader has not opened; the tile itself has to carry the verdict, and a
    // component the runtime supports whole must not wear a mark.
    const partial = componentPages.filter(
      (entry) => verdictMark(entry.verdict)?.label === "partial",
    );
    const whole = componentPages.filter(
      (entry) => verdictMark(entry.verdict) === undefined,
    );

    expect(partial.length).toBeGreaterThan(20);
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
      `${componentPages.length} of ${componentPages.length} components`,
    );
  });

  it("labels the filter box for a screen reader", () => {
    expect(markup).toContain(
      "Filter components by name, part, prop or purpose",
    );
    expect(markup).toContain('type="search"');
  });

  it("paints the tiles a linked filter matches, and no others", () => {
    // The filter travels in the URL, so the first paint of a shared link is
    // already the narrowed view. The expected tiles are the pure filter's own
    // answer, so the markup cannot list a page the query rejects.
    const query = "DialogFooter";
    const matches = filterEntries(componentPages, query);
    const linked = renderToStaticMarkup(
      <ComponentIndexView onQueryChange={noop} query={query} />,
    );

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThan(componentPages.length);
    expect(linked).toContain(
      `${matches.length} of ${componentPages.length} components`,
    );
    expect(matches.filter((entry) => !linked.includes(entry.url))).toEqual([]);
    expect(
      componentPages.filter(
        (entry) => !matches.includes(entry) && linked.includes(entry.url),
      ),
    ).toEqual([]);
  });

  it("points a query the composed lane cannot answer at the lane that can", () => {
    // A reader who types a primitive's name on the composed lane has not made a
    // mistake, and "no component matches" is a dead end that hides the page one
    // section down the sidebar. The sample names a primitive this lane does not
    // document; "range slider" used to, until the Slider page landed here.
    const query = "spacer";

    expect(filterEntries(componentPages, query)).toEqual([]);
    const elsewhere = otherLaneMatches(componentIndex, query);
    const linked = renderToStaticMarkup(
      <ComponentIndexView onQueryChange={noop} query={query} />,
    );

    expect(elsewhere.length).toBeGreaterThan(0);
    expect(linked).toContain('data-other-lane="true"');
    expect(linked).toContain(elsewhere[0]?.lane ?? "");
    expect(
      elsewhere
        .flatMap((group) => group.entries)
        .filter((entry) => !linked.includes(`href="${entry.url}"`)),
    ).toEqual([]);
    expect(linked).not.toContain(
      "No composed component matches “range slider”. Try a shorter word",
    );

    // The page teaches the behaviour a reader has to expect; the sentence and
    // the empty state land in one commit.
    const page = readFileSync(
      new URL("../../../content/docs/components/index.mdx", import.meta.url),
      "utf8",
    );
    expect(page).toContain("names the lower lane");

    const policy = readFileSync(
      new URL("../../../../../docs/preview-strategy.md", import.meta.url),
      "utf8",
    );
    expect(policy).toContain("query is not a dead end");
  });

  it("keeps the dead-end sentence when no lane holds the query", () => {
    const query = "zzzzzz";

    expect(otherLaneMatches(componentIndex, query)).toEqual([]);
    const linked = renderToStaticMarkup(
      <ComponentIndexView onQueryChange={noop} query={query} />,
    );

    expect(linked).toContain('data-other-lane="false"');
    expect(linked).toContain("Try a shorter word");
  });

  it("stays silent about the other lanes while this one has a match", () => {
    // The suggestion belongs to the empty state only; a matching query keeps
    // the grid and its count, which is what a reader typing here expects.
    const query = "button";

    expect(filterEntries(componentPages, query).length).toBeGreaterThan(0);
    const elsewhere = otherLaneMatches(componentIndex, query);
    expect(elsewhere.length).toBeGreaterThan(0);
    expect(elsewhere.every((group) => group.lane !== "Components")).toBe(true);
    const linked = renderToStaticMarkup(
      <ComponentIndexView onQueryChange={noop} query={query} />,
    );

    expect(linked).not.toContain("data-other-lane");
  });

  it("does not offer the package twin of a component the composed lane lists", () => {
    // Five primitives are curated in this lane, so their package pages are not
    // served (`curated-twins.ts`). Suggesting one would send a reader to a
    // redirect for a component the grid already answered.
    const elsewhere = (query: string): string[] =>
      otherLaneMatches(componentIndex, query).flatMap((group) =>
        group.entries.map((entry) => entry.url),
      );

    expect(elsewhere("tooltip")).not.toContain("/docs/primitives/tooltip");
    // The positive control: a primitive with no curated page still surfaces.
    expect(elsewhere("slider")).toContain("/docs/primitives/slider");
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
    expect(hook).toContain("indexQuerySearch(next, url.search)");
    // The page teaches the parameter it writes, so a reader can link a view.
    // A Markdown code span and an explicit `<code>` tag render the same, so
    // either form counts; the parameter itself is what must be printed.
    expect(page).toMatch(/`\?q=partial`|<code>\?q=partial<\/code>/);
    // And it mounts the URL-backed component, not the view directly.
    expect(page).toContain("<ComponentIndex />");
  });
});
