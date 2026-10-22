import index from "virtual:gpuixui-page-dependencies";
import type { PageDependencyIndex } from "./page-dependencies";

/**
 * The packages each package page's component imports, read at build time.
 *
 * The Vite plugin (`plugins/page-dependencies-plugin.ts`) opens the pages and
 * the modules once, so the strip never ships the workspace to read it. The
 * shape is the model in `page-dependencies.ts`.
 */
export const pageDependencies: PageDependencyIndex = index;
