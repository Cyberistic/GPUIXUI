/**
 * The search preview's arithmetic: the filter, its count and the edit Escape
 * treats specially.
 *
 * Matching is the app's, not the component's: `SearchInput` reports text and
 * never queries, so the preview states its own rule (trimmed, case-insensitive,
 * name or region) and the page says the rule belongs to the caller. Escape's
 * rule is the component's: it clears a field that holds text and nothing else,
 * which is what lets an enclosing dialog keep the key on an empty field.
 */

/** One row the preview filters: a deployment and where it runs. */
export interface PreviewRow {
  readonly name: string;
  readonly region: string;
}

/** Whether the trimmed, lower-cased query occurs in the name or the region. */
export const matchesRow = (row: PreviewRow, query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  return (
    row.name.toLowerCase().includes(needle) ||
    row.region.toLowerCase().includes(needle)
  );
};

/** The rows that survive the query, in their declared order. */
export const filterRows = (
  rows: ReadonlyArray<PreviewRow>,
  query: string,
): ReadonlyArray<PreviewRow> => rows.filter((row) => matchesRow(row, query));

/** The count line the preview prints: `shown of total`. */
export const countLabel = (shown: number, total: number): string =>
  `${shown} of ${total}`;

/** The component's Escape rule: only a field holding text clears. */
export const escapeClears = (value: string): boolean => value.length > 0;
