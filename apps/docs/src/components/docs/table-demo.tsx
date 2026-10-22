import {
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  INITIAL_SORT,
  nextSort,
  pressRow,
  readout,
  retainSelection,
  sortLabel,
  TABLE_ROWS,
  visibleRows,
  type PreviewSelection,
  type PreviewSort,
  type PreviewTableRow,
} from "./table-preview";

/**
 * Browser previews for the Table page.
 *
 * The shipped table is presentational: `@gpuixui/data`'s parts paint the frame
 * and the controllers own the sort, the selection and the filter. These
 * previews paint the same three decisions in the browser so a reader can press
 * them — they are **illustrative approximations** of the native table, labelled
 * on the page, and their rules come from `table-preview.ts`, which the suite
 * holds to the package's own rules.
 */

/** One row of the preview's grid: the record, the cells and its state. */
const Row = ({
  row,
  selected,
  tabbable,
  onPress,
  register,
}: {
  readonly row: PreviewTableRow;
  readonly selected: boolean;
  readonly tabbable: boolean;
  readonly onPress: (event: MouseEvent<HTMLButtonElement>) => void;
  readonly register: (element: HTMLButtonElement | null) => void;
}) => (
  <button
    aria-selected={selected}
    className="gx-table-row"
    data-selected={selected}
    onClick={onPress}
    ref={register}
    role="row"
    tabIndex={tabbable ? 0 : -1}
    type="button"
  >
    <span className="gx-table-cell gx-table-service">{row.service}</span>
    <span className="gx-table-cell">{row.environment}</span>
    <span className="gx-table-cell">
      <span className="gx-table-status" data-status={row.status}>
        {row.status}
      </span>
    </span>
    <span className="gx-table-cell gx-table-number">{row.duration}s</span>
  </button>
);

const FIELDS = [
  { id: "service", label: "Service", initial: "asc" as const },
  { id: "environment", label: "Environment", initial: "asc" as const },
  { id: "duration", label: "Duration", initial: "desc" as const },
];

