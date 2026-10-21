import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { Suspense, use } from "react";
import { mdxComponents } from "@/components/mdx";
import { CopyPage } from "@/components/docs/copy-page";
import {
  PlatformProvider,
  PlatformToggle,
} from "@/components/docs/platform-toggle";
import { baseOptions } from "./layout.shared";
import { docs, source } from "./source";

export const loadDocsPage = createServerFn({ method: "GET" })
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const page = source.getPage(slugs);
    if (!page) throw notFound();
    return {
      path: page.path,
      pageTree: await source.serializePageTree(source.getPageTree()),
    };
  });

type DocsPageData = Awaited<ReturnType<typeof loadDocsPage>>;

function Content({ path }: { path: string }) {
  const page = docs.getPage(path);
  if (!page) throw new Error(`unknown page: ${path}`);

  const { toc } = use(page.load());
  const MDX = page.body;

  return (
    <DocsPage id={`page-${path}`} toc={toc}>
      <div className="flex items-start justify-between gap-4">
        <DocsTitle>{page.title}</DocsTitle>
        <CopyPage path={path} />
      </div>
      <DocsDescription>{page.description}</DocsDescription>
      <DocsBody>
        <MDX components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

/** Renders one page of the docs collection inside the shared docs layout. */
export function DocsView({ data }: { data: DocsPageData }) {
  const { path, pageTree } = useFumadocsLoader(data);

  return (
    <PlatformProvider>
      <DocsLayout
        {...baseOptions()}
        sidebar={{ footer: <PlatformToggle /> }}
        tree={pageTree}
      >
        <Suspense>
          <Content path={path} />
        </Suspense>
      </DocsLayout>
    </PlatformProvider>
  );
}
