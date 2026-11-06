import { servedPages } from "./curated-twins";

export interface SearchPage {
  readonly url: string;
}

export const uniqueSearchPages = <Page extends SearchPage>(
  site: ReadonlyArray<Page>,
  packages: ReadonlyArray<ReadonlyArray<Page>>,
): Array<Page> => {
  const seen = new Set<string>();

  return [...site, ...packages.map(servedPages).flat()].filter((page) => {
    if (seen.has(page.url)) return false;
    seen.add(page.url);
    return true;
  });
};
