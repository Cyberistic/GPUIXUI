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
import {
  ContentMounted,
  PlatformProvider,
  PlatformToggle,
} from "@/components/docs/platform-toggle";
import { collectionIndexOf } from "./collection-index";
import {
  collectionAt,
  packageSections,
  type PackageOrigin,
} from "./collection-routes";
import { baseOptions } from "./layout.shared";
import { completeSection } from "./page-tree";
import { descriptionRuns } from "./page-description";
import { docsByOrigin, sectionPages, sourceByOrigin } from "./package-docs";
import { docs, source } from "./source";

type PageOrigin = "site" | PackageOrigin;

const pageTree = async () =>
  source.serializePageTree(
    packageSections.reduce(
      (tree, section) =>
        completeSection(tree, section.name, sectionPages(section.origins)),
      source.getPageTree(),
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
        url: site.url,
        title: site.data.title,
        description: site.data.description,
        pageTree: await pageTree(),
      };
    }

    const found = collectionAt(slugs);
    if (!found) throw notFound();
    const { collection, rest } = found;

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

const Description = ({ text }: { readonly text: string }) =>
  text === "" ? null : (
    <DocsDescription>
      {descriptionRuns(text).map((run, index) =>
        run.kind === "link" ? (
          <a
            className="text-fd-primary underline underline-offset-4"
            href={run.href}
            key={`${index}-${run.href}`}
          >
            {run.text}
          </a>
        ) : (
          run.text
        ),
      )}
    </DocsDescription>
  );

function PageFrame({
  title,
  description,
  toc,
  path,
  origin,
  full = false,
  children,
}: {
  readonly title: ReactNode;
  readonly description?: string;
  readonly toc: ComponentProps<typeof DocsPage>["toc"];
  readonly path: string;
  readonly origin: PageOrigin;

  readonly full?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <DocsPage full={full} id={mainContentId} tabIndex={-1} toc={toc}>
      <div className="flex items-start justify-between gap-4">
        <DocsTitle>{title}</DocsTitle>
        <CopyPage origin={origin} path={path} />
      </div>
      <Description text={description ?? ""} />
      <DocsBody>
        {children}
        <EditPage origin={origin} path={path} />
      </DocsBody>
    </DocsPage>
  );
}

function SiteContent({ path, url }: { path: string; url: string }) {
  const page = docs.getPage(path);
  if (!page) throw new Error(`unknown page: ${path}`);

  const { toc } = use(page.load());
  const MDX = page.body;

  return (
    <PageFrame
      description={page.description}
      full={url.startsWith("/blocks/") && url !== "/blocks/sidebar"}
      origin="site"
      path={path}
      title={page.title}
      toc={toc}
    >
      <MDX components={mdxComponents} />
      <KeyboardStrip sections={toc.map((entry) => entry.url)} url={url} />
    </PageFrame>
  );
}

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
    </PageFrame>
  );
}

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
          {}
          <ContentMounted />
        </Suspense>
      </DocsLayout>
    </PlatformProvider>
  );
}
