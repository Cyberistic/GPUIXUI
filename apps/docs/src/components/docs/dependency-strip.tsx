import { pageDependencies } from "../../lib/page-dependencies-data";

/**
 * The packages a package page's component is built on.
 *
 * `MISSION.md` asks every component page for its dependencies, and the package
 * pages are Markdown the site mounts rather than copies. This line is the
 * site's: it reads the component's own imports at build time, so the list
 * cannot fall behind the code, and it stays silent on a page whose author wrote
 * its own `## Dependencies` section or whose component imports no workspace
 * package.
 */
export function DependencyStrip({ url }: { readonly url: string }) {
  const entry = pageDependencies.pages[url];
  if (entry === undefined || entry.dependencies.length === 0) return null;

  return (
    <div
      className="not-prose my-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
      data-dependencies={entry.module}
    >
      <span>Built on</span>
      <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0">
        {entry.dependencies.map((dependency) => (
          <li className="m-0" key={dependency.packageName}>
            {dependency.url === undefined ? (
              <code className="text-foreground">{dependency.packageName}</code>
            ) : (
              <a
                className="text-foreground underline underline-offset-2"
                href={dependency.url}
              >
                {dependency.packageName}
              </a>
            )}
          </li>
        ))}
      </ul>
      <span>
        read from{" "}
        <code className="text-foreground">{entry.module.split("/").at(-1)}</code>
      </span>
      <a
        className="underline underline-offset-2 hover:text-foreground"
        href="/docs/architecture#the-packages"
      >
        How the packages fit
      </a>
    </div>
  );
}
