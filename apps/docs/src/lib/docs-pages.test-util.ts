import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import type { LlmsPage } from "./llms";

export interface DocsFile extends LlmsPage {
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
        url: `/${path.join("/")}`,
      },
    ];
  });

export const siteDocsFiles = (): ReadonlyArray<DocsFile> =>
  walk(new URL("apps/docs/content/docs/", root), []);

export const packageDocsFiles = (): ReadonlyArray<DocsFile> =>
  packageCollections.flatMap((collection) => {
    const dir = new URL(`${collection.dir}/`, root);
    if (!existsSync(dir)) return [];
    return collectionPages(root, collection).map((name) => {
      const page = name.replace(/\.mdx$/, "");
      return {
        ...readFile(join(dir.pathname, name)),

        url:
          page === "index" ? collection.route : `${collection.route}/${page}`,
      };
    });
  });
