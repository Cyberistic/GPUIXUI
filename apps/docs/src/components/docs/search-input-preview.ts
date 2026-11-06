export interface PreviewRow {
  readonly name: string;
  readonly region: string;
}

export const matchesRow = (row: PreviewRow, query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  return (
    row.name.toLowerCase().includes(needle) ||
    row.region.toLowerCase().includes(needle)
  );
};

export const filterRows = (
  rows: ReadonlyArray<PreviewRow>,
  query: string,
): ReadonlyArray<PreviewRow> => rows.filter((row) => matchesRow(row, query));

export const countLabel = (shown: number, total: number): string =>
  `${shown} of ${total}`;

export const escapeClears = (value: string, disabled = false): boolean =>
  !disabled && value.length > 0;
