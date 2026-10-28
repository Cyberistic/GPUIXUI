import {
  constructGrid,
  type GridColumn,
  type GridState,
} from "@gpuixui/data/grid-core";
import {
  allSelected,
  clearSelection,
  emptySelection,
  isSelected,
  pressMode,
  pressSelection,
  selectAll,
  someSelected,
  type PressModifiers,
  type SelectionState,
} from "@gpuixui/data/selection/logic";
import {
  pressSortOrder,
  sortOrderGlyph,
  sortOrderLabel,
  type SortDirection,
  type SortOrder,
} from "@gpuixui/data/sort/logic";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import { useState, type MouseEvent } from "react";
import { TABLE_ROWS, type PreviewTableRow } from "./table-preview";

/**
 * Browser previews for the Table sorting and selection pages.
 *
 * The shipped table's headers and rows are GPUix hosts, so the pages cannot
 * mount them and these drawings are labelled approximations. What they do not
 * approximate is the table's reasoning: the order a header press produces is
 * `@gpuixui/data`'s `pressSortOrder`, the painted order is the package's own
 * row model (`constructGrid`, the core `useTable` runs on), and a row press is
 * its `pressSelection` over the visible keys. Only the paint is the browser's.
 *
 * The fixture is the curated Table page's deploy queue, so the two pages show
 * one set of records under the same rules.
 *
 * The drawing mirrors `TableSortHeader` (a ghost `Button` filling a
 * `TableHeaderCell`) and `TableRow`/`TableCell` on `Table`'s recipe: the card
 * frame, the header rule, the cell inset and the selection wash are the
 * component's, not a second table skin.
 */

/** One column the previews sort by: its field, its visible label and the direction a first press starts at. */
export interface SortColumn {
  readonly field: string;
  readonly label: string;
  readonly initial: SortDirection;
}

/** The four columns, in paint order. `duration` starts descending because that is the useful reading. */
export const SORT_COLUMNS: ReadonlyArray<SortColumn> = [
  { field: "service", label: "Service", initial: "asc" },
  { field: "environment", label: "Environment", initial: "asc" },
  { field: "status", label: "Status", initial: "asc" },
  { field: "duration", label: "Duration", initial: "desc" },
];

/** The value a column reads: the numeric duration, else the field of that name. */
const valueOf = (row: PreviewTableRow, field: string): string | number =>
  field === "duration"
    ? row.duration
    : field === "environment"
      ? row.environment
      : field === "status"
        ? row.status
        : row.service;

/** The column list the core sorts and filters by — one list for the header and the rows. */
const gridColumns: ReadonlyArray<GridColumn<PreviewTableRow>> = Arr.map(
  SORT_COLUMNS,
  (column) => ({
    id: column.field,
    valueOf: (row) => valueOf(row, column.field),
  }),
);

/** The core's sorting state for a press-cycle order, primary first. */
const sortingOf = (order: SortOrder): GridState["sorting"] =>
  Arr.map(order, (entry) => ({
    id: entry.field,
    desc: entry.direction === "desc",
  }));

/**
 * The rows the package's row model paints for an order.
 *
 * `constructGrid` is the function `useTable` hands every part, so the preview
 * sorts exactly as the shipped table does; the core's change callbacks are
 * inert because this drawing owns the order itself.
 */
export const sortedRows = (
  order: SortOrder,
): ReadonlyArray<PreviewTableRow> => {
  const table = constructGrid<PreviewTableRow>({
    rows: TABLE_ROWS,
    keyOf: (row) => row.id,
    columns: gridColumns,
    state: { sorting: sortingOf(order), globalFilter: "", rowSelection: {} },
    onSortingChange: () => undefined,
    onGlobalFilterChange: () => undefined,
    onRowSelectionChange: () => undefined,
  });
  return Arr.map(table.getRowModel().rows, (row) => row.original);
};

/** The order the selection preview opens on: the service column, ascending. */
export const OPENING_ORDER: SortOrder = [
  { field: "service", direction: "asc" },
];

/** The visible keys, in paint order — the order a Shift range spans. */
export const keysOf = (
  rows: ReadonlyArray<PreviewTableRow>,
): ReadonlyArray<string> => Arr.map(rows, (row) => row.id);

/** The line under a preview: the order it is in, in the headers' own words. */
export const sortReadout = (order: SortOrder): string =>
  Arr.match(order, {
    onEmpty: () => "source order — press a header",
    onNonEmpty: () =>
      Arr.join(
        Arr.map(
          order,
          (entry) =>
            `${labelOf(entry.field)} ${sortOrderGlyph(order, entry.field)}`,
        ),
        " · ",
      ),
  });

/** A field's visible label. */
const labelOf = (field: string): string =>
  Option.match(
    Arr.findFirst(SORT_COLUMNS, (column) => column.field === field),
    { onNone: () => field, onSome: (column) => column.label },
  );

