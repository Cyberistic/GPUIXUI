import { createFileRoute } from "@tanstack/react-router";
import { DocsView, loadDocsPage } from "@/lib/docs-view";
import { docsMetadata } from "@/lib/page-meta";
import { appName, docsRoute } from "@/lib/shared";

/**
 * A docs page. Its title, description and canonical URL come from the loader,
 * which is the page that is rendering; the fallback only covers the type, where
 * `loaderData` is optional because the route declares a loader at all.
 */
export const Route = createFileRoute("/docs/$")({
  component: Page,
  loader: ({ params }) =>
    loadDocsPage({
      data: params._splat?.split("/").filter(Boolean) ?? [],
    }),
  head: ({ loaderData, params }) =>
    docsMetadata(
      loaderData ?? {
        url: params._splat ? `${docsRoute}/${params._splat}` : docsRoute,
        title: appName,
      },
    ),
});

function Page() {
  return <DocsView data={Route.useLoaderData()} />;
}
