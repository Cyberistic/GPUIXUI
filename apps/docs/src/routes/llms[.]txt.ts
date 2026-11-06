import { createFileRoute } from "@tanstack/react-router";
import { collectionIndexPages } from "@/lib/collection-index";
import { llmsContentType, llmsTxt, type LlmsPage } from "@/lib/llms";
import { packageSources } from "@/lib/package-docs";
import { source } from "@/lib/source";

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
    [...source.getPages().map(toPage), ...collectionIndexPages()],
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
