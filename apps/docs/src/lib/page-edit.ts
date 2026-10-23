import { collectionByOrigin } from "./collection-routes";
import type { PageOrigin } from "./collection-routes";
import { gitConfig } from "./shared";

/**
 * The Markdown file a docs page renders.
 *
 * `MISSION.md` makes a page part of a component's definition, so the reader who
 * finds a wrong sentence is the one who can fix it — but only if the page says
 * which file it is. The path is derived from the same `origin` and `path` the
 * loader hands the frame, so it cannot drift from the page beside it.
 *
 * A curated page shadows the package page with the same URL. The site serves
 * `/docs/components/dialog` from `content/docs`, so that is the file to edit;
 * the package's displaced copy is a page no reader sees.
 */

/** The site's own collection, as the repository path of its directory. */
const siteDir = "apps/docs/content/docs";

/**
 * The collection-relative path as a Markdown file, without a second `.mdx`.
 *
 * A page's `path` arrives as `components/dialog.mdx` from the collection, and
 * the two callers that pass a URL-shaped path are normalised rather than
 * refused: a leading slash is dropped, and `.mdx` is added once.
 */
const markdownFile = (path: string): string =>
  `${path.replace(/^\/+/, "").replace(/\.mdx$/i, "")}.mdx`;

/** The repository-relative Markdown file behind a page. */
export const pageMarkdownPath = (origin: PageOrigin, path: string): string => {
  const file = markdownFile(path);
  return origin === "site"
    ? `${siteDir}/${file}`
    : `${collectionByOrigin[origin].dir}/${file}`;
};

/** The GitHub edit URL for a page's Markdown, on the branch the site publishes. */
export const pageEditUrl = (
  origin: PageOrigin,
  path: string,
  repo: {
    readonly user: string;
    readonly repo: string;
    readonly branch: string;
  } = gitConfig,
): string =>
  `https://github.com/${repo.user}/${repo.repo}/edit/${repo.branch}/${pageMarkdownPath(origin, path)}`;
