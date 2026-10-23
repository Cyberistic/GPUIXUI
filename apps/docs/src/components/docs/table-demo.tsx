import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ALL_COLUMNS,
  allPageSelected,
  clampPage,
  directionIn,
  INITIAL_ORDER,
  pageCount,
  pageSlice,
  PAGE_SIZE,
  pressRow,
  pressSortOrder,
  retainSelection,
  somePageSelected,
  sortOrderGlyph,
  sortOrderLabel,
  TABLE_ROWS,
  toggleColumn,
  togglePageSelection,
  toggleRow,
  visibleRows,
  type ColumnId,
  type PreviewSelection,
  type PreviewSortOrder,
  type PreviewTableRow,
} from "./table-preview";

/**
 * Browser previews for the Table page.
 *
 * The shipped table is presentational: `@gpuixui/data`'s parts paint the frame
 * and the controllers own the sort, the selection and the filter. These
 * previews paint the same decisions in the browser so a reader can press
 * them — they are **illustrative approximations** of the native table, labelled
 * on the page, and their rules come from `table-preview.ts`, which the suite
 * holds to the package's own rules.
 *
 * The workflow preview borrows a data table's shell from shadcn — a filter
 * field, a Columns menu, sortable headers, a select column, per-row actions and
 * a paginated footer — while its sort, selection and filter stay the package's.
 */

/** The header labels, in the order the columns toggle. */
const COLUMN_LABELS: Readonly<Record<ColumnId, string>> = {
  service: "Service",
  environment: "Environment",
  status: "Status",
  duration: "Duration",
};

/** The direction a header starts a column at, when it is not the sorted one. */
const COLUMN_INITIAL: Readonly<Record<ColumnId, "asc" | "desc">> = {
  service: "asc",
  environment: "asc",
  status: "asc",
  duration: "desc",
};

/** The fixed width a column paints, so hiding one never reflows the rest. */
const COLUMN_WIDTH: Readonly<Record<ColumnId, number>> = {
  service: 250,
  environment: 150,
  status: 110,
  duration: 90,
};

/** The select track and the actions track are fixed; they never hide. */
const SELECT_WIDTH = 40;
const ACTIONS_WIDTH = 48;

/** The glyph a sortable header paints: the order's, or the unsorted affordance. */
const sortGlyph = (order: PreviewSortOrder, id: ColumnId): string =>
  sortOrderGlyph(order, id) || "↕";

/** A drawn checkbox in the select column, reusing the checkbox page's parts. */
const TableCheck = ({
  label,
  checked,
  indeterminate = false,
  disabled = false,
  onToggle,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly indeterminate?: boolean;
  readonly disabled?: boolean;
  readonly onToggle: () => void;
}) => {
  const state = indeterminate
    ? "indeterminate"
    : checked
      ? "checked"
      : "unchecked";
  const toggle = (): void => {
    if (!disabled) onToggle();
  };

  return (
    <span
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      className="gx-check-target"
      data-disabled={disabled ? "" : undefined}
      data-state={state}
      onClick={toggle}
      onKeyDown={(event) => {
        if (event.key === " ") event.preventDefault();
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          toggle();
        }
      }}
      role="checkbox"
      tabIndex={disabled ? -1 : 0}
    >
      <span className="gx-check-box">
        {state === "unchecked" ? null : (
          <span aria-hidden="true" className="gx-check-mark">
            {state === "indeterminate" ? "–" : "✓"}
          </span>
        )}
      </span>
    </span>
  );
};

/** One data cell, painted from the column the row is showing. */
const DataCell = ({
  row,
  id,
}: {
  readonly row: PreviewTableRow;
  readonly id: ColumnId;
}) => {
  if (id === "service") {
    return <td className="gx-table-cell gx-table-service">{row.service}</td>;
  }
  if (id === "environment") {
    return <td className="gx-table-cell">{row.environment}</td>;
  }
  if (id === "status") {
    return (
      <td className="gx-table-cell">
        <span className="gx-table-status" data-status={row.status}>
          {row.status}
        </span>
      </td>
    );
  }
  return <td className="gx-table-cell gx-table-number">{row.duration}s</td>;
};

