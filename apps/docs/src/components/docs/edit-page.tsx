import type { PageOrigin } from "@/lib/collection-routes";
import { pageEditUrl, pageMarkdownPath } from "@/lib/page-edit";

/**
 * The link from a page to the Markdown that renders it.
 *
 * Every docs page is Markdown — this site's own or a package's — and the footer
 * names the file as well as linking it, so a contributor knows what to open
 * before GitHub does. `/components` and the README ledger count the same
 * files; `page-edit.test.ts` holds every served page to one that exists.
 */
export function EditPage({
  origin,
  path,
}: {
  readonly origin: PageOrigin;
  /** The collection-relative Markdown path the loader hands the frame. */
  readonly path: string;
}) {
  return (
    <p className="not-prose mt-10 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-fd-border pt-4 text-sm">
      <a
        className="font-medium text-fd-foreground underline underline-offset-4 hover:text-fd-accent-foreground"
        href={pageEditUrl(origin, path)}
        rel="noreferrer noopener"
        target="_blank"
      >
        Edit this page on GitHub
      </a>
      <span className="text-fd-muted-foreground">
        <code>{pageMarkdownPath(origin, path)}</code>
      </span>
    </p>
  );
}
