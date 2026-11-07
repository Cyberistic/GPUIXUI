import type { PageOrigin } from "@/lib/collection-routes";
import { pageEditUrl, pageMarkdownPath } from "@/lib/page-edit";

export function EditPage({
  origin,
  path,
}: {
  readonly origin: PageOrigin;

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
