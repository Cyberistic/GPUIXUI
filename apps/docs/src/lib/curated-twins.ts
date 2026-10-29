import { componentDocsRoute, primitiveDocsRoute } from "./shared";

/**
 * The primitive pages the Components section curates instead.
 *
 * Five Tier 1 components are documented in depth under `/components`,
 * with previews, an install block and copyable source, while the package still
 * ships its own page for each at `/primitives/<name>`. Serving both gave
 * one component two live pages with one title: the sidebar listed it twice, a
 * search returned it twice, and the sitemap advertised two addresses for it.
 *
 * The curated page is canonical — it is the fuller page, and the Components
 * section is where a reader browses a component. So the package URL redirects
 * to it, and the sidebar, the search index, the sitemap and `/llms.txt` carry
 * one address. The package keeps its Markdown; the site just does not render a
 * second copy of the same component under a second section.
 */
export interface CuratedTwin {
  /** The package page a reader no longer lands on. */
  readonly retired: string;
  /** The curated page that documents the same component. */
  readonly curated: string;
}

/** The components whose package page the curated page replaces. */
export const curatedPrimitiveTwins: ReadonlyArray<CuratedTwin> = [
  "button",
  "checkbox",
  "select",
  "switch",
  "tooltip",
].map((name) => ({
  retired: `${primitiveDocsRoute}/${name}`,
  curated: `${componentDocsRoute}/${name}`,
}));

/** The curated page for a retired package URL, if there is one. */
export const curatedTwinOf = (url: string): string | undefined =>
  curatedPrimitiveTwins.find((twin) => twin.retired === url)?.curated;

/** The pages the site serves: a retired twin is redirected, not rendered. */
export const servedPages = <Page extends { readonly url: string }>(
  pages: ReadonlyArray<Page>,
): Page[] => pages.filter((page) => curatedTwinOf(page.url) === undefined);

/** The URLs the site serves, for the lists that hold paths rather than pages. */
export const servedUrls = (urls: ReadonlyArray<string>): string[] =>
  urls.filter((url) => curatedTwinOf(url) === undefined);

/**
 * Where a request for a retired page goes, carrying the reader's query.
 *
 * `searchStr` is the location's own string, leading `?` included, so a
 * `?platform=win32` a reader followed survives the redirect.
 */
export const curatedRedirect = (
  url: string,
  searchStr: string,
): string | undefined => {
  const curated = curatedTwinOf(url);
  if (curated === undefined) return undefined;
  return `${curated}${searchStr.startsWith("?") ? searchStr : ""}`;
};
