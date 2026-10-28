import {
  COLUMN_KEY_STEP,
  columnBounds,
  contentWidth,
  hiddenColumns,
  initialColumns,
  moveColumn,
  resizeColumn,
  resizeWidthByKey,
  toggleColumn,
  visibleColumns,
  type ColumnDef,
  type ColumnResizeKey,
  type ColumnState,
} from "@gpuixui/data/columns/logic";
import { columnName } from "@gpuixui/data/sort/logic";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import { useState, type KeyboardEvent } from "react";

/**
 * Browser preview for the Column configuration page.
 *
 * `ColumnMenu` and the table parts are GPUix hosts, so the page cannot mount
 * them and this drawing is a labelled approximation. The configuration is the
 * package's: `toggleColumn` and `moveColumn` own the order and visibility,
 * `resizeWidthByKey` owns the keyboard step and its bounds, and
 * `contentWidth`/`hiddenColumns` own the readout. The header and every row read
 * the same `visibleColumns` list, so the drawing cannot paint a cell under the
 * wrong heading.
 */

/** One file the configured table lists. */
export interface ColumnFile {
  readonly id: string;
  readonly name: string;
  readonly status: "ready" | "building" | "failed";
  readonly size: string;
  readonly updated: string;
}

/** The rows the table draws. */
export const COLUMN_FILES: ReadonlyArray<ColumnFile> = [
  {
    id: "brand",
    name: "brand.svg",
    status: "ready",
    size: "2.0 kB",
    updated: "2 days ago",
  },
  {
    id: "hero",
    name: "hero.png",
    status: "ready",
    size: "512 B",
    updated: "5 days ago",
  },
  {
    id: "draft",
    name: "draft.md",
    status: "building",
    size: "4.1 kB",
    updated: "now",
  },
];

/** The columns the table opens with, in paint order. */
export const COLUMN_DEFS: ReadonlyArray<ColumnDef> = [
  { id: "name", label: "Name", width: 220, minWidth: 120 },
  { id: "status", label: "Status", width: 120 },
  { id: "size", label: "Size", width: 100, minWidth: 80 },
  { id: "updated", label: "Updated", width: 140 },
];

/** A row's cell for a column. */
export const columnValue = (file: ColumnFile, id: string): string => {
  if (id === "status") return file.status;
  if (id === "size") return file.size;
  if (id === "updated") return file.updated;
  return file.name;
};

/** The column list the drawing opens with. */
export const openingColumns = (): ColumnState => initialColumns(COLUMN_DEFS);

/** Hide or show one column, the way the menu's checkbox does. */
export const toggledColumn = (state: ColumnState, id: string): ColumnState =>
  toggleColumn(state, id);

/** Move one column one visible place, the way the menu's arrows do. */
export const movedColumn = (
  state: ColumnState,
  id: string,
  delta: number,
): ColumnState => moveColumn(state, id, delta);

/** The names a hidden column keeps in the readout: its label or its id. */
export const hiddenNames = (state: ColumnState): ReadonlyArray<string> =>
  Arr.filterMap(hiddenColumns(state), (id) =>
    Option.match(
      Arr.findFirst(state.columns, (column) => column.id === id),
      {
        onNone: () => Result.failVoid,
        onSome: (column) => Result.succeed(columnName(column.label, column.id)),
      },
    ),
  );

/**
 * Whether the menu can hide one more column.
 *
 * The last visible column stays: a grid with no track paints a header with no
 * cells, so the package disables that column's toggle rather than accepting a
 * press it refuses.
 */
export const canHide = (state: ColumnState): boolean =>
  visibleColumns(state).length > 1;

/**
 * The width a resize key produces for one column.
 *
 * The divider announces and steps the width the package clamps, so Home/End
 * name the column's own bounds and an arrow moves one `COLUMN_KEY_STEP`.
 */
export const keyedWidth = (
  state: ColumnState,
  id: string,
  key: ColumnResizeKey,
): number =>
  Option.match(
    Arr.findFirst(state.columns, (column) => column.id === id),
    {
      onNone: () => 0,
      onSome: (column) =>
        resizeWidthByKey(
          column.width,
          key,
          columnBounds(column),
          COLUMN_KEY_STEP,
        ),
    },
  );

/** The state a key press on one divider produces. */
export const resizedColumn = (
  state: ColumnState,
  id: string,
  key: ColumnResizeKey,
): ColumnState => resizeColumn(state, id, keyedWidth(state, id, key));

/** The arrow a browser keyboard event uses for a divider key. */
const browserKey: Readonly<Record<string, ColumnResizeKey>> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  Home: "home",
  End: "end",
};

