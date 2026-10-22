import { defineConfig, defineDocs } from "fumadocs-mdx/config";

// Docs content lives in apps/docs/content/docs/<page>.mdx.
export const docs = defineDocs({ dir: "content/docs" });

// The packages' own documentation, rendered as-is rather than copied:
// `packages/<pkg>/docs/<name>.mdx` is the page a component ships with, so the
// site and the package cannot disagree about it. `files` keeps a package's
// README (human notes, no frontmatter) out of the collection.
export const primitiveDocs = defineDocs({
  dir: "../../packages/primitives/docs",
  docs: { files: ["**/*.mdx"] },
});

export const iconDocs = defineDocs({
  dir: "../../packages/icons/docs",
  docs: { files: ["**/*.mdx"] },
});

export const componentDocs = defineDocs({
  dir: "../../packages/components/docs",
  docs: { files: ["**/*.mdx"] },
});

export const dataDocs = defineDocs({
  dir: "../../packages/data/docs",
  docs: { files: ["**/*.mdx"] },
});

export default defineConfig();
