import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { source } from "@/lib/source";
import { docsPageHead, docsPageMeta } from "./page-meta";

/**
 * Guards per-page document metadata (plan 413). Before this every docs page
 * inherited the root title and description, so a tab, a search result and a
 * shared link could not tell fifteen pages apart. The failures these tests
 * catch: a head built from a constant instead of the page, a canonical URL
 * pointing somewhere else, and a page without a description quietly replacing
 * the root's description with an empty one.
 *
 * `node:fs` rather than the Effect `FileSystem` service, as in `content.test.ts`
 * and `registry.test.ts`: this package is a browser app whose tests read the
 * content tree directly, and the Effect runtime must not reach its bundle.
 */

const installation = () => {
  const page = source.getPage(["installation"]);
  if (page === undefined) {
    throw new Error("content/docs/installation.mdx is missing");
  }
  return page;
};

describe("docs page metadata", () => {
  it("reads the title, description and url of the real page", () => {
    const page = installation();
    expect(docsPageMeta(page)).toEqual({
      title: page.data.title,
      description: page.data.description,
      url: page.url,
    });
  });

  it("names the document after the page, not after the site", () => {
    const page = installation();
    const head = docsPageHead(docsPageMeta(page));

    expect(head.meta).toContainEqual({ title: `${page.data.title} — GPUIXUI` });
    expect(head.meta).toContainEqual({
      name: "description",
      content: page.data.description,
    });
    expect(head.links).toEqual([{ rel: "canonical", href: page.url }]);
  });

  it("emits no description tag for a blank description", () => {
    const head = docsPageHead({
      title: "Untitled",
      description: "   ",
      url: "/docs/untitled",
    });

    expect(head.meta.some((tag) => "name" in tag)).toBe(false);
    expect(
      head.meta.some(
        (tag) => "property" in tag && tag.property === "og:description",
      ),
    ).toBe(false);
  });

  it("refuses a page with no frontmatter title instead of borrowing the site's", () => {
    // `fumadocs-core` types `PageData.title` as optional even though the
    // frontmatter schema requires it, so the boundary has to check.
    expect(() =>
      docsPageMeta({ url: "/docs/titleless", data: { title: "  " } }),
    ).toThrowError(/titleless/);
  });

  it("wires the head into the docs route", () => {
    // The one regression a unit test cannot see: the mapping exists but the
    // route never asks TanStack Router for it.
    const route = readFileSync(
      new URL("../routes/docs/$.tsx", import.meta.url),
      "utf8",
    );
    expect(route).toMatch(/head:\s*\(\{ loaderData \}\)[\s\S]*docsPageHead\(/);
  });
});
