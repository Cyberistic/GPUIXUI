import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { indexedCollections } from "./collection-index";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import { docsRoute } from "./shared";
import { sitemapPaths } from "./sitemap";

/**
 * The routes the build renders once, and the Worker never renders again.
 *
 * Every page on this site is content: a component page, a prose page, a block,
 * an index. Only the playground's controls and the preview switch are client
 * state. So the build renders each page to HTML (`dist/client/<path>/index.html`)
 * and Cloudflare's asset layer answers it before the Worker is invoked at all —
 * no render, no CPU, for the pages a burst of readers asks for.
 *
 * The list is the sitemap's, because the sitemap is already the site's own
 * inventory of the pages it serves: a page added to any collection is
 * advertised and prerendered in the same commit. `dynamicPaths` is the
 * exception list, argued at each entry.
 *
 * Node-only: this reads the workspace at build time, and the browser bundle
 * never sees it.
 */

/**
 * The routes that must stay server-rendered, and why.
 *
 * `/live` boots the wasm renderer, which needs `SharedArrayBuffer` and so a
 * cross-origin-isolated document. Those headers are set per request by the
 * Worker (`src/start.ts`); a static asset is answered before the Worker runs
 * and would be served without them, leaving the page unable to start.
 */
const dynamicPaths: ReadonlyArray<string> = ["/live"];

/**
 * The machine endpoints whose body the build fixes.
 *
 * `/llms-full.txt` prints every page's Markdown and is the most expensive
 * thing the Worker could still render (~10 ms, the whole free-plan budget for
 * one request); the other two are generated from the same collections. Nothing
 * about them depends on the request, so the build renders them into
 * `dist/client` and the asset layer serves the file.
 */
export const staticDocumentPaths: ReadonlyArray<string> = [
  "/sitemap.xml",
  "/llms.txt",
  "/llms-full.txt",
];

const rootPath = (root: string | URL): string =>
  typeof root === "string" ? root : fileURLToPath(root);

/**
 * Every `.mdx` under a Fumadocs collection, at the URL it renders at.
 *
 * A file's slug is its name without the extension; `index.mdx` renders at the
 * directory's own route. The MDX build derives the same slugs, and the tests
 * hold this walk to the pages the collections serve.
 */
const walk = (
  dir: string,
  slugs: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return walk(join(dir, entry.name), [...slugs, entry.name]);
    }
    if (!entry.name.endsWith(".mdx")) return [];

    const name = entry.name.replace(/\.mdx$/, "");
    const path = name === "index" ? slugs : [...slugs, name];
    return [`${docsRoute}${path.length === 0 ? "" : `/${path.join("/")}`}`];
  });

/** The site's own pages, at the URLs its collection serves them. */
export const sitePageUrls = (root: string | URL): ReadonlyArray<string> => [
  ...walk(join(rootPath(root), "apps/docs/content/docs"), []),
  // The index a collection route generates for a package that writes no
  // landing page. It exists only when the collection ships a page, which is
  // the same condition `collectionIndexOf` answers with `undefined` for.
  ...indexedCollections
    .filter((collection) => collectionPages(root, collection).length > 0)
    .map((collection) => collection.route),
];

/** Every page the mounted package collections ship, at its mounted URL. */
export const packagePageUrls = (root: string | URL): ReadonlyArray<string> =>
  packageCollections.flatMap((collection) =>
    collectionPages(root, collection).map(
      (name) => `${collection.route}/${name.replace(/\.mdx$/, "")}`,
    ),
  );

/**
 * Every path the build prerenders, sorted.
 *
 * `sitemapPaths` already drops a page a curated page replaces and keeps one
 * entry per URL, so a redirect stays a redirect: a retired package URL is not
 * prerendered and the Worker still answers it with its 301.
 *
 * The shadcn registry is **not** here: its index and 158 item documents carry
 * the source of every installed file, and bundling them into the Worker went
 * over Cloudflare's 63.9 MiB ceiling. `plugins/registry-assets-plugin.ts` emits them
 * into the client bundle, so the edge serves them as assets.
 */
export const prerenderPaths = (root: string | URL): ReadonlyArray<string> =>
  [
    ...sitemapPaths(sitePageUrls(root), packagePageUrls(root)),
    ...staticDocumentPaths,
  ]
    .filter((path) => !dynamicPaths.includes(path))
    .toSorted();
