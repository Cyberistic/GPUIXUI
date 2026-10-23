import { createFileRoute, redirect } from "@tanstack/react-router";
import { curatedRedirect } from "@/lib/curated-twins";
import { DocsView, loadDocsPage } from "@/lib/docs-view";
import { docsMetadata } from "@/lib/page-meta";
import { appName, docsRoute } from "@/lib/shared";

/**
 * A docs page. Its title, description and canonical URL come from the loader,
 * which is the page that is rendering; the fallback only covers the type, where
 * `loaderData` is optional because the route declares a loader at all.
 *
 * A package page a curated page replaces redirects before the loader runs, so
 * a reader who followed an older address lands on the one page that documents
 * the component (`curated-twins.ts`). The query travels with them, so a
 * `?platform=` or `?mode=` link keeps the theme it was shared with.
 */
export const Route = createFileRoute("/docs/$")({
  component: Page,
  beforeLoad: ({ location, params }) => {
    const url = params._splat ? `${docsRoute}/${params._splat}` : docsRoute;
    const target = curatedRedirect(url, location.searchStr);
    if (target !== undefined) {
      throw redirect({ href: target, statusCode: 301 });
    }
  },
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
