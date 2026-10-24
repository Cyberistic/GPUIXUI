import * as Option from "effect/Option";
import { curatedTwinOf } from "./curated-twins";
import {
  groupOf,
  type Inventory,
  type InventoryRow,
  type InventorySection,
  type InventoryTier,
  type LaneGroup,
} from "./inventory";
import { rowsForPage } from "./inventory-status";

/**
 * The inventory as the status page renders it.
 *
 * `COMPONENTS.md` is grouped by the headings that open its tables, not by a
 * second list kept here: the parser records each heading, and every row is
 * placed in the section it was written under. The animated catalogue is one of
 * those sections rather than part of Tier 5, which is the distinction the
 * parser's stale tier used to erase.
 *
 * A row links to the page that publishes it. The link is resolved from the
 * pages' own titles through the same alias table the status strip reads, so a
 * component that ships a page cannot be shown as linkless here while its page
 * carries a verdict.
 */

/** A page a row can link to: the titles and addresses the status strip joins. */
export interface InventoryPageRef {
  readonly title: string;
  readonly url: string;
}

/** One inventory row and the page that documents it, when it has one. */
export interface InventoryPageRow {
  readonly row: InventoryRow;
  readonly url: Option.Option<string>;
}

/** One section's rows and the groups they fall into. */
export interface InventorySectionView {
  readonly section: InventorySection;
  readonly id: string;
  readonly rows: ReadonlyArray<InventoryPageRow>;
  readonly counts: Readonly<Record<LaneGroup, number>>;
}

export interface InventoryPageView {
  readonly sections: ReadonlyArray<InventorySectionView>;
  readonly counts: Readonly<Record<LaneGroup, number>>;
  readonly total: number;
  readonly shipped: number;
}

const groups: ReadonlyArray<LaneGroup> = [
  "shipped",
  "pending",
  "blocked",
  "unsupported",
];

/** How many rows of a set fall into each status group. */
export const countGroups = (
  rows: ReadonlyArray<InventoryRow>,
): Readonly<Record<LaneGroup, number>> =>
  groups.reduce<Record<LaneGroup, number>>(
    (counts, group) => ({
      ...counts,
      [group]: rows.filter((row) => groupOf(row.status) === group).length,
    }),
    { shipped: 0, pending: 0, blocked: 0, unsupported: 0 },
  );

/** A stable anchor for a section heading. */
export const sectionId = (tier: InventoryTier): string =>
  typeof tier === "number" ? `tier-${tier}` : "animated-primitives";

/**
 * Every row's page, keyed by row name.
 *
 * The first page wins, so a row several pages publish (`Tables` is on the table
 * page and three of its parts) belongs to the page that comes first in the
 * index. A page a curated twin retires is replaced by the curated address, so
 * a row never links to a redirect.
 */
const pageByRow = (
  inventory: Inventory,
  pages: ReadonlyArray<InventoryPageRef>,
): ReadonlyMap<string, string> => {
  const found = new Map<string, string>();
  pages.forEach((page) => {
    // A primitive page the Components section curates redirects to the curated
    // one, so a row must not link to an address that answers 301.
    const url = curatedTwinOf(page.url) ?? page.url;
    rowsForPage(inventory, page).forEach((row) => {
      if (!found.has(row.name)) found.set(row.name, url);
    });
  });
  return found;
};

/** The whole inventory, grouped by the headings it was written under. */
export const inventoryPage = (
  inventory: Inventory,
  pages: ReadonlyArray<InventoryPageRef>,
): InventoryPageView => {
  const links = pageByRow(inventory, pages);
  const sections = inventory.sections.map((section) => {
    const rows = inventory.rows
      .filter((row) => row.tier === section.tier)
      .map((row) => ({
        row,
        url: Option.fromNullishOr(links.get(row.name)),
      }));

    return {
      section,
      id: sectionId(section.tier),
      rows,
      counts: countGroups(rows.map((entry) => entry.row)),
    };
  });

  return {
    sections,
    counts: countGroups(inventory.rows),
    total: inventory.rows.length,
    shipped: inventory.rows.filter((row) => groupOf(row.status) === "shipped")
      .length,
  };
};
