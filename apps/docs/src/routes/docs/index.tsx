import { createFileRoute } from "@tanstack/react-router";
import { DocsView, loadDocsPage } from "@/lib/docs-view";

export const Route = createFileRoute("/docs/")({
  component: Page,
  loader: () => loadDocsPage({ data: [] }),
});

function Page() {
  return <DocsView data={Route.useLoaderData()} />;
}
