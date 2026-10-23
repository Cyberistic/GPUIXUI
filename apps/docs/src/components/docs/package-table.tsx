import { packageGraph } from "../../lib/package-graph-data";

/**
 * The workspace package table.
 *
 * Read from each manifest at build time, so a package added to the workspace —
 * or a dependency added to one — appears here with no docs edit. The table's
 * order and each responsibility sentence are curated in `package-graph.ts`; the
 * dependencies are not.
 */
export function PackageTable() {
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/60 text-left">
            <th className="px-3 py-2 font-semibold">Package</th>
            <th className="px-3 py-2 font-semibold">Responsibility</th>
            <th className="px-3 py-2 font-semibold">Depends on</th>
          </tr>
        </thead>
        <tbody>
          {packageGraph.packages.map((pkg) => (
            <tr
              className="border-b border-border align-top last:border-0"
              key={pkg.name}
            >
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-foreground">
                {pkg.name}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {pkg.responsibility}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {pkg.dependencies.length === 0
                  ? "—"
                  : pkg.dependencies.join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
