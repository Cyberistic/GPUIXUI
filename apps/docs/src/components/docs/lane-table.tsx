import { laneData } from "../../lib/inventory-data";
import { summarize, supportLabel, type LaneName } from "../../lib/inventory";
import { InventoryNote, InventoryStatus } from "./inventory-cells";

export function LaneTable({ lane }: { lane: LaneName }) {
  const view = laneData(lane);
  if (view.unmatched.length > 0) {
    throw new Error(
      `LaneTable: the ${lane} lane names rows .agents/slop/COMPONENTS.md does not have: ${view.unmatched.join(", ")}`,
    );
  }

  const { total, shipped, pending } = summarize(view.rows);

  return (
    <div className="not-prose my-6">
      <p className="m-0 mb-3 font-mono text-xs text-muted-foreground">
        {view.lane.title} · {total} rows in{" "}
        <code className="text-foreground">.agents/slop/COMPONENTS.md</code> ·{" "}
        {shipped} shipped · {pending} to build
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-left">
              <th className="px-3 py-2 font-semibold">Component</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">GPUix</th>
              <th className="px-3 py-2 font-semibold">
                Built on, and its limits
              </th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr
                className="border-b border-border align-top last:border-0"
                key={row.name}
              >
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2">
                  <InventoryStatus row={row} />
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {supportLabel(row.support)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  <InventoryNote text={row.notes} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