/** The column configuration page's browser rendering. */
export function ColumnConfigurationDemo() {
  const [state, setState] = useState<ColumnState>(openingColumns);
  const [menuOpen, setMenuOpen] = useState(false);
  const columns = visibleColumns(state);
  const hidden = hiddenNames(state);

  const onResizeKey = (
    event: KeyboardEvent<HTMLSpanElement>,
    id: string,
  ): void => {
    const name = browserKey[event.key];
    if (name === undefined) return;
    event.preventDefault();
    setState((current) => resizedColumn(current, id, name));
  };

  return (
    <div className="gx-trule-demo" data-demo="column-configuration">
      <div className="gx-table-toolbar">
        <p className="gx-table-hint">
          {`${columns.length} of ${COLUMN_DEFS.length} columns · ${contentWidth(
            state,
          )}px of content`}
        </p>
        <div className="gx-table-columns">
          <button
            aria-expanded={menuOpen}
            className="gx-table-columns-btn"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            Columns
          </button>
          {menuOpen ? (
            <div className="gx-table-columns-menu">
              <p className="gx-table-columns-label">Visible columns</p>
              {state.columns.map((column) => {
                const shown = columns.findIndex((one) => one.id === column.id);
                return (
                  <div className="gx-cols-row" key={column.id}>
                    <button
                      aria-pressed={column.visible}
                      className="gx-table-columns-item gx-cols-toggle"
                      disabled={column.visible && !canHide(state)}
                      onClick={() =>
                        setState((current) => toggledColumn(current, column.id))
                      }
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className="gx-table-columns-check"
                      >
                        {column.visible ? "✓" : ""}
                      </span>
                      {columnName(column.label, column.id)}
                    </button>
                    {shown < 0 ? null : (
                      <>
                        <button
                          aria-label={`Move ${columnName(column.label, column.id)} left`}
                          className="gx-cols-move"
                          disabled={shown === 0}
                          onClick={() =>
                            setState((current) =>
                              movedColumn(current, column.id, -1),
                            )
                          }
                          type="button"
                        >
                          ←
                        </button>
                        <button
                          aria-label={`Move ${columnName(column.label, column.id)} right`}
                          className="gx-cols-move"
                          disabled={shown === columns.length - 1}
                          onClick={() =>
                            setState((current) =>
                              movedColumn(current, column.id, 1),
                            )
                          }
                          type="button"
                        >
                          →
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
              <button
                className="gx-table-columns-item gx-cols-reset"
                onClick={() => setState(openingColumns())}
                type="button"
              >
                Reset columns
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="gx-table">
        <table aria-label="Files, configured columns" className="gx-table-el">
          <colgroup>
            {columns.map((column) => (
              <col key={column.id} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column) => (
                <th className="gx-table-head" key={column.id} scope="col">
                  <span className="gx-cols-head">
                    {columnName(column.label, column.id)}
                    <span
                      aria-label={`Resize the ${columnName(
                        column.label,
                        column.id,
                      ).toLowerCase()} column`}
                      aria-orientation="vertical"
                      aria-valuemax={columnBounds(column).maxWidth}
                      aria-valuemin={columnBounds(column).minWidth}
                      aria-valuenow={column.width}
                      className="gx-cols-divider"
                      data-resize={column.id}
                      onKeyDown={(event) => onResizeKey(event, column.id)}
                      role="separator"
                      tabIndex={0}
                    />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COLUMN_FILES.map((file) => (
              <tr className="gx-table-row" key={file.id}>
                {columns.map((column) => (
                  <td className="gx-table-cell" key={column.id}>
                    {columnValue(file, column.id)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="gx-trule-readout">
        {hidden.length === 0
          ? "no hidden columns"
          : `hidden: ${hidden.join(", ")}`}
      </p>
    </div>
  );
}

/** The page's copyable native usage, shown in the preview's Code tab. */
export const columnConfigurationDemoSource = `import {
  ColumnMenu,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableSortHeader,
  TableViewport,
  columnName,
  useColumns,
  useTable,
} from "@gpuixui/data";

const columns = useColumns({ columns: FILE_COLUMNS });
const table = useTable({
  rows,
  keyOf: (row) => row.id,
  columns: FILE_COLUMNS,
  hiddenColumns: columns.hidden,
});

<ColumnMenu
  state={columns.state}
  onChange={columns.apply}
  onReset={columns.reset}
  testId="file-columns"
/>;

<Table height={320} aria-label="Files">
  <TableViewport>
    <TableHeader>
      <TableRow>
        {columns.visible.map((column) => (
          <TableSortHeader
            key={column.id}
            field={column.id}
            label={column.label}
            width={column.width}
            sort={table.sort}
            onSortPress={table.pressSort}
            resize={{
              minWidth: column.minWidth,
              maxWidth: column.maxWidth,
              label: \`Resize the \${columnName(column.label, column.id).toLowerCase()} column\`,
              onResize: (width) => columns.resize(column.id, width),
            }}
          />
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {table.rows.map((row) => (
        <TableRow key={row.id}>
          {columns.visible.map((column) => (
            <TableCell key={column.id} width={column.width}>
              {column.valueOf(row)}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </TableViewport>
</Table>;`;
