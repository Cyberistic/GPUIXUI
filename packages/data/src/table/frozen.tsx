/**
 * The frozen-column composition: two panes that scroll as one.
 *
 * `@gpuix/native@0.11.0` paints no `position: "sticky"`, so a column cannot be
 * pinned inside a scroller. The rule the `data-grid-frozen-column` and
 * `frozen-column-lifecycle` probes measured is a **composition**: the frozen
 * column is its own vertical scroller beside the grid's, and the two are
 * mirrored through `onScrollChange` → `renderer.scrollTo`, guarded by a ref
 * because the programmatic scroll paints synchronously and reports its own
 * change inside the call.
 *
 * What the panes share, and what they do not:
 *
 * - **Vertical** — both directions. A wheel over either pane moves both, so the
 *   row under the reader keeps its `y` across the seam.
 * - **Horizontal** — the data pane's alone. A sideways wheel pans its cells and
 *   leaves the frozen column where it is; a vertical mirror must not reset the
 *   data pane's `x`, so the body's last `scrollX` is carried into the call.
 * - **Height** — the frozen pane's header and rows paint the same height as the
 *   data pane's, because both use the table's own header and row recipes.
 *
 * A press on a frozen cell is the caller's: `frozenRow` renders the same
 * `TableRow` the data pane does, including `selected` and `onClick`, so choosing
 * a record from the frozen pane selects it for the whole grid
 * (`frozen-column-lifecycle`).
 *
 * ```tsx
 * <FrozenTable
 *   height={320}
 *   frozenWidth={180}
 *   rows={table.rows}
 *   rowKey={(row) => row.id}
 *   frozenHeader={
 *     <TableRow>
 *       <TableHeaderCell width={180}>Name</TableHeaderCell>
 *     </TableRow>
 *   }
 *   frozenRow={(row) => (
 *     <TableRow selected={table.isSelected(row.id)} onClick={…}>
 *       <TableCell width={180}>{row.name}</TableCell>
 *     </TableRow>
 *   )}
 *   header={<TableRow>{/* the scrolling columns' header cells *\/}</TableRow>}
 *   row={(row) => <TableRow>{/* the scrolling columns' cells *\/}</TableRow>}
 * />
 * ```
 */

import {
  useGpuix,
  type EventPayload,
  type Props,
  type PublicInstance,
} from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Fragment, useRef, useState, type ReactNode } from "react";
import { DEFAULT_HEADER_HEIGHT } from "./frame.js";
import { TableBody, TableHeader, TableViewport } from "./table.js";

/** {@link FrozenTable} props. Generics are per row, like `useTable`'s. */
export interface FrozenTableProps<Row> extends Omit<Props, "children"> {
  /** A definite height: the panes are two scrollers and need a bound. */
  readonly height: number;
  /** The frozen pane's width, in pixels. */
  readonly frozenWidth: number;
  /**
   * The scrolling columns' total width, in pixels.
   *
   * It is what the data pane's horizontal scroller pans over: the measured
   * composition puts the header and the body in one inner column of this width
   * (`data-grid-fixed-header`), so a pane narrower than the columns has
   * somewhere to scroll to.
   */
  readonly contentWidth: number;
  /** The rows that fill both panes, in paint order. */
  readonly rows: ReadonlyArray<Row>;
  /** The stable React key of a record. */
  readonly rowKey: (row: Row) => string;
  /**
   * The frozen column's header: a `TableRow` holding the header cell(s).
   *
   * Its cell(s) should paint `frozenWidth`, the same width the pane is given.
   */
  readonly frozenHeader: ReactNode;
  /** The frozen column's row: a `TableRow` holding one cell of `frozenWidth`. */
  readonly frozenRow: (row: Row) => ReactNode;
  /** The scrolling columns' header: a `TableRow` of header cells. */
  readonly header: ReactNode;
  /** The scrolling columns' row: a `TableRow` of cells. */
  readonly row: (row: Row) => ReactNode;
  /** Painted in the data pane when `rows` is empty. */
  readonly empty?: ReactNode;
  /** The frozen pane's test id, for a probe that reads its scroller. */
  readonly frozenTestId?: string;
  /** The data pane's vertical scroller id, for a probe that reads its offset. */
  readonly bodyTestId?: string;
  /** The data pane's horizontal scroller id, for a probe that pans it. */
  readonly viewportTestId?: string;
}

