import { useState } from "react";
import { notPublished, publicApi } from "../../lib/public-api-data";
import { publicSymbolIndex } from "../../lib/public-symbols-data";
import { filterSymbols } from "../../lib/public-symbols";

/**
 * The workspace's public surface, rendered from the packages themselves.
 *
 * Two tables. The first is the entry points — the specifiers a consumer may
 * import, read from each package's `exports` map. The second is every symbol
 * behind them, read from the source at build time, so the page answers "what
 * does this package give me" without the reader leaving it.
 *
 * Neither table is a copy: both are generated, so a page cannot advertise an
 * export the code does not have.
 */
export function ApiReference() {
  const [query, setQuery] = useState("");
  const entryCount = publicApi.reduce(
    (total, pkg) => total + pkg.entries.length,
    0,
  );
  const packages = filterSymbols(publicSymbolIndex.packages, query);
  const symbolCount = packages.reduce(
    (total, pkg) => total + pkg.symbols.length,
    0,
  );

  return (
    <div className="not-prose my-6">
      <h3 className="mt-0 font-mono text-sm font-semibold">Entry points</h3>
      <p className="m-0 mb-3 font-mono text-xs text-muted-foreground">
        {publicApi.length} packages · {entryCount} entry points · read from each
        package's <code className="text-foreground">exports</code> map
      </p>
      <div className="space-y-6">
        {publicApi.map((pkg) => (
          <section key={pkg.name}>
            <h4 className="m-0 font-mono text-sm font-semibold">{pkg.name}</h4>
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

      <h3 className="mt-10 font-mono text-sm font-semibold">Symbols</h3>
      <p className="m-0 mb-3 font-mono text-xs text-muted-foreground">
        {publicSymbolIndex.count} symbols ·{" "}
        {query.trim() === ""
          ? "every name the packages publish"
          : `${symbolCount} match “${query.trim()}”`}{" "}
        · read from the source at build time
      </p>
      <label className="block">
        <span className="sr-only">Filter symbols by name, kind or module</span>
        <input
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by name, kind or module — try “dialog”, “theme”, “hook”"
          type="search"
          value={query}
        />
      </label>
      {packages.length === 0 ? (
        <p className="rounded-xl border border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No symbol matches “{query.trim()}”. Try a shorter word, or the search
          box at the top of the page.
        </p>
      ) : (
        <div className="mt-4 space-y-6">
          {packages.map((pkg) => (
            <section key={pkg.name}>
              <h4 className="m-0 font-mono text-sm font-semibold">
                {pkg.name}
                <span className="ml-2 font-normal text-muted-foreground">
                  {pkg.symbols.length} symbols
                </span>
              </h4>
              {pkg.description === "" ? null : (
                <p className="m-0 mb-2 mt-1 text-sm text-muted-foreground">
                  {pkg.description}
                </p>
              )}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/60 text-left">
                      <th className="px-3 py-2 font-semibold">Symbol</th>
                      <th className="px-3 py-2 font-semibold">Kind</th>
                      <th className="px-3 py-2 font-semibold">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pkg.symbols.map((row) => (
                      <tr
                        className="border-b border-border align-top last:border-0"
                        key={`${row.module}${row.name}`}
                      >
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs text-foreground">
                            {row.name}
                          </span>
                          <span className="mt-1 block font-mono text-[0.65rem] text-muted-foreground">
                            {row.module}
                          </span>
                          <span className="block font-mono text-[0.65rem] text-muted-foreground">
                            {row.specifiers.join(" · ")}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.kind}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {row.summary === "" ? "—" : row.summary}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="m-0 mt-4 font-mono text-xs text-muted-foreground">
        Not published: {notPublished.map((pkg) => pkg.name).join(", ")} —
        neither is imported by a consumer.
      </p>
    </div>
  );
}
