import {
  groupOf,
  spans,
  type InventoryRow,
  type LaneGroup,
} from "../../lib/inventory";

/**
 * The two cells every generated component table shares.
 *
 * The lane pages and the implementation-status page print the same inventory,
 * so the badge and the note are one implementation: a new status group or a
 * new inline-Markdown form moves both pages in the same change.
 */

const statusClass: Readonly<Record<LaneGroup, string>> = {
  shipped: "bg-accent text-accent-foreground",
  pending: "bg-muted text-muted-foreground",
  blocked: "bg-destructive/10 text-destructive",
  unsupported: "bg-destructive/10 text-destructive",
};

/** A row's own status words, grouped into the four paints. */
export function InventoryStatus({ row }: { readonly row: InventoryRow }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ${statusClass[groupOf(row.status)]}`}
    >
      {row.status}
    </span>
  );
}

/** A note with its inline code and bold resolved. */
export function InventoryNote({ text }: { readonly text: string }) {
  return (
    <>
      {spans(text).map((span, index) =>
        span.code ? (
          <code
            className="rounded bg-muted px-1 py-0.5 font-mono text-[0.8em]"
            key={index}
          >
            {span.text}
          </code>
        ) : span.strong ? (
          <strong className="text-foreground" key={index}>
            {span.text}
          </strong>
        ) : (
          <span key={index}>{span.text}</span>
        ),
      )}
    </>
  );
}
