import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { componentIndex } from "../../lib/component-index-data";
import { examplesForPage } from "../../lib/examples";
import { examples } from "../../lib/examples-data";
import { ExamplesIndex } from "./examples-index";
import { PageExample, examplesRoute } from "./page-example";

/**
 * The strip a component page uses to reach its worked example.
 *
 * The registry links every example to the page it illustrates; nothing linked
 * back, so a reader on the component's own page had no way to find the fuller
 * composition that ships beside it. The guard is the registry itself: the
 * strip's link must be the row's own anchor, the row must render that anchor,
 * and a page with no example must stay empty rather than borrow one.
 */

const cardPage = "/docs/components/card";
const registry = renderToStaticMarkup(<ExamplesIndex />);

/** The example rows a page owns, without a grouped example. */
const owned = examples.filter((entry) => !entry.grouped);

describe("the worked-example strip", () => {
  it("links a component page to its own row, by that row's anchor", () => {
    const [entry] = examplesForPage(examples, cardPage);
    expect(entry?.file).toBe("packages/components/examples/card.example.tsx");

    const markup = renderToStaticMarkup(<PageExample url={cardPage} />);
    expect(markup).toContain(`href="${examplesRoute}#${entry?.anchor}"`);
    expect(markup).toContain(entry?.file);
    expect(markup).toContain(entry?.title);
  });

  it("lands on a row the registry renders under that anchor", () => {
    // A fragment no element answers to scrolls nowhere, so the link is only a
    // link when the registry paints the id the strip points at.
    expect(owned.length).toBeGreaterThan(35);
    expect(
      owned.filter((entry) => !registry.includes(`id="${entry.anchor}"`)),
    ).toEqual([]);
    expect(new Set(owned.map((entry) => entry.anchor)).size).toBe(owned.length);
  });

  it("serves every page an example owns, including the pages the site writes", () => {
    const pages = new Set(componentIndex.map((entry) => entry.url));
    expect(owned.filter((entry) => !pages.has(entry.url))).toEqual([]);
    expect(
      examplesForPage(examples, "/docs/components/dialog").map(
        (entry) => entry.id,
      ),
    ).toEqual(["dialog"]);
  });

  it("stays empty for a page with no example, and never borrows a grouped one", () => {
    expect(renderToStaticMarkup(<PageExample url="/docs/themes" />)).toBe("");
    expect(renderToStaticMarkup(<PageExample url="/docs/primitives" />)).toBe(
      "",
    );
    expect(examplesForPage(examples, "/docs/primitives")).toEqual([]);
  });

  it("mounts on every page, not only the ones the site writes", () => {
    const view = readFileSync(
      new URL("../../lib/docs-view.tsx", import.meta.url),
      "utf8",
    );
    // One mount in the shared frame renders both collections' pages, and both
    // branches hand it the loader's canonical URL rather than the file path.
    expect(view).toContain("<PageExample url={url} />");
    expect(view).toContain("url } = useFumadocsLoader(data)");
    expect(view).toContain("<SiteContent path={path} url={url} />");
    expect(view).toContain(
      "<PackageContent origin={data.origin} path={path} url={url} />",
    );
  });
});