/** A deploy queue: sort a column, filter the set, choose rows with the chords. */
export const TableWorkflow = () => {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PreviewSort | null>(INITIAL_SORT);
  const [selection, setSelection] = useState<PreviewSelection>({
    selected: ["billing"],
    anchor: "billing",
  });
  const [active, setActive] = useState<string | null>("billing");
  const rows = useRef(new Map<string, HTMLButtonElement>());

  const visible = visibleRows(TABLE_ROWS, query, sort);

  /** Narrowing the set releases a chosen record it no longer paints. */
  const onQuery = (next: string) => {
    setQuery(next);
    setSelection((state) =>
      retainSelection(
        state,
        visibleRows(TABLE_ROWS, next, sort).map((row) => row.id),
      ),
    );
  };

  const focus = (id: string | null) => {
    if (id === null) return;
    setActive(id);
    rows.current.get(id)?.focus();
  };

  const move = (delta: number, extend: boolean) => {
    if (visible.length === 0) return;
    const at = visible.findIndex((row) => row.id === active);
    const next = visible[Math.min(Math.max(at + delta, 0), visible.length - 1)];
    if (next === undefined) return;
    focus(next.id);
    setSelection((state) =>
      pressRow(
        state,
        next.id,
        extend ? { shift: true } : {},
        visible.map((row) => row.id),
      ),
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (visible.length === 0) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1, event.shiftKey);
      return;
    }

    if ((event.key === "Enter" || event.key === " ") && active !== null) {
      event.preventDefault();
      setSelection((state) =>
        pressRow(
          state,
          active,
          {},
          visible.map((row) => row.id),
        ),
      );
    }
  };

  return (
    <div className="gx-demo-table">
      <div className="gx-table-card">
        <div>
          <p className="gx-table-heading">Deploy queue</p>
          <p className="gx-table-meta">
            A press selects the record it hit; Cmd toggles, Shift extends. The
            header sorts, the field narrows.
          </p>
        </div>

        <div className="gx-table-toolbar">
          <input
            aria-label="Filter deploys"
            className="gx-table-filter"
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Filter services, environments, status"
            value={query}
          />
          <span className="gx-table-count">
            {visible.length} of {TABLE_ROWS.length}
          </span>
        </div>

        <div
          aria-label="Deploy queue"
          className="gx-table"
          onKeyDown={onKeyDown}
          role="grid"
        >
          <div className="gx-table-head-row" role="row">
            {FIELDS.map((field) => (
              <button
                aria-label={sortLabel(field.label, sort, field.id)}
                className="gx-table-head"
                data-sorted={
                  sort?.field === field.id ? sort.direction : undefined
                }
                key={field.id}
                onClick={() =>
                  setSort((current) =>
                    nextSort(current, field.id, field.initial),
                  )
                }
                type="button"
              >
                {field.label}
                <span aria-hidden="true" className="gx-table-glyph">
                  {sort?.field !== field.id
                    ? "↕"
                    : sort.direction === "asc"
                      ? "↑"
                      : "↓"}
                </span>
              </button>
            ))}
          </div>

          <div className="gx-table-body" role="rowgroup">
            {visible.length === 0 ? (
              <div className="gx-table-empty" role="row">
                <p className="gx-table-empty-title">
                  No deploy matches that filter.
                </p>
                <p className="gx-table-empty-meta">
                  Clear the field to see all {TABLE_ROWS.length} deploys.
                </p>
              </div>
            ) : (
              visible.map((row) => (
                <Row
                  key={row.id}
                  onPress={(event) =>
                    setSelection((state) =>
                      pressRow(
                        state,
                        row.id,
                        {
                          shift: event.shiftKey,
                          cmd: event.metaKey,
                          ctrl: event.ctrlKey,
                        },
                        visible.map((entry) => entry.id),
                      ),
                    )
                  }
                  register={(element) => {
                    if (element === null) rows.current.delete(row.id);
                    else rows.current.set(row.id, element);
                  }}
                  row={row}
                  selected={selection.selected.includes(row.id)}
                  tabbable={active === row.id}
                />
              ))
            )}
          </div>
        </div>

        <p className="gx-table-readout">
          {readout(visible, selection, sort)} · chosen{" "}
          <b>
            {selection.selected.length === 0
              ? "none"
              : selection.selected.join(", ")}
          </b>
        </p>
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
  const sorted = visibleRows(TABLE_ROWS, "", {
    field: "duration",
    direction: "desc",
  });

  return (
    <div className="gx-demo-table gx-table-states">
      <StateCard
        meta="A chosen record paints the selected wash; the sorted column keeps its glyph and its announced name."
        title="Chosen and sorted"
      >
        <div aria-label="Sorted deploys" className="gx-table" role="grid">
          <div className="gx-table-head-row" role="row">
            <span className="gx-table-head" data-sorted="desc">
              Duration
              <span aria-hidden="true" className="gx-table-glyph">
                ↓
              </span>
            </span>
            <span className="gx-table-head">Service</span>
          </div>
          <div className="gx-table-body" role="rowgroup">
            {sorted.slice(0, 3).map((row) => (
              <div
                className="gx-table-row"
                data-selected={row.id === "reports"}
                key={row.id}
                role="row"
              >
                <span className="gx-table-cell gx-table-number">
                  {row.duration}s
                </span>
                <span className="gx-table-cell">{row.service}</span>
              </div>
            ))}
          </div>
        </div>
      </StateCard>

      <StateCard
        meta="No row matches: the body paints one full-width row rather than a blank box."
        title="Empty"
      >
        <div aria-label="Filtered to nothing" className="gx-table" role="grid">
          <div className="gx-table-head-row" role="row">
            <span className="gx-table-head">Service</span>
            <span className="gx-table-head">Status</span>
          </div>
          <div className="gx-table-body" role="rowgroup">
            <div className="gx-table-empty" role="row">
              <p className="gx-table-empty-title">
                No deploy matches “eu-west”.
              </p>
              <p className="gx-table-empty-meta">
                Clear the field to see all 6 deploys.
              </p>
            </div>
          </div>
        </div>
      </StateCard>

      <StateCard
        meta="Placeholder rows stand in while the first page arrives; they are not a spinner."
        title="Loading"
      >
        <div aria-label="Loading deploys" className="gx-table" role="grid">
          <div className="gx-table-head-row" role="row">
            <span className="gx-table-head">Service</span>
            <span className="gx-table-head">Duration</span>
          </div>
          <div className="gx-table-body" role="rowgroup">
            {TABLE_ROWS.slice(0, 4).map((row, index) => (
              <div
                className="gx-table-row"
                key={`${row.id}-${index}`}
                role="row"
              >
                <span className="gx-table-cell">
                  <span
                    className="gx-table-skeleton"
                    style={{ width: 96 + index * 14 }}
                  />
                </span>
                <span className="gx-table-cell">
                  <span className="gx-table-skeleton" style={{ width: 40 }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </StateCard>
    </div>
  );
};

export const tableWorkflowSource = `import * as Option from "effect/Option";
import { Table, TableBody, TableCell, TableFilterField, TableHeader, TableHeaderCell, TableRow, TableSortHeader, TableViewport, useTable } from "@gpuixui/data";

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
        <TableSortHeader
          field="service"
          label="Service"
          onSort={(next) => table.setSort(Option.some(next))}
          sort={table.sort}
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
