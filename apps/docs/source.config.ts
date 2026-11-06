import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { codeOptions } from "./src/lib/code-theme";
import { mermaidFence } from "./src/lib/remark-mermaid";

export const docs = defineDocs({ dir: "content/docs" });

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

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [mermaidFence],
    rehypeCodeOptions: codeOptions,
  },
});
