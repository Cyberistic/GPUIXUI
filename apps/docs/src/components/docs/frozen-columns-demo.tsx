import { paintableSize } from "@gpuixui/data/internal/size";
import * as Option from "effect/Option";
import { useRef, useState } from "react";

/**
 * Browser preview for the Frozen columns page.
 *
 * `@gpuixui/data`'s `FrozenTable` is a GPUix host composition, so the package
 * page cannot mount it and this drawing is a labelled approximation. What it
 * does not approximate is the composition's rule: GPUix 0.11.0 paints no
 * `position: "sticky"`, so the frozen column is a **second scroller** beside the
 * data pane, mirrored through one offset — a wheel over either pane moves both
 * vertically, and only the data pane pans sideways. The height rule is the
 * package's own `paintableSize`: a `NaN`, an infinity or a negative is **no
 * height**, so the panes take the share of the pane they sit in, and zero is a
 * height (an empty box is the caller's choice). Only the paint is the browser's.
 */

/** One scroll offset, as a browser reports it. */
export interface ScrollPair {
  readonly scrollTop: number;
  readonly scrollLeft: number;
}

/** The offset each pane takes after one of them scrolled. */
export interface Panes {
  readonly frozen: ScrollPair;
  readonly data: ScrollPair;
}

/**
 * The offsets both panes take after one scrolled.
 *
 * A vertical mirror must not reset the data pane's `x` — the programmatic
 * scroll paints synchronously and reports its own change — so the data pane's
 * last horizontal offset is carried into a vertical mirror, and the frozen
 * column never pans sideways: its `scrollLeft` is always zero.
 */
export const mirroredOffsets = (
  scrolled: "frozen" | "data",
  offset: ScrollPair,
  dataScrollLeft: number,
): Panes => ({
  frozen: { scrollTop: offset.scrollTop, scrollLeft: 0 },
  data: {
    scrollTop: offset.scrollTop,
    scrollLeft: scrolled === "data" ? offset.scrollLeft : dataScrollLeft,
  },
});

/** The box the drawing gives the panes when the caller's height can paint. */
export const READABLE_HEIGHT = 200;

/** The a height the layout cannot paint: a share that arrived as `NaN`. */
export const UNREADABLE_HEIGHT = Number.NaN;

/** A record the grid lists, split across the frozen and the data columns. */
export interface FrozenRecord {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly owner: string;
  readonly size: string;
}

/** The records the grid opens on: more than one pane can show at 200px. */
export const FROZEN_RECORDS: ReadonlyArray<FrozenRecord> = [
  {
    id: "r1",
    name: "harbour-chart.png",
    status: "approved",
    owner: "design",
    size: "1.4 MB",
  },
  { id: "r2", name: "notes.md", status: "draft", owner: "docs", size: "12 KB" },
  {
    id: "r3",
    name: "deploy.log",
    status: "archived",
    owner: "platform",
    size: "318 KB",
  },
  {
    id: "r4",
    name: "budget.csv",
    status: "approved",
    owner: "finance",
    size: "48 KB",
  },
  {
    id: "r5",
    name: "roadmap.mdx",
    status: "draft",
    owner: "product",
    size: "24 KB",
  },
  {
    id: "r6",
    name: "tokens.ts",
    status: "approved",
    owner: "design",
    size: "36 KB",
  },
];

/** The record the grid opens on: the first one, chosen for the whole grid. */
const OPENING_CHOICE: Option.Option<string> = Option.fromNullishOr(
  FROZEN_RECORDS[0]?.id,
);

