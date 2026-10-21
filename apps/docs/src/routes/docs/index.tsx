import { createFileRoute } from "@tanstack/react-router";
import { DocsView, loadDocsPage } from "@/lib/docs-view";
import { docsMetadata } from "@/lib/page-meta";
import { appName, docsRoute } from "@/lib/shared";

export const Route = createFileRoute("/docs/")({
  component: Page,
  loader: () => loadDocsPage({ data: [] }),
  head: ({ loaderData }) =>
    docsMetadata(loaderData ?? { url: docsRoute, title: appName }),
});

function Page() {
  return <DocsView data={Route.useLoaderData()} />;
}
