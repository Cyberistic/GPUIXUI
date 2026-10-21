import { notPublished, publicApi } from "../../lib/public-api-data";

/**
 * The workspace's public entry points, rendered from each package manifest.
 *
 * A reader needs one thing from this table: the exact specifier to import and
 * the file it resolves to. The page does not list symbols — a signature belongs
 * beside the component that owns it — but it does decide what is public, so it
 * is generated rather than maintained.
 */
export function ApiReference() {
  const entryCount = publicApi.reduce(
    (total, pkg) => total + pkg.entries.length,
    0,
  );

  return (
    <div className="not-prose my-6">
      <p className="m-0 mb-3 font-mono text-xs text-muted-foreground">
        {publicApi.length} packages · {entryCount} entry points · read from each
        package's <code className="text-foreground">exports</code> map
      </p>
      <div className="space-y-6">
        {publicApi.map((pkg) => (
          <section key={pkg.name}>
            <h3 className="m-0 font-mono text-sm font-semibold">{pkg.name}</h3>
            {pkg.description === "" ? null : (
              <p className="m-0 mb-2 mt-1 text-sm text-muted-foreground">
                {pkg.description}
              </p>
            )}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-left">
                    <th className="px-3 py-2 font-semibold">Import</th>
                    <th className="px-3 py-2 font-semibold">Resolves to</th>
                    <th className="px-3 py-2 font-semibold">Kind</th>
                  </tr>
                </thead>
                <tbody>
                  {pkg.entries.map((entry) => (
                    <tr
                      className="border-b border-border align-top last:border-0"
                      key={entry.specifier}
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        {entry.specifier}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {entry.target}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {entry.pattern
                          ? "one per file"
                          : entry.built
                            ? "built module"
                            : "module"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
      <p className="m-0 mt-4 font-mono text-xs text-muted-foreground">
        Not published: {notPublished.map((pkg) => pkg.name).join(", ")} —
        neither is imported by a consumer.
      </p>
    </div>
  );
}
