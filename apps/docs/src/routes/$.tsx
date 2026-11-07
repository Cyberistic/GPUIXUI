import { createFileRoute, redirect } from "@tanstack/react-router";
import { curatedRedirect } from "@/lib/curated-twins";
import { DocsView, loadDocsPage } from "@/lib/docs-view";
import { docsMetadata } from "@/lib/page-meta";
import { appName, docsRoute } from "@/lib/shared";

export const Route = createFileRoute("/$")({
  component: Page,
  beforeLoad: ({ location, params }) => {
    const url = `${docsRoute}/${params._splat ?? ""}`;
    const target = curatedRedirect(url, location.searchStr);
    if (target !== undefined) {
      throw redirect({ href: target, statusCode: 301 });
    }
  },
  loader: ({ params }) =>
    loadDocsPage({ data: (params._splat ?? "").split("/").filter(Boolean) }),
  head: ({ loaderData, params }) =>
    docsMetadata(
      loaderData ?? {
        url: `${docsRoute}/${params._splat ?? ""}`,
        title: appName,
      },
    ),
});

function Page() {
  return <DocsView data={Route.useLoaderData()} />;
}
