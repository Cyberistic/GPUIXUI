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
import {
  collectionByOrigin,
  packageCollections,
  packageSections,
  type PackageOrigin,
} from "./collection-routes";
import { baseOptions } from "./layout.shared";
import { completeSection } from "./page-tree";
import { docsByOrigin, sectionPages, sourceByOrigin } from "./package-docs";
import { docsRoute } from "./shared";
import { docs, source } from "./source";

/**
 * Which collection a page comes from.
 *
 * `site` is this app's own page; the others are the page the package ships with
 * in `packages/<pkg>/docs`. A curated site page wins its URL, so the site can go
 * deeper on the components it documents first.
 */
type Origin = "site" | PackageOrigin;

/** The sidebar tree, with each package's pages filling its section. */
const pageTree = async () =>
  source.serializePageTree(
    packageSections.reduce(
      (tree, section) =>
        completeSection(
          tree,
          section.name,
          sectionPages(section.origins),
          section.separator,
        ),
      source.getPageTree(),
    ),
  );

/** The mounted collection that owns a `/docs/<segment>` route. */
const collectionAt = (segment: string | undefined) =>
  packageCollections.find(
    (collection) => collection.route === `${docsRoute}/${segment}`,
  );

export const loadDocsPage = createServerFn({ method: "GET" })
  .validator((slugs: string[]) => slugs)
  .handler(async ({ data: slugs }) => {
    const site = source.getPage(slugs);
    if (site) {
      return {
        origin: "site" as const,
        path: site.path,
        url: site.url,
        title: site.data.title,
        description: site.data.description,
        pageTree: await pageTree(),
      };
    }

    // A package collection is mounted under its own route, so the remaining
    // slugs are relative to that prefix.
    const [segment, ...rest] = slugs;
    const collection = collectionAt(segment);
    if (!collection) throw notFound();

    const packaged = sourceByOrigin[collection.origin].getPage(rest);
    if (!packaged) throw notFound();

    return {
      origin: collection.origin,
      path: packaged.path,
      url: packaged.url,
      title: packaged.data.title,
      description: packaged.data.description,
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
 * A page from a package's own collection.
 *
 * The page is the package's own, so it opens with the note that a native
 * preview is not available here and where to run the real component.
 */
function PackageContent({
  origin,
  path,
}: {
  readonly origin: PackageOrigin;
  readonly path: string;
}) {
  const page = docsByOrigin[origin].getPage(path);
  if (!page) throw new Error(`unknown ${origin} page: ${path}`);

  const { toc } = use(page.load());
  const MDX = page.body;
  const collection = collectionByOrigin[origin];

  return (
    <PageFrame
      description={page.description}
      origin={origin}
      path={path}
      title={page.title}
      toc={toc}
    >
      <Callout
        title={`This page ships with the ${collection.kind}`}
        type="info"
      >
        It is rendered from{" "}
        <code>
          {collection.dir}/{path.replace(/\.mdx$/, "")}.mdx
        </code>
        , the page the package maintains. A browser preview is not available for
        this {collection.kind}; run it natively in <code>apps/playground</code>.
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
            <PackageContent origin={data.origin} path={path} />
          )}
        </Suspense>
      </DocsLayout>
    </PlatformProvider>
  );
}
