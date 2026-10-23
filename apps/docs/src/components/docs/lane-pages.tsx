import { componentIndex } from "../../lib/component-index-data";
import {
  lanePageGroups,
  lanePageTotal,
  type PackageLane,
} from "../../lib/lane-pages";

/**
 * The pages a composition lane's packages ship.
 *
 * `<LaneTable>` answers what the lane is made of from `COMPONENTS.md`; this
 * answers where to read about it from the collections the site mounts. The rows
 * are generated, so a new package page reaches the lane entry in the same commit
 * that adds it, and a hand-written list cannot drift back in.
 */
export function LanePages({ lane }: { readonly lane: PackageLane }) {
  const groups = lanePageGroups(componentIndex, lane);
  if (groups.length === 0) {
    throw new Error(`LanePages: no mounted package fills the ${lane} lane`);
  }

  const total = lanePageTotal(groups);

  return (
    <div className="not-prose my-6 space-y-6">
      <p className="m-0 font-mono text-xs text-muted-foreground">
        {total} pages in {groups.length}{" "}
        {groups.length === 1 ? "package" : "packages"} · generated from each
        package's docs folder
      </p>
      {groups.map(({ collection, pages }) => (
        <div
          className="overflow-x-auto rounded-xl border border-border"
          key={collection.origin}
        >
          <table className="w-full border-collapse text-sm">
            <caption className="border-b border-border bg-muted/60 px-3 py-2 text-left font-mono text-xs font-normal text-muted-foreground">
              {collection.packageName} · {pages.length}{" "}
              {pages.length === 1 ? "page" : "pages"}
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/60 text-left">
                <th className="px-3 py-2 font-semibold">Page</th>
                <th className="px-3 py-2 font-semibold">What it ships</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr
                  className="border-b border-border align-top last:border-0"
                  key={page.url}
                >
                  <td className="px-3 py-2 font-medium">
                    <a className="underline" href={page.url}>
                      {page.title}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {page.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
