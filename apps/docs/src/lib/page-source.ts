/**
 * The implementation behind a package page.
 *
 * `MISSION.md` asks every component page for copyable source, and the pages the
 * packages ship are Markdown the site mounts: they can describe the component
 * but cannot embed it. This module is the model the site renders for them — the
 * module the page documents (`page-dependencies-source.ts` resolves it from the
 * published symbol) paired with a loader that reads that module's own text.
 *
 * Pure: the plugin hands over the loaders, the tests hand over fixtures, and
 * nothing here reads the filesystem or the network.
 */

/** Reads one module's text. The build-time loader caches its own result. */
export type SourceLoader = () => Promise<string>;

/** The module a package page documents, and how to read it. */
export interface PageSource {
  /** Repository-relative path, shown as the block's title and linked on GitHub. */
  readonly module: string;
  readonly load: SourceLoader;
}

export interface PageSourceIndex {
  /** Every mounted package page, keyed by the URL it renders at. */
  readonly sources: Readonly<Record<string, PageSource>>;
  /** Pages whose module the site could not read. Must stay empty. */
  readonly unresolved: ReadonlyArray<string>;
}

/**
 * A loader that reads once.
 *
 * A component may render several times before the promise settles, and `use()`
 * on a fresh promise every render would suspend forever. One promise per page
 * is also what the accordion's collapsed state needs: reopening it does not
 * spawn a second read.
 */
const remembered = (load: SourceLoader): SourceLoader =>
  (() => {
    let reading: Promise<string> | undefined;
    return () => (reading ??= load());
  })();

/**
 * Pair each page's module with the loader that reads it.
 *
 * A page whose module has no loader is reported rather than rendered as an
 * empty block: a Code tab that prints nothing is the same lie as a wrong path.
 */
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

/** The GitHub URL for the module, so the block links the file it prints. */
export const githubUrl = (
  repo: {
    readonly user: string;
    readonly repo: string;
    readonly branch: string;
  },
  module: string,
): string =>
  `https://github.com/${repo.user}/${repo.repo}/blob/${repo.branch}/${module}`;
