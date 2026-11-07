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

export interface ColumnFile {
  readonly id: string;
  readonly name: string;
  readonly status: "ready" | "building" | "failed";
  readonly size: string;
  readonly updated: string;
}

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

export const COLUMN_DEFS: ReadonlyArray<ColumnDef> = [
  { id: "name", label: "Name", width: 220, minWidth: 120 },
  { id: "status", label: "Status", width: 120 },
  { id: "size", label: "Size", width: 100, minWidth: 80 },
  { id: "updated", label: "Updated", width: 140 },
];

export const columnValue = (file: ColumnFile, id: string): string => {
  if (id === "status") return file.status;
  if (id === "size") return file.size;
  if (id === "updated") return file.updated;
  return file.name;
};

export const openingColumns = (): ColumnState => initialColumns(COLUMN_DEFS);

export const toggledColumn = (state: ColumnState, id: string): ColumnState =>
  toggleColumn(state, id);

export const movedColumn = (
  state: ColumnState,
  id: string,
  delta: number,
): ColumnState => moveColumn(state, id, delta);

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

export const canHide = (state: ColumnState): boolean =>
  visibleColumns(state).length > 1;

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

export const resizedColumn = (
  state: ColumnState,
  id: string,
  key: ColumnResizeKey,
): ColumnState => resizeColumn(state, id, keyedWidth(state, id, key));

const browserKey: Readonly<Record<string, ColumnResizeKey>> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  Home: "home",
  End: "end",
};

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
    <div className="gx-data-scene" data-demo="column-configuration">
      <div className="gx-data-row" data-between>
        <span className="gx-data-readout">
          {`${columns.length} of ${COLUMN_DEFS.length} columns · ${contentWidth(
            state,
          )}px of content`}
        </span>
        <span className="gx-dmenu-anchor">
          <button
            aria-expanded={menuOpen}
            className="gx-btn gx-btn-sm gx-btn-secondary"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            Columns
          </button>
          {menuOpen ? (
            <div aria-label="Columns" className="gx-dmenu" role="menu">
              <span className="gx-dmenu-label">Visible columns</span>
              {state.columns.map((column) => {
                const shown = columns.findIndex((one) => one.id === column.id);
                return (
                  <div className="gx-cols-row" key={column.id}>
                    <button
                      aria-checked={column.visible}
                      className="gx-dmenu-item gx-cols-toggle"
                      disabled={column.visible && !canHide(state)}
                      onClick={() =>
                        setState((current) => toggledColumn(current, column.id))
                      }
                      role="menuitemcheckbox"
                      type="button"
                    >
                      <span aria-hidden="true" className="gx-cols-check">
                        {column.visible ? "✓" : ""}
                      </span>
                      {columnName(column.label, column.id)}
                    </button>
                    {shown < 0 ? null : (
                      <>
                        <button
                          aria-label={`Move ${columnName(column.label, column.id)} left`}
                          className="gx-btn gx-btn-ghost gx-btn-sm gx-btn-square"
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
                          className="gx-btn gx-btn-ghost gx-btn-sm gx-btn-square"
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
              <span className="gx-dmenu-separator" />
              <button
                className="gx-dmenu-item"
                onClick={() => setState(openingColumns())}
                role="menuitem"
                type="button"
              >
                Reset columns
              </button>
            </div>
          ) : null}
        </span>
      </div>
      <div
        aria-label="Files, configured columns"
        className="gx-dt"
        role="table"
      >
        <div className="gx-dt-head" role="rowgroup">
          <div className="gx-dt-row" role="row">
            {columns.map((column) => (
              <div
                className="gx-dt-hcell gx-dt-fixed"
                key={column.id}
                role="columnheader"
                style={{ width: column.width }}
              >
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
                    className="gx-dt-divider"
                    data-resize={column.id}
                    onKeyDown={(event) => onResizeKey(event, column.id)}
                    role="separator"
                    tabIndex={0}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
        <div role="rowgroup">
          {COLUMN_FILES.map((file) => (
            <div
              className="gx-dt-row"
              data-file={file.id}
              key={file.id}
              role="row"
            >
              {columns.map((column) => (
                <div
                  className="gx-dt-cell gx-dt-fixed"
                  key={column.id}
                  role="cell"
                  style={{ width: column.width }}
                >
                  {columnValue(file, column.id)}
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="gx-dt-caption">
          {hidden.length === 0
            ? "no hidden columns"
            : `hidden: ${hidden.join(", ")}`}
        </p>
      </div>
    </div>
  );
}

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
