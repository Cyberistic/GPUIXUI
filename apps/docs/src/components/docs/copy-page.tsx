import { useState } from "react";
import { readPageMarkdown, type PageOrigin } from "@/lib/page-markdown";

const label = {
  idle: "Copy page",
  copied: "Copied",
  error: "Copy failed",
} as const;

type State = keyof typeof label;

/**
 * Copy the page's Markdown, the way shadcn/ui offers a page-level copy action.
 * The Markdown comes from the docs collection, not from scraping the DOM.
 */
export function CopyPage({
  origin,
  path,
}: {
  readonly origin: PageOrigin;
  readonly path: string;
}) {
  const [state, setState] = useState<State>("idle");

  const copy = () => {
    readPageMarkdown({ data: { origin, path } })
      .then((markdown) => navigator.clipboard.writeText(markdown))
      .then(() => setState("copied"))
      .catch(() => setState("error"));
  };

  return (
    <>
      <button
        className="not-prose inline-flex h-8 shrink-0 items-center rounded-md border border-fd-border bg-fd-secondary px-3 text-xs font-medium text-fd-secondary-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
        onClick={copy}
        type="button"
      >
        {label[state]}
      </button>
      <span aria-live="polite" className="sr-only">
        {state === "copied" ? "Page Markdown copied to the clipboard." : ""}
      </span>
    </>
  );
}
