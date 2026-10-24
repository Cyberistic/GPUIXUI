import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import type { LlmsPage } from "./llms";

/**
 * The pages the two machine documents describe, read from the tree on disk.
 *
 * The documents are built from Fumadocs collections, which only the MDX build
 * can load, so a unit test reads the same trees the collections mount instead:
 * `apps/docs/content/docs` for the site's own pages and every
 * `packages/<name>/docs` for the pages the packages ship. A guard written
 * against this seam therefore fails on the file a writer changed, not on a
 * fixture that agreed with it.
 *
 * The body is the authored Markdown with its frontmatter removed. The routes
 * hand the documents `getText("processed")` — the same page with the MDX
 * compiled away — so a page's prose survives this seam even where its JSX does
 * not.
 */

/** One page on disk: its frontmatter and its authored body. */
export interface DocsFile extends LlmsPage {
  /** The Markdown after the frontmatter, as the page writes it. */
  readonly markdown: string;
}

const root = new URL("../../../../", import.meta.url);

const field = (block: string, name: string): string | undefined => {
  const line = block.split("\n").find((entry) => entry.startsWith(`${name}:`));
  return line
    ?.slice(name.length + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
};

/** The frontmatter and the body of one file. */
const readFile = (file: string): Omit<DocsFile, "url"> => {
  const source = readFileSync(file, "utf8");
  const block = /^---\n([\s\S]*?)\n---\n?/.exec(source);
  const title = field(block?.[1] ?? "", "title");

  if (title === undefined) throw new Error(`${file}: no title`);
  return {
    title,
    description: field(block?.[1] ?? "", "description"),
    markdown: source.slice(block?.[0].length ?? 0),
  };
};

const walk = (
  dir: URL,
  slugs: ReadonlyArray<string>,
): ReadonlyArray<DocsFile> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return walk(new URL(`${entry.name}/`, dir), [...slugs, entry.name]);
    }
    if (!entry.name.endsWith(".mdx")) return [];

    const name = entry.name.replace(/\.mdx$/, "");
    const path = name === "index" ? slugs : [...slugs, name];
    return [
      {
        ...readFile(new URL(entry.name, dir).pathname),
        url: `/docs${path.length === 0 ? "" : `/${path.join("/")}`}`,
      },
    ];
  });

/** The site's own pages, at the URLs its collection serves them. */
export const siteDocsFiles = (): ReadonlyArray<DocsFile> =>
  walk(new URL("apps/docs/content/docs/", root), []);

/** The pages every mounted package collection ships. */
export const packageDocsFiles = (): ReadonlyArray<DocsFile> =>
  packageCollections.flatMap((collection) => {
    const dir = new URL(`${collection.dir}/`, root);
    if (!existsSync(dir)) return [];
    return collectionPages(root, collection).map((name) => ({
      ...readFile(join(dir.pathname, name)),
      url: `${collection.route}/${name.replace(/\.mdx$/, "")}`,
    }));
  });
