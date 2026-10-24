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
import type { ComponentProps, ReactNode } from "react";
import { Suspense, use } from "react";
import { mdxComponents } from "@/components/mdx";
import { CollectionIndexPage } from "@/components/docs/collection-index";
import { CopyPage } from "@/components/docs/copy-page";
import { EditPage } from "@/components/docs/edit-page";
import { KeyboardStrip } from "@/components/docs/keyboard-strip";
import { MountedPreview } from "@/components/docs/mounted-preview";
import { PackageSource } from "@/components/docs/package-source";
import { mainContentId } from "@/components/skip-link";
import { RelatedStrip } from "@/components/docs/related-strip";
import {
  ContentMounted,
  PlatformProvider,
  PlatformToggle,
} from "@/components/docs/platform-toggle";
import { collectionIndexOf } from "./collection-index";
import {
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
 * Which collection a page's Markdown lives in.
 *
 * `site` is this app's own page; the others are the page the package ships with
 * in `packages/<pkg>/docs`. A curated site page wins its URL, so the site can go
 * deeper on the components it documents first. A collection route with neither
 * a site page nor a package index answers with the page `collection-index.ts`
 * generates, which carries no Markdown and so never reaches this frame.
 */
type PageOrigin = "site" | PackageOrigin;

/** The sidebar tree, with each package's pages filling its section. */
const pageTree = async () =>
  source.serializePageTree(
    packageSections.reduce(
      (tree, section) =>
        completeSection(tree, section.name, sectionPages(section.origins)),
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
    if (packaged) {
      return {
        origin: collection.origin,
        path: packaged.path,
        url: packaged.url,
        title: packaged.data.title,
        description: packaged.data.description,
        pageTree: await pageTree(),
      };
    }

    // The collection's own route: the package may write no landing page, so the
    // site generates one from the pages it mounts rather than answering 404.
    if (rest.length === 0) {
      const index = collectionIndexOf(
        collection,
        sourceByOrigin[collection.origin].getPages().map((page) => ({
          title: page.data.title,
          description: page.data.description,
          url: page.url,
        })),
      );
      if (index !== undefined) {
        return {
          origin: "index" as const,
          url: index.url,
          title: index.title,
          description: index.description,
          index,
          pageTree: await pageTree(),
        };
      }
    }

    throw notFound();
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
  readonly origin: PageOrigin;
  readonly children: ReactNode;
}) {
  return (
    <DocsPage id={mainContentId} tabIndex={-1} toc={toc}>
      <div className="flex items-start justify-between gap-4">
        <DocsTitle>{title}</DocsTitle>
        <CopyPage origin={origin} path={path} />
      </div>
      <DocsDescription>{description}</DocsDescription>
      <DocsBody>
        {children}
        <EditPage origin={origin} path={path} />
      </DocsBody>
    </DocsPage>
  );
}

/** A page from this site's own collection. */
function SiteContent({ path, url }: { path: string; url: string }) {
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
      <KeyboardStrip sections={toc.map((entry) => entry.url)} url={url} />
      <RelatedStrip sections={toc.map((entry) => entry.url)} url={url} />
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
  url,
}: {
  readonly origin: PackageOrigin;
  readonly path: string;
  readonly url: string;
}) {
  const page = docsByOrigin[origin].getPage(path);
  if (!page) throw new Error(`unknown ${origin} page: ${path}`);

  const { toc } = use(page.load());
  const MDX = page.body;

  return (
    <PageFrame
      description={page.description}
      origin={origin}
      path={path}
      title={page.title}
      toc={toc}
    >
      <MountedPreview origin={origin} path={path} />
      <MDX components={mdxComponents} />
      <KeyboardStrip sections={toc.map((entry) => entry.url)} url={url} />
      <PackageSource url={url} />
      <RelatedStrip sections={toc.map((entry) => entry.url)} url={url} />
    </PageFrame>
  );
}

/** Renders one page of either collection inside the shared docs layout. */
export function DocsView({ data }: { data: DocsPageData }) {
  const { pageTree: tree } = useFumadocsLoader(data);

  return (
    <PlatformProvider>
      <DocsLayout
        {...baseOptions()}
        sidebar={{ footer: <PlatformToggle /> }}
        tree={tree}
      >
        <Suspense>
          {data.origin === "index" ? (
            <CollectionIndexPage index={data.index} />
          ) : data.origin === "site" ? (
            <SiteContent path={data.path} url={data.url} />
          ) : (
            <PackageContent
              origin={data.origin}
              path={data.path}
              url={data.url}
            />
          )}
          {/* Reports the content above has mounted, so the switch in the
              sidebar can enable the choices that repaint it. */}
          <ContentMounted />
        </Suspense>
      </DocsLayout>
    </PlatformProvider>
  );
}
