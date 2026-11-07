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

const noop = (): void => undefined;

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

  it("renders a demo in every tile whose page mounts a preview", () => {
    const previewed = componentPages.filter((entry) => entry.preview);

    expect(previewed.length).toBeGreaterThanOrEqual(76);
    expect(previewed.filter((entry) => entry.demo === undefined)).toEqual([]);
    expect(
      previewed.filter(
        (entry) => !row(entry.url).includes('data-preview="demo"'),
      ),
    ).toEqual([]);
  });

  it("lays the tiles out three across on a desktop, two on a tablet, one on a phone", () => {
    expect(markup).toContain("grid-cols-1");
    expect(markup).toContain("md:grid-cols-2");
    expect(markup).toContain("lg:grid-cols-3");
  });

  it("paints the same placeholder on the server, then mounts the demos", () => {
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
    const elsewhere = (query: string): string[] =>
      otherLaneMatches(componentIndex, query).flatMap((group) =>
        group.entries.map((entry) => entry.url),
      );

    expect(elsewhere("tooltip")).not.toContain("/primitives/tooltip");

    expect(elsewhere("slider")).toContain("/primitives/slider");
  });

  it("reads the filter off the URL instead of state the page cannot share", () => {
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

    expect(page).toContain("<ComponentIndex />");
  });
});
