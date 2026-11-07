import { loaders, pages, unresolved } from "virtual:gpuixui-page-sources";
import { pageSourceIndex, type PageSourceIndex } from "./page-source";

export const pageSources: PageSourceIndex = pageSourceIndex(pages, loaders);

export const unresolvedPageSources: ReadonlyArray<string> = unresolved;
