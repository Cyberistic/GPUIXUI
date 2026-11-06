import { blockPages } from "./block-index";

const files = import.meta.glob("../../content/docs/blocks/*.mdx", {
  eager: true,
  query: "?raw",
  import: "default",
});

export const allBlocks = blockPages(files, "/blocks");
