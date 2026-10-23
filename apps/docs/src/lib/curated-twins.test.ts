import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  curatedPrimitiveTwins,
  curatedRedirect,
  curatedTwinOf,
  servedPages,
  servedUrls,
} from "./curated-twins";
import { llmsTxt } from "./llms";
import { primitiveDocsRoute } from "./shared";
import { sitemapPaths } from "./sitemap";
import { uniqueSearchPages } from "./search-index";

/**
 * One page per component.
 *
 * Bug guarded: `Button`, `Checkbox`, `Select`, `Switch` and `Tooltip` were
 * documented twice — a curated page under `/docs/components` and the package
 * page under `/docs/primitives` — so the sidebar listed two entries with one
 * title, a search returned both, and the sitemap advertised two addresses for
 * one component. The curated page is canonical; the package URL redirects to it
 * and neither the sidebar, the search index, the sitemap nor `/llms.txt` may
 * list the twin.
 *
 * The duplicate set is derived from the two trees by title, so curating a sixth
 * primitive without retiring its package page fails here by name.
 */

const root = new URL("../../../../", import.meta.url);
const docsDir = new URL("content/docs/", new URL("apps/docs/", root));

const mdx = (dir: URL): ReadonlyArray<string> =>
  readdirSync(dir)
    .filter((name) => name.endsWith(".mdx"))
    .toSorted();

const titleOf = (path: URL): string => {
  const source = readFileSync(path, "utf8");
  const frontmatter = source.slice(0, source.indexOf("---", 3));
  const title = /^title:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim();
  if (title === undefined) throw new Error(`${path.pathname}: no title`);
  return title.replace(/^["']|["']$/g, "");
};

/** The curated component pages, by title. */
const curated = new Map(
  mdx(new URL("components/", docsDir))
    .filter((name) => name !== "index.mdx")
    .map((name) => [
      titleOf(new URL(name, new URL("components/", docsDir))),
      `/docs/components/${name.replace(/\.mdx$/, "")}`,
    ]),
);

/** The primitive pages whose title a curated page also carries. */
const duplicates = mdx(new URL("packages/primitives/docs/", root))
  .filter((name) =>
    curated.has(
      titleOf(new URL(name, new URL("packages/primitives/docs/", root))),
    ),
  )
  .map((name) => `${primitiveDocsRoute}/${name.replace(/\.mdx$/, "")}`);

describe("the curated primitive twins", () => {
  it("retires exactly the primitive pages a curated page also documents", () => {
    expect(curated.size).toBeGreaterThanOrEqual(30);
    expect(duplicates.length).toBeGreaterThan(0);
    expect(
      curatedPrimitiveTwins.map((twin) => twin.retired).toSorted(),
    ).toEqual(duplicates.toSorted());
  });

  it("sends each retired address to the curated page that carries the same title", () => {
    const wrong = curatedPrimitiveTwins.flatMap((twin) => {
      const tile = titleOf(
        new URL(
          `${twin.retired.replace(`${primitiveDocsRoute}/`, "")}.mdx`,
          new URL("packages/primitives/docs/", root),
        ),
      );
      const target = curated.get(tile);
      return target === twin.curated ? [] : [`${twin.retired} → ${target}`];
    });

    expect(wrong).toEqual([]);
  });

  it("keeps the query a reader followed to a retired address", () => {
    expect(curatedRedirect("/docs/primitives/button", "?platform=win32")).toBe(
      "/docs/components/button?platform=win32",
    );
    expect(curatedRedirect("/docs/primitives/button", "")).toBe(
      "/docs/components/button",
    );
    expect(
      curatedRedirect("/docs/primitives/slider", "?platform=win32"),
    ).toBeUndefined();
  });

  it("is what the redirect and the sidebar read, not a list nothing uses", () => {
    const route = readFileSync(
      new URL("../routes/docs/$.tsx", import.meta.url),
      "utf8",
    );
    const packageDocs = readFileSync(
      new URL("./package-docs.ts", import.meta.url),
      "utf8",
    );

    expect(route).toContain("curatedRedirect(url, location.searchStr)");
    expect(route).toContain("statusCode: 301");
    expect(packageDocs).toContain(
      "servedPages(sourceByOrigin[origin].getPages())",
    );
  });

  it("drops a retired page from every generated list, and keeps its neighbours", () => {
    const retired = curatedPrimitiveTwins.map((twin) => twin.retired);
    const slider = `${primitiveDocsRoute}/slider`;
    const served = [slider, ...retired];

    // The positive control: the filter drops the twins, not every package page.
    expect(servedUrls(served)).toEqual([slider]);
    expect(servedPages(served.map((url) => ({ url })))).toEqual([
      { url: slider },
    ]);

    // The sitemap keeps its own two routes and nothing the site does not serve.
    expect(sitemapPaths([], retired)).toEqual(["/", "/live"]);

    // Search and the agent index never see a second address for a component.
    expect(uniqueSearchPages([], [retired.map((url) => ({ url }))])).toEqual(
      [],
    );
    const index = llmsTxt(
      [],
      retired.map((url) => ({ url, title: "A primitive" })),
    );
    expect(retired.filter((url) => index.includes(url))).toEqual([]);
  });

  it("points the primitives index at the page each component is documented on", () => {
    const index = readFileSync(
      new URL("primitives/index.mdx", docsDir),
      "utf8",
    );
    const wrong = curatedPrimitiveTwins.flatMap((twin) => {
      const curatedLink = index.includes(`](${twin.curated})`);
      const retiredLink = index.includes(`](${twin.retired})`);
      return curatedLink && !retiredLink ? [] : [twin.retired];
    });

    expect(wrong).toEqual([]);
    expect(curatedTwinOf(`${primitiveDocsRoute}/slider`)).toBeUndefined();
  });
});
