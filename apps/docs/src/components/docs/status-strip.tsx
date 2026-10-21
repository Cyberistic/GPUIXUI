import { inventory } from "../../lib/inventory-data";
import { inventoryUrl, statusForPage } from "../../lib/inventory-status";

/**
 * The status strip a package page opens with.
 *
 * The package writes the page; this line is the site's, generated from
 * `COMPONENTS.md`, so a reader sees the inventory's verdict — shipped or not,
 * fully supported or partial — before the prose that describes it. A page the
 * inventory has no row for renders no strip rather than a guess.
 */
export function StatusStrip({ title }: { readonly title: string }) {
  const status = statusForPage(inventory, title);
  if (status.kind === "none") return null;

  const { row } = status;
  return (
    <div
      className="not-prose my-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
      data-component={row.name}
    >
      <span>
        Status <code className="text-foreground">{row.status}</code>
      </span>
      <span>
        GPUix support <code className="text-foreground">{row.support}</code>
      </span>
      <a
        className="underline underline-offset-2 hover:text-foreground"
        href={inventoryUrl}
      >
        Inventory
      </a>
    </div>
  );
}
