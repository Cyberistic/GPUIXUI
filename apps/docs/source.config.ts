import { defineConfig, defineDocs } from "fumadocs-mdx/config";

// Docs content lives in apps/docs/content/docs/<page>.mdx.
export const docs = defineDocs({ dir: "content/docs" });

export default defineConfig();
