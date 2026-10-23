import { packageGraph } from "../../lib/package-graph-data";

/**
 * The architecture page's direction diagram.
 *
 * Generated from the chains the graph carries, so a package the diagram omits
 * is a package the guard names rather than a line a reader has to remember to
 * edit. Each arrow points from a dependency to the package that may import it.
 */
export function PackageGraph() {
  const standalone = packageGraph.standalone;
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs leading-6">
      {packageGraph.direction.map((layer) => (
        <div className="whitespace-nowrap" key={layer.join("▶")}>
          {layer.join(" ──▶ ")}
        </div>
      ))}
      {standalone.length === 0 ? null : (
        <div className="mt-2 text-muted-foreground">
          {`${standalone.join(", ")} ${standalone.length === 1 ? "stands" : "stand"} alone`}
        </div>
      )}
    </div>
  );
}