/** A deploy queue: filter it, hide a column, sort it, page it, act on a row. */
export const TableWorkflow = () => {
  const [rows, setRows] = useState<ReadonlyArray<PreviewTableRow>>(TABLE_ROWS);
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<PreviewSortOrder>(INITIAL_ORDER);
  const [selection, setSelection] = useState<PreviewSelection>({
    selected: ["billing"],
    anchor: "billing",
  });
  const [columns, setColumns] = useState<ReadonlyArray<ColumnId>>(ALL_COLUMNS);
  const [page, setPage] = useState(0);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const columnsAnchor = useRef<HTMLDivElement>(null);
  const menuAnchor = useRef<HTMLDivElement>(null);

  // Both menus close on an outside press or Escape, the way the menu preview
  // does: a menu that stayed open would keep a reader's press hostage.
  useEffect(() => {
    const onDown = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (columnsAnchor.current?.contains(target) === true) return;
      if (menuAnchor.current?.contains(target) === true) return;
      setColumnsOpen(false);
      setOpenMenu(null);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setColumnsOpen(false);
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const shown = visibleRows(rows, query, order);
  const count = pageCount(shown);
  const current = clampPage(page, count);
  const pageRows = pageSlice(shown, current);
  const pageIds = pageRows.map((row) => row.id);
  const allSelected = allPageSelected(selection, pageIds);
  const someSelected = somePageSelected(selection, pageIds);

  /** Narrowing the set releases a chosen record it no longer paints. */
  const onQuery = (next: string) => {
    setQuery(next);
    setPage(0);
    setSelection((state) =>
      retainSelection(
        state,
        visibleRows(rows, next, order).map((row) => row.id),
      ),
    );
  };

  const onSort = (id: ColumnId, additive: boolean) => {
    setOrder((state) =>
      pressSortOrder(state, id, COLUMN_INITIAL[id], additive),
    );
  };

  const onToggleRow = (id: string, shift: boolean) => {
    setSelection((state) =>
      shift
        ? pressRow(
            state,
            id,
            { shift: true },
            shown.map((row) => row.id),
          )
        : toggleRow(state, id),
    );
  };

  const onTogglePage = () => {
    setSelection((state) => togglePageSelection(state, pageIds));
  };

  const copyId = (id: string) => {
    void navigator.clipboard?.writeText(id);
  };

  const deleteRow = (id: string) => {
    const next = rows.filter((row) => row.id !== id);
    setRows(next);
    setSelection((state) =>
      retainSelection(
        state,
        next.map((row) => row.id),
      ),
    );
    setOpenMenu(null);
  };

  return (
    <div className="gx-demo-table">
      <div className="gx-table-card">
        <div className="gx-table-toolbar">
          <input
            aria-label="Filter deploys"
            className="gx-table-filter"
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Filter services…"
            value={query}
          />
          <div className="gx-table-columns" ref={columnsAnchor}>
            <button
              aria-expanded={columnsOpen}
              className="gx-table-columns-btn"
              onClick={() => setColumnsOpen((open) => !open)}
              type="button"
            >
              Columns
            </button>
            {columnsOpen ? (
              <div
                aria-label="Toggle columns"
                className="gx-table-columns-menu"
                role="menu"
              >
                <p className="gx-table-columns-label">Toggle columns</p>
                {ALL_COLUMNS.map((id) => (
                  <button
                    aria-checked={columns.includes(id)}
                    className="gx-table-columns-item"
                    key={id}
                    onClick={() =>
                      setColumns((state) => toggleColumn(state, id))
                    }
                    role="menuitemcheckbox"
                    type="button"
                  >
                    <span aria-hidden="true" className="gx-table-columns-check">
                      {columns.includes(id) ? "✓" : ""}
                    </span>
                    {COLUMN_LABELS[id]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <p className="gx-table-hint">
          Press a header to sort by it; Shift-press a second header to add a
          tie-break.
        </p>

        <div className="gx-table">
          <table aria-label="Deploy queue" className="gx-table-el">
            <caption className="gx-table-caption">
              A queue of recent deploys across production, staging and
              development.
            </caption>
            <colgroup>
              <col style={{ width: SELECT_WIDTH }} />
              {columns.map((id) => (
                <col key={id} style={{ width: COLUMN_WIDTH[id] }} />
              ))}
              <col style={{ width: ACTIONS_WIDTH }} />
            </colgroup>
            <thead>
              <tr>
                <th className="gx-table-head gx-table-check-head" scope="col">
                  <TableCheck
                    checked={allSelected}
                    disabled={shown.length === 0}
                    indeterminate={someSelected}
                    label="Select all rows"
                    onToggle={onTogglePage}
                  />
                </th>
                {columns.map((id) => (
                  <th className="gx-table-head" key={id} scope="col">
                    <button
                      aria-label={sortOrderLabel(COLUMN_LABELS[id], order, id)}
                      className="gx-table-sort"
                      data-sorted={directionIn(order, id)}
                      onClick={(event) => onSort(id, event.shiftKey)}
                      type="button"
                    >
                      {COLUMN_LABELS[id]}
                      <span aria-hidden="true" className="gx-table-glyph">
                        {sortGlyph(order, id)}
                      </span>
                    </button>
                  </th>
                ))}
                <th
                  aria-label="Actions"
                  className="gx-table-head gx-table-actions"
                  scope="col"
                />
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr className="gx-table-row">
                  <td className="gx-table-empty" colSpan={columns.length + 2}>
                    <p className="gx-table-empty-title">No results.</p>
                    <p className="gx-table-empty-meta">
                      Clear the field to see all {rows.length} deploys.
                    </p>
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr
                    className="gx-table-row"
                    data-selected={selection.selected.includes(row.id)}
                    key={row.id}
                  >
                    <td className="gx-table-cell gx-table-check-cell">
                      <TableCheck
                        checked={selection.selected.includes(row.id)}
                        label={`Select ${row.service}`}
                        onToggle={() => onToggleRow(row.id, false)}
                      />
                    </td>
                    {columns.map((id) => (
                      <DataCell id={id} key={id} row={row} />
                    ))}
                    <td className="gx-table-cell gx-table-actions">
                      <div
                        className="gx-table-menu-anchor"
                        ref={openMenu === row.id ? menuAnchor : undefined}
                      >
                        <button
                          aria-expanded={openMenu === row.id}
                          aria-label={`Actions for ${row.service}`}
                          className="gx-table-action-btn"
                          onClick={() =>
                            setOpenMenu(openMenu === row.id ? null : row.id)
                          }
                          type="button"
                        >
                          …
                        </button>
                        {openMenu === row.id ? (
                          <div
                            aria-label={`Actions for ${row.service}`}
                            className="gx-table-menu"
                            role="menu"
                          >
                            <button
                              className="gx-table-menu-item"
                              onClick={() => {
                                copyId(row.id);
                                setOpenMenu(null);
                              }}
                              role="menuitem"
                              type="button"
                            >
                              Copy id
                            </button>
                            <button
                              className="gx-table-menu-item"
                              data-tone="destructive"
                              onClick={() => deleteRow(row.id)}
                              role="menuitem"
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="gx-table-footer">
          <span className="gx-table-selected">
            {selection.selected.length} of {shown.length} row(s) selected.
          </span>
          <div className="gx-table-pager">
            <span className="gx-table-pagesize">
              Rows per page: {PAGE_SIZE}
            </span>
            <span className="gx-table-pageinfo">
              Page {current + 1} of {count}
            </span>
            <div className="gx-table-pagenav">
              <button
                aria-label="Previous page"
                className="gx-table-pagebtn"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
                type="button"
              >
                ‹
              </button>
              <button
                aria-label="Next page"
                className="gx-table-pagebtn"
                disabled={current >= count - 1}
                onClick={() => setPage(current + 1)}
                type="button"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** A card that holds one small table, with the frame the previews share. */
const StateCard = ({
  title,
  meta,
  children,
}: {
  readonly title: string;
  readonly meta: string;
  readonly children: ReactNode;
}) => (
  <div className="gx-table-card gx-table-state">
    <div>
      <p className="gx-table-heading">{title}</p>
      <p className="gx-table-meta">{meta}</p>
    </div>
    {children}
  </div>
);

/** The states a table spends its life in: chosen, empty and loading. */
export const TableStates = () => {
  const sorted = visibleRows(TABLE_ROWS, "", [
    { field: "duration", direction: "desc" },
  ]);
  const sortedByEnvironment = visibleRows(TABLE_ROWS, "", [
    { field: "environment", direction: "asc" },
    { field: "service", direction: "desc" },
  ]);

  return (
    <div className="gx-demo-table gx-table-states">
      <StateCard
        meta="A chosen record paints the selected wash; the sorted column keeps its glyph and its announced name."
        title="Chosen and sorted"
      >
        <div className="gx-table">
          <table aria-label="Sorted deploys" className="gx-table-el">
            <thead>
              <tr>
                <th className="gx-table-head" scope="col">
                  Duration
                  <span aria-hidden="true" className="gx-table-glyph">
                    ↓
                  </span>
                </th>
                <th className="gx-table-head" scope="col">
                  Service
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 3).map((row) => (
                <tr
                  className="gx-table-row"
                  data-selected={row.id === "reports"}
                  key={row.id}
                >
                  <td className="gx-table-cell gx-table-number">
                    {row.duration}s
                  </td>
                  <td className="gx-table-cell">{row.service}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateCard>

      <StateCard
        meta="Shift-press adds a field: environment decides, service breaks its ties. Each glyph carries its place — ↑1 decides, ↓2 orders the rows ↑1 ties."
        title="Two sorts"
      >
        <div className="gx-table">
          <table
            aria-label="Sorted deploys by two fields"
            className="gx-table-el"
          >
            <thead>
              <tr>
                <th className="gx-table-head" scope="col">
                  Environment
                  <span aria-hidden="true" className="gx-table-glyph">
                    ↑1
                  </span>
                </th>
                <th className="gx-table-head" scope="col">
                  Service
                  <span aria-hidden="true" className="gx-table-glyph">
                    ↓2
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedByEnvironment.slice(0, 4).map((row) => (
                <tr className="gx-table-row" key={row.id}>
                  <td className="gx-table-cell">{row.environment}</td>
                  <td className="gx-table-cell">{row.service}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateCard>

      <StateCard
        meta="No row matches: the body paints one full-width row rather than a blank box."
        title="Empty"
      >
        <div className="gx-table">
          <table aria-label="Filtered to nothing" className="gx-table-el">
            <thead>
              <tr>
                <th className="gx-table-head" scope="col">
                  Service
                </th>
                <th className="gx-table-head" scope="col">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="gx-table-row">
                <td className="gx-table-empty" colSpan={2}>
                  <p className="gx-table-empty-title">
                    No deploy matches “eu-west”.
                  </p>
                  <p className="gx-table-empty-meta">
                    Clear the field to see all 6 deploys.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </StateCard>

      <StateCard
        meta="Placeholder rows stand in while the first page arrives; they are not a spinner."
        title="Loading"
      >
        <div className="gx-table">
          <table aria-label="Loading deploys" className="gx-table-el">
            <thead>
              <tr>
                <th className="gx-table-head" scope="col">
                  Service
                </th>
                <th className="gx-table-head" scope="col">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.slice(0, 4).map((row, index) => (
                <tr className="gx-table-row" key={row.id}>
                  <td className="gx-table-cell">
                    <span
                      className="gx-table-skeleton"
                      style={{ width: 96 + index * 14 }}
                    />
                  </td>
                  <td className="gx-table-cell">
                    <span className="gx-table-skeleton" style={{ width: 40 }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </StateCard>
    </div>
  );
};

export const tableWorkflowSource = `import { Table, TableBody, TableCell, TableFilterField, TableHeader, TableHeaderCell, TableRow, TableSortHeader, TableViewport, useTable } from "@gpuixui/data";

// One column list is what the header paints, what the core sorts by and what
// the filter searches — a hidden column cannot leave a second copy behind.
const table = useTable({
  rows,
  keyOf: (row) => row.id,
  columns: [
    { id: "service", valueOf: (row) => row.service },
    { id: "environment", valueOf: (row) => row.environment },
    { id: "status", valueOf: (row) => row.status },
  ],
});

<TableFilterField value={table.query} onValueChange={table.setQuery} />

<Table height={320} aria-label="Deploy queue">
  {/* One horizontal scroller; the header is a sibling of the row scroller. */}
  <TableViewport>
    <TableHeader>
      <TableRow>
        {/* The order, not only the primary sort: a Shift press adds a
            tie-break, so the header needs the whole list back. */}
        <TableSortHeader
          field="service"
          label="Service"
          sort={table.sort}
          order={table.sortOrder}
          onSortPress={table.pressSort}
          width={260}
        />
        <TableHeaderCell width={140}>Environment</TableHeaderCell>
        <TableHeaderCell width={120}>Status</TableHeaderCell>
      </TableRow>
    </TableHeader>
    <TableBody>
      {table.rows.map((row) => (
        <TableRow
          key={row.id}
          onClick={(event) => table.press(row.id, event.modifiers)}
          selected={table.isSelected(row.id)}
        >
          <TableCell width={260}>{row.service}</TableCell>
          <TableCell width={140}>{row.environment}</TableCell>
          <TableCell width={120}>{row.status}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </TableViewport>
</Table>;`;

export const tableStatesSource = `import { Table, TableBody, TableCell, TableEmpty, TableRow, TableSkeleton } from "@gpuixui/data";

// An empty set paints one full-width row, not a blank body.
<TableBody>
  <TableEmpty>
    <Text role="body">No deploy matches that filter.</Text>
  </TableEmpty>
</TableBody>

// A first page in flight paints placeholder rows in the same tracks.
<TableBody>
  {[0, 1, 2].map((index) => (
    <TableRow key={index}>
      <TableCell>
        <TableSkeleton width={120} />
      </TableCell>
    </TableRow>
  ))}
</TableBody>;`;
