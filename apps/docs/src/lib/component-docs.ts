import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import { componentDocsRoute } from "./shared";

/**
 * The component package's documentation.
 *
 * `packages/components/docs/<name>.mdx` is what a component ships with: its
 * anatomy, usage, keyboard contract, API table and limitations. The site renders
 * those files rather than copying them, so the page a reader sees and the page
 * the package maintains are the same page.
 */
export const componentDocs = defineDocs({
  dir: "../../packages/components/docs",
  docs: {
    async: true,
    postprocess: { includeProcessedMarkdown: true },
  },
});

export const componentSource = loader({
  source: componentDocs.toFumadocsSource(),
  baseUrl: componentDocsRoute,
});
