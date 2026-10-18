import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import { docsRoute } from "./shared";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    async: true,
    postprocess: { includeProcessedMarkdown: true },
  },
});

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: docsRoute,
});
