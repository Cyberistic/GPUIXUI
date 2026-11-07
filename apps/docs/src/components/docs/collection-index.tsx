import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { mainContentId } from "@/components/skip-link";
import type { CollectionIndexView } from "@/lib/collection-index";

export function CollectionIndexBody({
  index,
}: {
  readonly index: CollectionIndexView;
}) {
  const { pages } = index;

  return (
    <>
      <p className="font-mono text-xs text-muted-foreground">
        {pages.length} {pages.length === 1 ? "page" : "pages"} in{" "}
        {index.packageName} · generated from the package's docs folder
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-left">
              <th className="px-3 py-2 font-semibold">Page</th>
              <th className="px-3 py-2 font-semibold">What it ships</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr
                className="border-b border-border align-top last:border-0"
                key={page.url}
              >
                <td className="px-3 py-2 font-medium">
                  <a className="underline" href={page.url}>
                    {page.title}
                  </a>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {page.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function CollectionIndexPage({
  index,
}: {
  readonly index: CollectionIndexView;
}) {
  return (
    <DocsPage id={mainContentId} tabIndex={-1}>
      <DocsTitle>{index.title}</DocsTitle>
      <DocsDescription>{index.description}</DocsDescription>
      <DocsBody>
        <CollectionIndexBody index={index} />
      </DocsBody>
    </DocsPage>
  );
}