/** The page's preview: a frozen column beside a data pane that pans. */
export function FrozenColumnsDemo() {
  const [height, setHeight] = useState<number>(READABLE_HEIGHT);
  const [chosen, setChosen] = useState<Option.Option<string>>(OPENING_CHOICE);
  const frozen = useRef<HTMLDivElement | null>(null);
  const data = useRef<HTMLDivElement | null>(null);
  const dataX = useRef(0);
  const bound = paintableSize(height);

  const apply = (pane: "frozen" | "data"): void => {
    const element = pane === "frozen" ? frozen.current : data.current;
    if (element === null) return;
    const offset = {
      scrollTop: element.scrollTop,
      scrollLeft: element.scrollLeft,
    };
    const next = mirroredOffsets(pane, offset, dataX.current);
    dataX.current = next.data.scrollLeft;
    const frozenElement = frozen.current;
    const dataElement = data.current;
    if (
      frozenElement !== null &&
      frozenElement.scrollTop !== next.frozen.scrollTop
    )
      frozenElement.scrollTop = next.frozen.scrollTop;
    if (dataElement !== null) {
      if (dataElement.scrollTop !== next.data.scrollTop)
        dataElement.scrollTop = next.data.scrollTop;
      if (dataElement.scrollLeft !== next.data.scrollLeft)
        dataElement.scrollLeft = next.data.scrollLeft;
    }
  };

  /** The same handler on both panes: a press selects the record for the grid. */
  const select = (id: string): void => setChosen(Option.some(id));

  const rows = (pane: "frozen" | "data") => (
    <div className="gx-fc-rows" role="rowgroup">
      {FROZEN_RECORDS.map((record) => (
        <div
          aria-selected={Option.contains(chosen, record.id)}
          className="gx-fc-row"
          key={record.id}
          onClick={() => select(record.id)}
          role="row"
        >
          {pane === "frozen" ? (
            <span className="gx-fc-cell gx-fc-name" role="cell">
              {record.name}
            </span>
          ) : (
            <>
              <span className="gx-fc-cell gx-fc-status" role="cell">
                {record.status}
              </span>
              <span className="gx-fc-cell gx-fc-owner" role="cell">
                {record.owner}
              </span>
              <span className="gx-fc-cell gx-fc-size" role="cell">
                {record.size}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="gx-demo-frame">
      <div
        aria-label="Files"
        className="gx-fc"
        role="table"
        style={Option.match(bound, {
          onNone: () => undefined,
          onSome: (value) => ({ height: value }),
        })}
      >
        <div className="gx-fc-pane gx-fc-frozen" data-pane="frozen">
          <div className="gx-fc-head" role="rowgroup">
            <div className="gx-fc-headrow" role="row">
              <span className="gx-fc-cell gx-fc-name" role="columnheader">
                Name
              </span>
            </div>
          </div>
          <div
            className="gx-fc-body"
            onScroll={() => apply("frozen")}
            ref={frozen}
            role="rowgroup"
          >
            {rows("frozen")}
          </div>
        </div>
        <div className="gx-fc-pane gx-fc-data" data-pane="data">
          <div className="gx-fc-head" role="rowgroup">
            <div className="gx-fc-headrow" role="row">
              <span className="gx-fc-cell gx-fc-status" role="columnheader">
                Status
              </span>
              <span className="gx-fc-cell gx-fc-owner" role="columnheader">
                Owner
              </span>
              <span className="gx-fc-cell gx-fc-size" role="columnheader">
                Size
              </span>
            </div>
          </div>
          <div
            className="gx-fc-body"
            onScroll={() => apply("data")}
            ref={data}
            role="rowgroup"
          >
            {rows("data")}
          </div>
        </div>
      </div>
      <div aria-label="Grid height" className="gx-demo-choices" role="group">
        <button
          aria-pressed={height === READABLE_HEIGHT}
          className="gx-demo-choice"
          onClick={() => setHeight(READABLE_HEIGHT)}
          type="button"
        >
          {READABLE_HEIGHT} px
        </button>
        <button
          aria-pressed={Number.isNaN(height)}
          className="gx-demo-choice"
          onClick={() => setHeight(UNREADABLE_HEIGHT)}
          type="button"
        >
          NaN
        </button>
      </div>
      <p className="gx-demo-readout">
        height {Option.getOrElse(bound, () => "none — the pane's share")} ·
        frozen column stays, data pane pans ·{" "}
        {Option.match(chosen, {
          onNone: () => "no record chosen",
          onSome: (id) => `chosen ${id}`,
        })}
      </p>
      <p className="gx-demo-hint">
        There is no sticky position in GPUix 0.11.0: the frozen column is a
        second scroller, and both panes read one offset, so a wheel over either
        keeps the record at the same y. The preview&apos;s frame stands in for
        the pane the shipped grid measures.
      </p>
    </div>
  );
}

export const frozenColumnsDemoSource = `import { FrozenTable, TableCell, TableHeaderCell, TableRow } from "@gpuixui/data";

<FrozenTable
  height={320}
  frozenWidth={180}
  contentWidth={420}
  rows={rows}
  rowKey={(row) => row.id}
  aria-label="Files"
  frozenHeader={
    <TableRow>
      <TableHeaderCell width={180}>Name</TableHeaderCell>
    </TableRow>
  }
  frozenRow={(row) => (
    <TableRow onClick={() => choose(row.id)}>
      <TableCell width={180}>{row.name}</TableCell>
    </TableRow>
  )}
  header={
    <TableRow>
      <TableHeaderCell width={140}>Status</TableHeaderCell>
      <TableHeaderCell width={140}>Owner</TableHeaderCell>
      <TableHeaderCell width={140}>Size</TableHeaderCell>
    </TableRow>
  }
  row={(row) => (
    <TableRow onClick={() => choose(row.id)}>
      <TableCell width={140}>{row.status}</TableCell>
      <TableCell width={140}>{row.owner}</TableCell>
      <TableCell width={140}>{row.size}</TableCell>
    </TableRow>
  )}
/>;`;