/** The glyph a header paints: the package's arrow, or the unsorted affordance. */
export const glyphOf = (order: SortOrder, field: string): string =>
  sortOrderGlyph(order, field) || "↕";

/** The direction a field is in, or nothing when it is unsorted. */
export const directionOf = (
  order: SortOrder,
  field: string,
): SortDirection | undefined =>
  Option.map(
    Arr.findFirst(order, (entry) => entry.field === field),
    (entry) => entry.direction,
  ).pipe(Option.getOrUndefined);

/** The chosen keys, in documentation order. */
export const chosenKeys = (state: SelectionState): ReadonlyArray<string> =>
  Arr.sort(Arr.fromIterable(state.selected), Order.String);

/** The line under the selection preview: what the grid reports chosen. */
export const selectionReadout = (
  state: SelectionState,
  total: number,
): string => {
  const chosen = chosenKeys(state);
  return chosen.length === 0
    ? `nothing chosen of ${total}`
    : `${chosen.length} of ${total} chosen: ${chosen.join(", ")}`;
};

export interface SortFrameProps {
  /** The order to draw, primary first. */
  readonly order: SortOrder;
  /** The rows in that order, from the package's row model. */
  readonly rows: ReadonlyArray<PreviewTableRow>;
  /** Reports a header press: its field, the first direction to start at, and Shift. */
  readonly onSort: (
    field: string,
    initial: SortDirection,
    additive: boolean,
  ) => void;
}

