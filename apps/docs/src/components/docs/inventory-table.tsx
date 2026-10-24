import * as Option from "effect/Option";
import { componentIndex } from "../../lib/component-index-data";
import { inventory } from "../../lib/inventory-data";
import {
  inventoryPage,
  type InventoryPageRow,
  type InventorySectionView,
} from "../../lib/inventory-page";
import { supportLabel, type LaneGroup } from "../../lib/inventory";
import { InventoryNote, InventoryStatus } from "./inventory-cells";

/**
 * The whole component inventory, generated from `COMPONENTS.md`.
 *
 * The lane pages answer "what does this lane ship"; this page answers "what
 * does the library ship, and what did the runtime measure for it" in one place.
 * Every cell is the inventory's own, grouped by the headings the document uses
 * — the five MISSION tiers and the plan 600 animated catalogue, which is not a
 * sixth tier.
 *
 * A row that ships a page links to it. The link resolves through the same
 * title aliases the status strip uses, so a page and this table cannot name a
 * component differently; a row whose component lives in a lane page or the
 * runtime matrix stays plain text rather than pointing at a page that does not
 * document it.
 */

const groupLabels: ReadonlyArray<{
  readonly group: LaneGroup;
  readonly label: string;
}> = [
  { group: "shipped", label: "shipped" },
  { group: "pending", label: "to build" },
  { group: "blocked", label: "blocked" },
  { group: "unsupported", label: "unsupported" },
];

const summaryLine = (counts: Readonly<Record<LaneGroup, number>>): string =>
  groupLabels
    .map(({ group, label }) => `${counts[group]} ${label}`)
    .join(" · ");

/** The row's name, linked when a page documents it. */
function RowName({ entry }: { readonly entry: InventoryPageRow }) {
  return Option.match(entry.url, {
    onNone: () => <>{entry.row.name}</>,
    onSome: (url) => (
      <a className="underline underline-offset-2" href={url}>
        {entry.row.name}
      </a>
    ),
  });
}

/** One section's table, with its own counts. */
function SectionTable({ view }: { readonly view: InventorySectionView }) {
  return (
    <section aria-labelledby={view.id} className="mt-10" data-section={view.id}>
      <h3 className="mt-0 font-mono text-sm font-semibold" id={view.id}>
        {view.section.title}
      </h3>
      <p className="m-0 mb-3 font-mono text-xs text-muted-foreground">
        {view.rows.length} rows · {summaryLine(view.counts)}
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
            {view.rows.map((entry) => (
              <tr
                className="border-b border-border align-top last:border-0"
                data-component={entry.row.name}
                key={entry.row.name}
              >
                <td className="px-3 py-2 font-medium">
                  <RowName entry={entry} />
                </td>
                <td className="px-3 py-2">
                  <InventoryStatus row={entry.row} />
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {supportLabel(entry.row.support)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  <InventoryNote text={entry.row.notes} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The generated inventory page: the summary, the section index and the tables. */
export function InventoryTable() {
  const view = inventoryPage(inventory, componentIndex);

  return (
    <div className="not-prose my-6">
      <p className="m-0 mb-3 font-mono text-xs text-muted-foreground">
        {view.total} rows in{" "}
        <code className="text-foreground">COMPONENTS.md</code> ·{" "}
        {summaryLine(view.counts)}
      </p>
      <nav aria-label="Inventory sections" className="flex flex-wrap gap-2">
        {view.sections.map((section) => (
          <a
            className="rounded-lg border border-border bg-card px-2.5 py-1 font-mono text-xs text-foreground no-underline hover:bg-muted"
            href={`#${section.id}`}
            key={section.id}
          >
            {section.section.title} · {section.rows.length}
          </a>
        ))}
      </nav>
      {view.sections.map((section) => (
        <SectionTable key={section.id} view={section} />
      ))}
    </div>
  );
}
