import { indexedSurfaces, searchLimits, searchRanks } from "@/lib/search-docs";

/**
 * The search reference the Site search page renders (plan 610): the exported
 * rank constants, the route's limits and every docs-owned search document.
 * Values come from `search-docs.ts`, which the test compares with the real
 * modules, so the page cannot state a remembered number or a missing document.
 */
export function SearchReference() {
  return (
    <div className="not-prose my-4 space-y-6">
      <p className="text-sm text-fd-muted-foreground">
        <code>GET /api/search</code> returns up to {searchLimits.default}{" "}
        results by default, and never more than {searchLimits.max}.
      </p>

      <div className="overflow-x-auto rounded-md border border-fd-border bg-fd-card">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            The exported rank constants and what each one means.
          </caption>
          <thead>
            <tr className="border-b border-fd-border">
              <th scope="col" className="p-2 font-medium">
                Rank
              </th>
              <th scope="col" className="p-2 font-medium">
                Constant
              </th>
              <th scope="col" className="p-2 font-medium">
                What it means
              </th>
            </tr>
          </thead>
          <tbody>
            {searchRanks.map((rank) => (
              <tr
                key={rank.constant}
                className="border-b border-fd-border/50 last:border-0"
              >
                <td className="p-2 font-mono text-xs">{rank.value}</td>
                <td className="p-2 font-mono text-xs">{rank.constant}</td>
                <td className="p-2">{rank.means}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-md border border-fd-border bg-fd-card">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Every search document rendered from package data rather than
            authored prose.
          </caption>
          <thead>
            <tr className="border-b border-fd-border">
              <th scope="col" className="p-2 font-medium">
                Document
              </th>
              <th scope="col" className="p-2 font-medium">
                Page
              </th>
              <th scope="col" className="p-2 font-medium">
                What it makes findable
              </th>
            </tr>
          </thead>
          <tbody>
            {indexedSurfaces.map((surface) => (
              <tr
                key={`${surface.title}:${surface.url}`}
                className="border-b border-fd-border/50 last:border-0"
              >
                <td className="p-2 font-medium">{surface.title}</td>
                <td className="p-2 font-mono text-xs">{surface.url}</td>
                <td className="p-2">{surface.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