/** The drawing itself: one sortable header per column and the rows it orders. */
export function SortFrame({ order, rows, onSort }: SortFrameProps) {
  return (
    <div className="gx-data-scene">
      <div aria-label="Deploy queue, sortable" className="gx-dt" role="table">
        <div className="gx-dt-head" role="rowgroup">
          <div className="gx-dt-row" role="row">
            {Arr.map(SORT_COLUMNS, (column) => (
              <div
                className="gx-dt-hcell"
                key={column.field}
                role="columnheader"
              >
                <button
                  aria-label={sortOrderLabel(column.label, order, column.field)}
                  className="gx-btn gx-btn-ghost gx-btn-sm gx-dt-sort"
                  data-sorted={directionOf(order, column.field)}
                  onClick={(event: MouseEvent<HTMLButtonElement>) =>
                    onSort(column.field, column.initial, event.shiftKey)
                  }
                  type="button"
                >
                  {column.label}
                  <span aria-hidden="true" className="gx-dt-glyph">
                    {glyphOf(order, column.field)}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
        <div role="rowgroup">
          {Arr.map(rows, (row) => (
            <div
              className="gx-dt-row"
              data-row={row.id}
              key={row.id}
              role="row"
            >
              <div className="gx-dt-cell" role="cell">
                {row.service}
              </div>
              <div className="gx-dt-cell" role="cell">
                {row.environment}
              </div>
              <div className="gx-dt-cell" role="cell">
                {row.status}
              </div>
              <div className="gx-dt-cell" role="cell">
                {row.duration}s
              </div>
            </div>
          ))}
        </div>
        <p className="gx-dt-caption">{sortReadout(order)}</p>
      </div>
    </div>
  );
}

/** The page's sorting preview: the order the presses produce and the rows it paints. */
export function TableSortingDemo() {
  const [order, setOrder] = useState<SortOrder>([]);

  return (
    <SortFrame
      onSort={(field, initial, additive) =>
        setOrder(pressSortOrder(order, field, initial, additive))
      }
      order={order}
      rows={sortedRows(order)}
    />
  );
}

export interface SelectionFrameProps {
  /** The rows to draw, in the order the range is measured over. */
  readonly rows: ReadonlyArray<PreviewTableRow>;
  /** What the grid currently holds chosen. */
  readonly selection: SelectionState;
  /** Reports a row press and the modifier flags the browser reported. */
  readonly onPress: (key: string, modifiers: PressModifiers) => void;
  /** Reports one record's checkbox, without disturbing the rest of the set. */
  readonly onToggle: (key: string) => void;
  /** Reports the header checkbox: choose every visible record, or clear the set. */
  readonly onToggleAll: () => void;
}

/** The drawing itself: a checkbox column, the rows, and what the grid reports chosen. */
export function SelectionFrame({
  rows,
  selection,
  onPress,
  onToggle,
  onToggleAll,
}: SelectionFrameProps) {
  const keys = keysOf(rows);
  const every = allSelected(selection, keys);
  const some = someSelected(selection, keys);

  return (
    <div className="gx-data-scene">
      <div aria-label="Deploy queue, selectable" className="gx-dt" role="table">
        <div className="gx-dt-head" role="rowgroup">
          <div className="gx-dt-row" role="row">
            <div className="gx-dt-hcell gx-dt-check" role="columnheader">
              <input
                aria-checked={some ? "mixed" : every}
                aria-label="Choose every deploy"
                checked={every}
                className="gx-dcheck"
                onChange={onToggleAll}
                type="checkbox"
              />
            </div>
            {(["Service", "Environment", "Duration"] as const).map((label) => (
              <div className="gx-dt-hcell" key={label} role="columnheader">
                {label}
              </div>
            ))}
          </div>
        </div>
        <div role="rowgroup">
          {Arr.map(rows, (row) => {
            const chosen = isSelected(selection, row.id);
            return (
              <div
                aria-selected={chosen}
                className="gx-dt-row"
                data-interactive=""
                data-row={row.id}
                data-selected={chosen ? "true" : "false"}
                key={row.id}
                onClick={(event: MouseEvent<HTMLDivElement>) =>
                  onPress(row.id, {
                    shift: event.shiftKey,
                    cmd: event.metaKey,
                    ctrl: event.ctrlKey,
                  })
                }
                role="row"
              >
                <div className="gx-dt-cell gx-dt-check" role="cell">
                  <input
                    aria-label={`Choose ${row.service}`}
                    checked={chosen}
                    className="gx-dcheck"
                    onChange={() => onToggle(row.id)}
                    onClick={(event) => event.stopPropagation()}
                    type="checkbox"
                  />
                </div>
                <div className="gx-dt-cell" role="cell">
                  {row.service}
                </div>
                <div className="gx-dt-cell" role="cell">
                  {row.environment}
                </div>
                <div className="gx-dt-cell" role="cell">
                  {row.duration}s
                </div>
              </div>
            );
          })}
        </div>
        <p className="gx-dt-caption">
          {selectionReadout(selection, rows.length)}
        </p>
      </div>
    </div>
  );
}

/** The page's selection preview: the chosen records, and the readout they feed. */
export function TableSelectionDemo() {
  const rows = sortedRows(OPENING_ORDER);
  const keys = keysOf(rows);
  const [selection, setSelection] = useState<SelectionState>(emptySelection);

  const write = (next: SelectionState): void => setSelection(next);

  return (
    <SelectionFrame
      onPress={(key, modifiers) =>
        write(pressSelection(selection, key, pressMode(modifiers), keys))
      }
      onToggle={(key) => write(pressSelection(selection, key, "toggle", keys))}
      onToggleAll={() =>
        write(
          allSelected(selection, keys)
            ? clearSelection(selection)
            : selectAll(selection, keys),
        )
      }
      rows={rows}
      selection={selection}
    />
  );
}

export const tableSortingDemoSource = `import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableSortHeader,
  TableViewport,
  useTable,
} from "@gpuixui/data";

const columns = [
  { id: "service", label: "Service", width: 220, valueOf: (row) => row.service },
  { id: "duration", label: "Duration", width: 110, valueOf: (row) => row.duration },
];

export function Deploys({ rows }) {
  const table = useTable({ rows, keyOf: (row) => row.id, columns });

  return (
    <Table height={320}>
      <TableViewport>
        <TableHeader>
          <TableRow>
            <TableSortHeader
              field="service"
              label="Service"
              sort={table.sort}
              order={table.sortOrder}
              onSortPress={table.pressSort}
              width={220}
            />
            <TableSortHeader
              field="duration"
              label="Duration"
              sort={table.sort}
              order={table.sortOrder}
              onSortPress={table.pressSort}
              initialDirection="desc"
              width={110}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.service}</TableCell>
              <TableCell>{row.duration}s</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableViewport>
    </Table>
  );
}`;

export const tableSelectionDemoSource = `import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableViewport,
  useTable,
} from "@gpuixui/data";

const columns = [
  { id: "service", label: "Service", width: 220, valueOf: (row) => row.service },
  { id: "status", label: "Status", width: 120, valueOf: (row) => row.status },
];

export function Deploys({ rows }) {
  const table = useTable({ rows, keyOf: (row) => row.id, columns });

  return (
    <Table height={320}>
      <TableViewport>
        <TableHeader>
          <TableRow>
            <TableHeaderCell width={40}>
              <input
                aria-label="Choose every deploy"
                checked={table.allSelected}
                onChange={(event) => table.setAllSelected(event.target.checked)}
                type="checkbox"
              />
            </TableHeaderCell>
            <TableHeaderCell width={220}>Service</TableHeaderCell>
            <TableHeaderCell width={120}>Status</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.rows.map((row) => (
            <TableRow
              key={row.id}
              selected={table.isSelected(row.id)}
              onClick={(event) => table.press(row.id, event.modifiers)}
            >
              <TableCell>{row.service}</TableCell>
              <TableCell>{row.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableViewport>
    </Table>
  );
}`;
