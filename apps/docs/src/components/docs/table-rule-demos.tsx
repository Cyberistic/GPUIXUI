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

export interface SortColumn {
  readonly field: string;
  readonly label: string;
  readonly initial: SortDirection;
}

export const SORT_COLUMNS: ReadonlyArray<SortColumn> = [
  { field: "service", label: "Service", initial: "asc" },
  { field: "environment", label: "Environment", initial: "asc" },
  { field: "status", label: "Status", initial: "asc" },
  { field: "duration", label: "Duration", initial: "desc" },
];

const valueOf = (row: PreviewTableRow, field: string): string | number =>
  field === "duration"
    ? row.duration
    : field === "environment"
      ? row.environment
      : field === "status"
        ? row.status
        : row.service;

const gridColumns: ReadonlyArray<GridColumn<PreviewTableRow>> = Arr.map(
  SORT_COLUMNS,
  (column) => ({
    id: column.field,
    valueOf: (row) => valueOf(row, column.field),
  }),
);

const sortingOf = (order: SortOrder): GridState["sorting"] =>
  Arr.map(order, (entry) => ({
    id: entry.field,
    desc: entry.direction === "desc",
  }));

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

export const OPENING_ORDER: SortOrder = [
  { field: "service", direction: "asc" },
];

export const keysOf = (
  rows: ReadonlyArray<PreviewTableRow>,
): ReadonlyArray<string> => Arr.map(rows, (row) => row.id);

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

const labelOf = (field: string): string =>
  Option.match(
    Arr.findFirst(SORT_COLUMNS, (column) => column.field === field),
    { onNone: () => field, onSome: (column) => column.label },
  );

export const glyphOf = (order: SortOrder, field: string): string =>
  sortOrderGlyph(order, field) || "↕";

export const directionOf = (
  order: SortOrder,
  field: string,
): SortDirection | undefined =>
  Option.map(
    Arr.findFirst(order, (entry) => entry.field === field),
    (entry) => entry.direction,
  ).pipe(Option.getOrUndefined);

export const chosenKeys = (state: SelectionState): ReadonlyArray<string> =>
  Arr.sort(Arr.fromIterable(state.selected), Order.String);

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
  readonly order: SortOrder;

  readonly rows: ReadonlyArray<PreviewTableRow>;

  readonly onSort: (
    field: string,
    initial: SortDirection,
    additive: boolean,
  ) => void;
}

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
  readonly rows: ReadonlyArray<PreviewTableRow>;

  readonly selection: SelectionState;

  readonly onPress: (key: string, modifiers: PressModifiers) => void;

  readonly onToggle: (key: string) => void;

  readonly onToggleAll: () => void;
}

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
