import index from "virtual:gpuixui-public-symbols";
import type { PublicSymbolIndex } from "./public-symbols";

/**
 * The public symbol index, read at build time.
 *
 * The Vite plugin (`plugins/public-symbols-plugin.ts`) walks the packages'
 * source once and serves the result as a module, so the page never ships the
 * workspace to read it. The shape is the model in `public-symbols.ts`.
 */
export const publicSymbolIndex: PublicSymbolIndex = index;
