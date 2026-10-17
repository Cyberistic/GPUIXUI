import { Link } from "fumadocs-core/link";
import { bySlug } from "@/component-meta/registry";

/**
 * What a component needs, from its registry record. The record's list is
 * derived from the component's real entry file and pinned by
 * `dependencies.test.ts` (plan 428), so a page cannot claim a dependency the
 * source does not import.
 */
export function ComponentDependencies({ slug }: { slug: string }) {
  const record = bySlug.get(slug);
  if (record === undefined) {
    return (
      <p className="not-prose text-sm text-fd-muted-foreground">
        Unknown component “{slug}”.
      </p>
    );
  }

  const modules = record.dependencies.filter(
    (dependency) => !bySlug.has(dependency),
  );
  const composed = record.dependencies.filter((dependency) =>
    bySlug.has(dependency),
  );

  return (
    <div
      data-component-dependencies={record.slug}
      className="not-prose my-4 rounded-md border border-fd-border bg-fd-card px-3 py-2 text-sm"
    >
      <p className="text-fd-muted-foreground">
        Every component is a peer of React 19 and <code>@gpuix/react</code>{" "}
        0.10.0; theme values come from <code>@gpuixui/tokens</code> through the
        app&apos;s theme provider.
      </p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-fd-muted-foreground">Package</dt>
        <dd>
          <code>{record.packageName}</code>
        </dd>
        <dt className="text-fd-muted-foreground">Modules</dt>
        <dd>
          {modules.length === 0 ? (
            <span className="text-fd-muted-foreground">
              Nothing beyond the peer packages.
            </span>
          ) : (
            modules.map((module, index) => (
              <span key={module}>
                {index === 0 ? null : ", "}
                <code>{module}</code>
              </span>
            ))
          )}
        </dd>
        {composed.length === 0 ? null : (
          <>
            <dt className="text-fd-muted-foreground">Composes</dt>
            <dd className="flex flex-wrap gap-2">
              {composed.map((dependency) => (
                <Link
                  key={dependency}
                  href={`/docs/components/${dependency}`}
                  className="rounded-md border border-fd-border px-2 py-0.5"
                >
                  {bySlug.get(dependency)?.title ?? dependency}
                </Link>
              ))}
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
