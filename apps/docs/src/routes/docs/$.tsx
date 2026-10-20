import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
} from "fumadocs-ui/layouts/docs/page";
import { Suspense, use } from "react";
import { useMDXComponents } from "@/components/mdx";
import { SkipLink } from "@/components/skip-link";
import { baseOptions } from "@/lib/layout.shared";
import { getPageMarkdownUrl } from "@/lib/page-markdown";
import { docsPageHead, docsPageMeta } from "@/lib/page-meta";
import { docs, source } from "@/lib/source";

export const Route = createFileRoute("/docs/$")({
  component: Page,
  loader: async ({ params }) => {
    const slugs = params._splat?.split("/") ?? [];
    const data = await serverLoader({ data: slugs });
    await docs.getPage(data.path)?.preload();
    return data;
  },
  head: ({ loaderData }) =>
    loaderData === undefined ? {} : docsPageHead(loaderData.meta),
});

const serverLoader = createServerFn({ method: "GET" })
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);
    if (!page) throw notFound();

    return {
      path: page.path,
      markdownUrl: getPageMarkdownUrl(page).url,
      meta: docsPageMeta(page),
      pageTree: await source.serializePageTree(source.getPageTree()),
    };
  });

function Content({ path, markdownUrl }: { path: string; markdownUrl: string }) {
  const page = docs.getPage(path);
  if (!page) throw new Error(`unknown page: ${path}`);

  const { toc } = use(page.load());
  const MDX = page.body;

  return (
    <DocsPage toc={toc} tabIndex={-1} data-skip-target="">
      <DocsTitle>{page.title}</DocsTitle>
      <DocsDescription>{page.description}</DocsDescription>
      <div className="flex flex-row items-center gap-2 border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <a
          href={markdownUrl}
          className="rounded-md border border-fd-border px-3 py-1.5 text-sm hover:bg-fd-accent"
        >
          View as Markdown
        </a>
      </div>
      <DocsBody>
        <MDX components={useMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

function Page() {
  const data = useFumadocsLoader(Route.useLoaderData());

  return (
    <>
      <SkipLink href="#nd-page" />
      <DocsLayout {...baseOptions()} tree={data.pageTree}>
        <Suspense>
          <Content path={data.path} markdownUrl={data.markdownUrl} />
        </Suspense>
      </DocsLayout>
    </>
  );
}
