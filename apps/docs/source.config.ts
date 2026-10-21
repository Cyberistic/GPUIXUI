import { defineConfig, defineDocs } from "fumadocs-mdx/config";

// Docs content lives in apps/docs/content/docs/<page>.mdx.
export const docs = defineDocs({ dir: "content/docs" });

// The component package's own documentation, rendered as-is rather than copied:
// `packages/components/docs/<name>.mdx` is the page a component ships with, so
// the site and the package cannot disagree about it.
export const componentDocs = defineDocs({
  dir: "../../packages/components/docs",
});

export default defineConfig();
