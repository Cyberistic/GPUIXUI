import { appName, componentDocsRoute, docsRoute } from "../lib/shared";
import { mainContentId } from "./skip-link";

/**
 * The site's 404.
 *
 * A mistyped or moved address used to fall through to the router's default
 * error, which is outside the docs chrome: no brand, no navigation and no way
 * back other than editing the URL. A reader who follows a stale link still gets
 * the pages that find things — the introduction, setup, the component index —
 * and the page renders inside the Fumadocs provider, so the site's light and
 * dark palettes apply to it like every other page.
 */

interface Destination {
  readonly href: string;
  readonly label: string;
  readonly description: string;
}

const destinations: ReadonlyArray<Destination> = [
  {
    href: docsRoute,
    label: "Introduction",
    description: "What the library is, and what it deliberately is not.",
  },
  {
    href: `${docsRoute}/installation`,
    label: "Installation",
    description: "The workspace, nub, and your first component.",
  },
  {
    href: `${docsRoute}/getting-started`,
    label: "Getting started",
    description: "Build a settings screen in four steps.",
  },
  {
    href: componentDocsRoute,
    label: "Components",
    description: "Every page, filterable by name, part, prop or limit.",
  },
  {
    href: `${docsRoute}/patterns`,
    label: "Patterns",
    description: "Who owns the state when several parts work together.",
  },
  {
    href: `${docsRoute}/reference`,
    label: "API reference",
    description: "Every entry point and symbol the packages publish.",
  },
];

/** The page a missing address renders. */
export function NotFound() {
  return (
    <main
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24"
      id={mainContentId}
      tabIndex={-1}
    >
      <p className="m-0 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-fd-muted-foreground">
        <span aria-hidden="true" className="gx-mark" />
        {appName} Docs · 404
      </p>
      <div>
        <h1 className="m-0 text-3xl font-semibold tracking-tight text-fd-foreground">
          Page not found
        </h1>
        <p className="m-0 mt-3 text-fd-muted-foreground">
          This address has no page. It may have moved since the link was
          written, or the URL may be mistyped. The docs are one link away:
        </p>
      </div>
      <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
        {destinations.map((destination) => (
          <li className="m-0" key={destination.href}>
            <a
              className="block h-full rounded-xl border border-fd-border px-3 py-2 no-underline transition-colors hover:bg-fd-accent/60"
              href={destination.href}
            >
              <span className="font-medium text-fd-foreground">
                {destination.label}
              </span>
              <span className="mt-1 block text-sm text-fd-muted-foreground">
                {destination.description}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="m-0 text-sm text-fd-muted-foreground">
        Looking for a specific component? The{" "}
        <a className="text-fd-primary underline" href={componentDocsRoute}>
          component index
        </a>{" "}
        searches names, parts, props and limitations.
      </p>
    </main>
  );
}
