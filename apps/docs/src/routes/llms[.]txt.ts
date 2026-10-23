import { createFileRoute } from "@tanstack/react-router";
import { llmsContentType, llmsTxt, type LlmsPage } from "@/lib/llms";
import { packageSources } from "@/lib/package-docs";
import { source } from "@/lib/source";

/**
 * `/llms.txt`, generated on request from the collections that serve the pages.
 *
 * The route is thin on purpose: the document's shape and its section rules live
 * in `src/lib/llms.ts`, where they are tested without the MDX build. This file
 * only hands it the pages — the site's own collection first, so a curated page
 * wins the URL it shares with a package page.
 */

interface DocumentedPage {
  readonly url: string;
  readonly data: { readonly title: string; readonly description?: string };
}

const toPage = (page: DocumentedPage): LlmsPage => ({
  url: page.url,
  title: page.data.title,
  description: page.data.description,
});

const index = (): string =>
  llmsTxt(
    source.getPages().map(toPage),
    packageSources.flatMap((packaged) => packaged.getPages().map(toPage)),
  );

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(index(), {
          headers: { "content-type": llmsContentType },
        }),
    },
  },
});
