import { blockPages } from "./block-index";

/**
 * The all-blocks index, read at build time.
 *
 * The glob is the folder: a block page that lands is in the list before anyone
 * edits a docs file.
 */
const files = import.meta.glob("../../content/docs/blocks/*.mdx", {
  eager: true,
  query: "?raw",
  import: "default",
});

export const allBlocks = blockPages(files, "/blocks");
