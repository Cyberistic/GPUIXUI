import { frontmatterField, frontmatterOf } from "./frontmatter";

/**
 * The all-blocks index.
 *
 * Every block is a page under `content/docs/blocks`, and each page's frontmatter
 * already states its title and its one-line description. The list is built from
 * those pages, so a block that lands appears here in the same commit with no
 * second list to keep. `index.mdx` and `all.mdx` are the two pages that list
 * blocks rather than being one.
 */

/** One row: the block's page, and what that page says it is. */
export interface BlockPage {
  /** The page's file name, i.e. its slug under `/docs/blocks`. */
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  /** The page's own address. */
  readonly url: string;
}

/** The slugs of the pages that are indexes, not blocks. */
const listPages: ReadonlyArray<string> = ["index", "all"];

const slugOf = (file: string): string =>
  (file.split("/").at(-1) ?? file).replace(/\.mdx$/, "");

/**
 * Every block page, in title order.
 *
 * `files` is the glob's map of page path to source; the loader is a module so
 * the build and the tests read the same pages.
 */
export const blockPages = (
  files: Readonly<Record<string, string>>,
  baseUrl: string,
): ReadonlyArray<BlockPage> =>
  Object.entries(files)
    .flatMap(([file, source]): BlockPage[] => {
      const slug = slugOf(file);
      if (listPages.includes(slug)) return [];
      const head = frontmatterOf(source);
      return [
        {
          slug,
          title: frontmatterField(head, "title") ?? slug,
          description: frontmatterField(head, "description") ?? "",
          url: `${baseUrl}/${slug}`,
        },
      ];
    })
    .toSorted((left, right) => left.title.localeCompare(right.title));