/**
 * Two panes beside each other: a frozen column and a scrolling grid.
 *
 * The frozen pane holds the header and the frozen cells; the data pane is the
 * table core's measured composition — one horizontal scroller holding a header
 * and a vertical row scroller as siblings — inside the remaining width.
 */
export const FrozenTable = <Row,>({
  height,
  frozenWidth,
  contentWidth,
  rows,
  rowKey,
  frozenHeader,
  frozenRow,
  header,
  row,
  empty,
  frozenTestId,
  bodyTestId,
  viewportTestId,
  style,
  ...rest
}: FrozenTableProps<Row>) => {
  const renderer = useGpuix().renderer;
  const frozen = useRef<PublicInstance | null>(null);
  const body = useRef<PublicInstance | null>(null);
  const syncing = useRef(false);
  const bodyX = useRef(0);
  const [frozenHeaderHeight, setFrozenHeaderHeight] = useState(0);
  const [dataHeaderHeight, setDataHeaderHeight] = useState(0);
  // The panes' headers are the caller's rows, so their heights can differ by a
  // text step. Both panes get the taller one, which is what keeps the two row
  // scrollers starting at the same y.
  const headerHeight = Math.max(
    frozenHeaderHeight,
    dataHeaderHeight,
    DEFAULT_HEADER_HEIGHT,
  );
  const bodyHeight = Math.max(0, height - headerHeight);

  // The source's own change arrives inside `scrollTo`, so the flag stops the
  // target mirroring it back (`data-grid-frozen-column`). A vertical mirror
  // leaves each pane's own `x` alone: the data pane's pan is its own, and the
  // frozen pane never pans.
  const mirror = (from: "frozen" | "body") => (event: EventPayload) => {
    const y = event.scrollY;
    if (from === "body" && event.scrollX !== undefined) {
      bodyX.current = event.scrollX;
    }
    if (y === undefined || syncing.current) return;
    const target = from === "body" ? frozen : body;
    const id = target.current?.id;
    if (id === undefined) return;
    syncing.current = true;
    renderer?.scrollTo?.(id, from === "body" ? 0 : bodyX.current, y);
    syncing.current = false;
  };

  return (
    <div
      {...rest}
      role="table"
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          height,
          minHeight: 0,
          overflow: "hidden",
        },
        style,
      )}
    >
      <div
        style={{
          width: frozenWidth,
          flexGrow: 0,
          flexShrink: 0,
          flexBasis: frozenWidth,
          display: "flex",
          flexDirection: "column",
          height,
          minHeight: 0,
        }}
      >
        <TableHeader
          style={{ minHeight: headerHeight }}
          onLayout={(event) => setFrozenHeaderHeight(event.height ?? 0)}
        >
          {frozenHeader}
        </TableHeader>
        <TableBody
          height={bodyHeight}
          testId={frozenTestId}
          ref={frozen}
          onScrollChange={mirror("frozen")}
        >
          {rows.map((record) => (
            <Fragment key={rowKey(record)}>{frozenRow(record)}</Fragment>
          ))}
        </TableBody>
      </div>
      <div
        style={{
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
          minWidth: 0,
          height,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TableViewport
          testId={viewportTestId}
          style={{ flexGrow: 1, minHeight: 0 }}
        >
          <div
            style={{
              width: contentWidth,
              flexGrow: 0,
              flexShrink: 0,
              flexBasis: contentWidth,
              display: "flex",
              flexDirection: "column",
              height,
              minHeight: 0,
            }}
          >
            <TableHeader
              style={{ minHeight: headerHeight }}
              onLayout={(event) => setDataHeaderHeight(event.height ?? 0)}
            >
              {header}
            </TableHeader>
            <TableBody
              height={bodyHeight}
              testId={bodyTestId}
              ref={body}
              onScrollChange={mirror("body")}
            >
              {rows.length === 0
                ? empty
                : rows.map((record) => (
                    <Fragment key={rowKey(record)}>{row(record)}</Fragment>
                  ))}
            </TableBody>
          </div>
        </TableViewport>
      </div>
    </div>
  );
};
