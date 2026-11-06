export type SourceLoader = () => Promise<string>;

export interface PageSource {
  readonly module: string;
  readonly load: SourceLoader;
}

export interface PageSourceIndex {
  readonly sources: Readonly<Record<string, PageSource>>;

  readonly unresolved: ReadonlyArray<string>;
}

const remembered = (load: SourceLoader): SourceLoader =>
  (() => {
    let reading: Promise<string> | undefined;
    return () => (reading ??= load());
  })();

export const pageSourceIndex = (
  pages: ReadonlyArray<{ readonly url: string; readonly module: string }>,
  loaders: Readonly<Record<string, SourceLoader>>,
): PageSourceIndex =>
  pages.reduce<{
    sources: Record<string, PageSource>;
    unresolved: string[];
  }>(
    (index, page) => {
      const load = loaders[page.module];
      return load === undefined
        ? { ...index, unresolved: [...index.unresolved, page.url] }
        : {
            ...index,
            sources: {
              ...index.sources,
              [page.url]: { module: page.module, load: remembered(load) },
            },
          };
    },
    { sources: {}, unresolved: [] },
  );

export const githubUrl = (
  repo: {
    readonly user: string;
    readonly repo: string;
    readonly branch: string;
  },
  module: string,
): string =>
  `https://github.com/${repo.user}/${repo.repo}/blob/${repo.branch}/${module}`;
