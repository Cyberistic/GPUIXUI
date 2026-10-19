import { createFileRoute } from "@tanstack/react-router";
import { DocsView, loadDocsPage } from "@/lib/docs-view";

export const Route = createFileRoute("/docs/$")({
  component: Page,
  loader: ({ params }) =>
    loadDocsPage({
      data: params._splat?.split("/").filter(Boolean) ?? [],
    }),
});

function Page() {
  return <DocsView data={Route.useLoaderData()} />;
}
