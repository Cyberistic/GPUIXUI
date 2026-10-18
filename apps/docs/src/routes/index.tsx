import { createFileRoute } from "@tanstack/react-router";
import { DocsView, loadDocsPage } from "@/lib/docs-view";

// The site root serves the docs landing page directly, so `/` is a real
// document rather than a redirect.
export const Route = createFileRoute("/")({
  component: Page,
  loader: () => loadDocsPage({ data: [] }),
});

function Page() {
  return <DocsView data={Route.useLoaderData()} />;
}
