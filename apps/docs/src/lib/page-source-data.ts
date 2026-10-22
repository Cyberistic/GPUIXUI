import { loaders, pages, unresolved } from "virtual:gpuixui-page-sources";
import { pageSourceIndex, type PageSourceIndex } from "./page-source";

/**
 * The implementation behind every package page, read at build time.
 *
 * The Vite plugin (`plugins/page-source-plugin.ts`) resolves each page's module
 * once and hands over a loader per page; the model in `page-source.ts` pairs
 * them and reports a page it cannot read.
 */
export const pageSources: PageSourceIndex = pageSourceIndex(pages, loaders);

/** Pages whose module has no loader. The build fails its guard, not the reader. */
export const unresolvedPageSources: ReadonlyArray<string> = unresolved;
