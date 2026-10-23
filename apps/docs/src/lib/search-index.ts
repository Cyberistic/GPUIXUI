/**
 * The search index's page list.
 *
 * The site mounts each package's own Fumadocs collection and indexes every one, but a
 * curated site page keeps the URL of the package page it shadows: indexing both
 * would give the index two documents with one id, so a query returns the same
 * result twice and the reader cannot tell which page is current.
 */
export interface SearchPage {
  readonly url: string;
}

/**
 * The site's pages followed by every package page whose URL is still free.
 *
 * Site pages win; then the package collections keep their sidebar order.
 */
export const uniqueSearchPages = <Page extends SearchPage>(
  site: ReadonlyArray<Page>,
  packages: ReadonlyArray<ReadonlyArray<Page>>,
): Array<Page> => {
  const seen = new Set<string>();

  return [...site, ...packages.flat()].filter((page) => {
    if (seen.has(page.url)) return false;
    seen.add(page.url);
    return true;
  });
};
