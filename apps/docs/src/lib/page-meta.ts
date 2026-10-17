/**
 * The document head of a documentation page (plan 413).
 *
 * Without this every page inherits the root title and description, so tabs,
 * search results and shared links cannot tell fifteen pages apart. The mapping
 * reads the page the Fumadocs loader already returned: no page text is retyped
 * here, so a title cannot drift from its frontmatter.
 *
 * Absence is `| undefined` rather than `Option`, as in `captures.ts`: this
 * module is in the client bundle, and importing `effect` would ship the whole
 * runtime to the browser (plan 411 §5).
 */

const siteName = "GPUIXUI";

/** The page fields the head is built from, read structurally from a Fumadocs page. */
export interface DocsPageLike {
  readonly url: string;
  readonly data: {
    /**
     * Optional in `fumadocs-core`'s `PageData`, required by the frontmatter
     * schema the loader validates against — see `requireTitle`.
     */
    readonly title?: string | undefined;
    readonly description?: string | undefined;
  };
}

/** What one page contributes to the document head. */
export interface DocsPageMeta {
  readonly title: string;
  readonly description: string | undefined;
  readonly url: string;
}

/**
 * A page whose frontmatter lost its title. Unreachable for content that built:
 * `fumadocs-mdx` validates frontmatter with a schema that requires `title`. It
 * exists because that guarantee is not in the types, and a page must never
 * borrow the site title instead of failing loudly.
 */
export class DocsPageTitleMissing extends Error {
  constructor(url: string) {
    super(`The docs page "${url}" has no frontmatter title.`);
    this.name = "DocsPageTitleMissing";
  }
}

/** Every page title carries the site name, so two tabs never read the same. */
export const docsPageTitle = (title: string): string =>
  `${title} — ${siteName}`;

const requireTitle = (page: DocsPageLike): string => {
  const title = page.data.title;
  if (title === undefined || title.trim().length === 0) {
    throw new DocsPageTitleMissing(page.url);
  }
  return title;
};

export const docsPageMeta = (page: DocsPageLike): DocsPageMeta => ({
  title: requireTitle(page),
  description: page.data.description,
  url: page.url,
});

/** A blank description is absent: an empty tag would replace the root's with nothing. */
const hasDescription = (
  description: string | undefined,
): description is string =>
  description !== undefined && description.trim().length > 0;

/** The `head()` payload TanStack Router merges into the document. */
export const docsPageHead = (meta: DocsPageMeta) => ({
  meta: [
    { title: docsPageTitle(meta.title) },
    ...(hasDescription(meta.description)
      ? [
          { name: "description", content: meta.description },
          { property: "og:description", content: meta.description },
        ]
      : []),
    { property: "og:title", content: meta.title },
    { property: "og:type", content: "article" },
  ],
  links: [{ rel: "canonical", href: meta.url }],
});
