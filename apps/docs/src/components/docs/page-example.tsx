import { examplesForPage } from "../../lib/examples";
import { examples } from "../../lib/examples-data";
import { docsRoute } from "../../lib/shared";

/** Where the registry of every example renders. */
export const examplesRoute = `${docsRoute}/examples`;

/**
 * The worked example a component page links back to.
 *
 * The registry on `/docs/examples` links every row to the page it illustrates,
 * and nothing linked the other way, so a reader on a component page could not
 * discover the fuller composition that ships beside it. The strip is the site's
 * own — read from `packages/*\/examples/*.example.tsx` — so a page with no
 * example renders nothing rather than a guess, and the anchor is the row's own
 * id, so the link lands on the example instead of the top of the page.
 */
export function PageExample({ url }: { readonly url: string }) {
  const owned = examplesForPage(examples, url);
  if (owned.length === 0) return null;

  return (
    <div className="not-prose my-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      {owned.map((entry) => (
        <span
          className="flex flex-wrap items-baseline gap-x-2"
          key={entry.anchor}
        >
          <span>Worked example</span>
          <a
            className="font-medium text-foreground underline underline-offset-2"
            href={`${examplesRoute}#${entry.anchor}`}
          >
            {entry.title}
          </a>
          <code className="text-foreground">{entry.file}</code>
        </span>
      ))}
    </div>
  );
}
