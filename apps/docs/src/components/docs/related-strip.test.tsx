import { readFileSync, readdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { relatedFor } from "../../lib/related";
import { RelatedStrip } from "./related-strip";

/**
 * The strip is the only place a package page links its siblings, so it has to
 * print the family's links, name the family, and stay silent where there is no
 * sibling to offer rather than leaving an empty box at the bottom of the page.
 */

const render = (url: string, sections: ReadonlyArray<string> = []): string =>
  renderToStaticMarkup(<RelatedStrip sections={sections} url={url} />);

describe("the related strip", () => {
  it("prints the page's siblings, each linked to its page", () => {
    const markup = render("/components/ripple-button");

    expect(markup).toContain("Related · Actions and their effects");
    expect(markup).toContain('href="/components/liquid-button"');
    expect(markup).toContain(">Liquid button</a>");
    expect(markup).toContain('href="/components/button"');
    expect(markup).not.toContain('href="/components/ripple-button"');
  });

  it("keeps a package page linked to the curated page the site serves", () => {
    // The curated page keeps its URL, so it is what a reader follows; the
    // package page it shadows is never mounted.
    const markup = render("/components/preview-card");

    expect(markup).toContain('href="/components/dialog"');
    expect(markup).toContain(">Dialog</a>");
  });

  it("prints a curated page's siblings too, from the same family", () => {
    // The curated page keeps its URL, so it is the page a reader lands on; a
    // strip mounted only on the package frame left all thirty-nine curated
    // components with no sibling links at all.
    const markup = render("/components/dialog");

    expect(markup).toContain("Related · Overlays");
    expect(markup).toContain('href="/components/drawer"');
    expect(markup).toContain('href="/components/popover"');
    expect(markup).not.toContain('href="/components/dialog"');
  });

  it("is mounted on the curated frame, not only the package frame", () => {
    const view = readFileSync(
      new URL("../../lib/docs-view.tsx", import.meta.url),
      "utf8",
    );
    const site = view.slice(
      view.indexOf("function SiteContent"),
      view.indexOf("function PackageContent"),
    );

    expect(site).toContain("<RelatedStrip");
    expect(site).toContain("sections={toc.map((entry) => entry.url)}");
    expect(site).toContain("url={url}");
  });

  it("gives every curated page a family, so the mount never prints nothing", () => {
    const slugs = readdirSync(
      new URL("../../../content/docs/components/", import.meta.url),
    )
      .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
      .map((name) => name.replace(/\.mdx$/, ""));

    const missing = slugs.flatMap((slug) => {
      const url = `/components/${slug}`;
      const related = relatedFor(url);
      if (related === undefined) return [`${url}: no family`];
      return related.pages.some((member) => member.href === url)
        ? [`${url}: links to itself`]
        : [];
    });

    expect(slugs.length).toBeGreaterThanOrEqual(30);
    expect(missing).toEqual([]);
  });

  it("stays silent where the page writes its own Related section", () => {
    // A mounted package page may write the section itself; printing the
    // generated family under its own would offer two lists of siblings.
    expect(
      render("/data-display/column-configuration", [
        "#usage",
        "#api",
        "#related",
      ]),
    ).toBe("");
    expect(
      render("/data-display/column-configuration", ["#usage", "#api"]),
    ).toContain("Related · Table surfaces");
  });

  it("is mounted with the page's own heading anchors, so a written section is not repeated", () => {
    // The strip cannot see the Markdown; the frame hands it the table of
    // contents Fumadocs already built. Dropping the prop would print a second
    // Related list under a page that writes one.
    const view = readFileSync(
      new URL("../../lib/docs-view.tsx", import.meta.url),
      "utf8",
    );

    expect(view).toContain("<RelatedStrip");
    expect(view).toContain("sections={toc.map((entry) => entry.url)}");
    expect(view).toContain("url={url}");
  });

  it("prints the media player's siblings, not an empty line", () => {
    // The player landed after the families were written, so its page ended with
    // no related line while the other media pages were its family all along.
    const markup = render("/media/media-player");

    expect(markup).toContain("Related · Media surfaces");
    expect(markup).toContain('href="/media/crop-area"');
    expect(markup).not.toContain('href="/media/media-player"');
  });

  it("renders nothing for an argued solo or a page outside the component lanes", () => {
    expect(render("/primitives/tooltip")).toBe("");
    expect(render("/components/not-a-page")).toBe("");
    expect(render("/theming")).toBe("");
  });
});
