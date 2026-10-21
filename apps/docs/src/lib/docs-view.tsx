import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { Callout } from "fumadocs-ui/components/callout";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import type { ComponentProps, ReactNode } from "react";
import { Suspense, use } from "react";
import { mdxComponents } from "@/components/mdx";
import { CopyPage } from "@/components/docs/copy-page";
import {
  PlatformProvider,
  PlatformToggle,
} from "@/components/docs/platform-toggle";
import { componentDocs, componentSource } from "./component-docs";
import { baseOptions } from "./layout.shared";
import { completeSection } from "./page-tree";
import { docs, source } from "./source";

/**
 * Which collection a page comes from.
 *
 * `site` is this app's own page for a component; `package` is the page the
 * component ships with in `packages/components/docs`. A curated site page wins,
 * so the site can go deeper on the components it documents first.
 */
type Origin = "site" | "package";

/** The sidebar tree, with the package's component pages filled in. */
const pageTree = async () =>
  source.serializePageTree(
    completeSection(
      source.getPageTree(),
      "Components",
      componentSource.getPages().map((page) => ({
        name: page.data.title,
        url: page.url,
      })),
    ),
  );

export const loadDocsPage = createServerFn({ method: "GET" })
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const site = source.getPage(slugs);
    if (site) {
      return {
        origin: "site" as const,
        path: site.path,
        pageTree: await pageTree(),
      };
    }

    // The package collection is mounted under `/docs/components`, so its
    // slugs are relative to that prefix.
    const packaged = componentSource.getPage(slugs.slice(1));
    if (!packaged) throw notFound();

    return {
      origin: "package" as const,
      path: packaged.path,
      pageTree: await pageTree(),
    };
  });

type DocsPageData = Awaited<ReturnType<typeof loadDocsPage>>;

/** The page frame both collections render into. */
function PageFrame({
  title,
  description,
  toc,
  path,
  origin,
  children,
}: {
  readonly title: ReactNode;
  readonly description: ReactNode;
  readonly toc: ComponentProps<typeof DocsPage>["toc"];
  readonly path: string;
  readonly origin: Origin;
  readonly children: ReactNode;
}) {
  return (
    <DocsPage id={`page-${path}`} toc={toc}>
      <div className="flex items-start justify-between gap-4">
        <DocsTitle>{title}</DocsTitle>
        <CopyPage origin={origin} path={path} />
      </div>
      <DocsDescription>{description}</DocsDescription>
      <DocsBody>{children}</DocsBody>
    </DocsPage>
  );
}

/** A page from this site's own collection. */
function SiteContent({ path }: { path: string }) {
  const page = docs.getPage(path);
  if (!page) throw new Error(`unknown page: ${path}`);

  const { toc } = use(page.load());
  const MDX = page.body;

  return (
    <PageFrame
      description={page.description}
      origin="site"
      path={path}
      title={page.title}
      toc={toc}
    >
      <MDX components={mdxComponents} />
    </PageFrame>
  );
}

/**
 * A page from the component package's collection.
 *
 * The page is the package's own, so it opens with the note that a native
 * preview is not available here and where to run the real component.
 */
function PackageContent({ path }: { path: string }) {
  const page = componentDocs.getPage(path);
  if (!page) throw new Error(`unknown component page: ${path}`);

  const { toc } = use(page.load());
  const MDX = page.body;

  return (
    <PageFrame
      description={page.description}
      origin="package"
      path={path}
      title={page.title}
      toc={toc}
    >
      <Callout title="This page ships with the component" type="info">
        It is rendered from{" "}
        <code>packages/components/docs/{path.replace(/\.mdx$/, "")}.mdx</code>,
        the page the package maintains. A browser preview is not available for
        this component; run it natively in <code>apps/playground</code>.
      </Callout>
      <MDX components={mdxComponents} />
    </PageFrame>
  );
}

/** Renders one page of either collection inside the shared docs layout. */
export function DocsView({ data }: { data: DocsPageData }) {
  const { path, pageTree: tree } = useFumadocsLoader(data);

  return (
    <PlatformProvider>
      <DocsLayout
        {...baseOptions()}
        sidebar={{ footer: <PlatformToggle /> }}
        tree={tree}
      >
        <Suspense>
          {data.origin === "site" ? (
            <SiteContent path={path} />
          ) : (
            <PackageContent path={path} />
          )}
        </Suspense>
      </DocsLayout>
    </PlatformProvider>
  );
}
