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
  {
    id: "r7",
    name: "onboarding.pdf",
    status: "archived",
    owner: "people",
    size: "2.2 MB",
  },
  {
    id: "r8",
    name: "release.json",
    status: "approved",
    owner: "platform",
    size: "8 KB",
  },
  {
    id: "r9",
    name: "palette.json",
    status: "draft",
    owner: "design",
    size: "4 KB",
  },
  {
    id: "r10",
    name: "archive.zip",
    status: "archived",
    owner: "platform",
    size: "12 MB",
  },
];

/** The frozen pane's width, and the width every frozen cell paints. */
export const FROZEN_WIDTH = 180;

/** The scrolling columns' total width: wider than the pane, so it can pan. */
export const CONTENT_WIDTH = 420;

/** The badge a record's status paints. */
const statusTone = (status: FrozenRecord["status"]): string =>
  status === "approved"
    ? "gx-badge-success"
    : status === "draft"
      ? "gx-badge-warning"
      : "gx-badge-neutral";

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
    <div role="rowgroup">
      {FROZEN_RECORDS.map((record) => {
        const selected = Option.contains(chosen, record.id);
        return (
          <div
            aria-selected={selected}
            className="gx-dt-row"
            data-interactive=""
            data-row={record.id}
            data-selected={selected ? "true" : "false"}
            key={record.id}
            onClick={() => select(record.id)}
            role="row"
            style={{
              minWidth: pane === "frozen" ? FROZEN_WIDTH : CONTENT_WIDTH,
            }}
          >
            {pane === "frozen" ? (
              <div
                className="gx-dt-cell gx-dt-fixed"
                role="cell"
                style={{ width: FROZEN_WIDTH }}
              >
                {record.name}
              </div>
            ) : (
              <>
                <div className="gx-dt-cell" role="cell">
                  <span
                    className={`gx-badge gx-badge-sm ${statusTone(record.status)}`}
                  >
                    {record.status}
                  </span>
                </div>
                <div className="gx-dt-cell" role="cell">
                  {record.owner}
                </div>
                <div className="gx-dt-cell gx-dt-right" role="cell">
                  {record.size}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="gx-data-scene">
      <div aria-label="Grid height" className="gx-data-row" role="group">
        <button
          aria-pressed={height === READABLE_HEIGHT}
          className="gx-btn gx-btn-sm gx-toggle"
          data-pressed={height === READABLE_HEIGHT ? "" : undefined}
          onClick={() => setHeight(READABLE_HEIGHT)}
          type="button"
        >
          {READABLE_HEIGHT} px
        </button>
        <button
          aria-pressed={Number.isNaN(height)}
          className="gx-btn gx-btn-sm gx-toggle"
          data-pressed={Number.isNaN(height) ? "" : undefined}
          onClick={() => setHeight(UNREADABLE_HEIGHT)}
          type="button"
        >
          NaN
        </button>
      </div>
      <div
        aria-label="Files"
        className="gx-dt gx-dt-frozen"
        role="table"
        style={Option.match(bound, {
          onNone: () => undefined,
          onSome: (value) => ({ height: value }),
        })}
      >
        <div
          className="gx-dt-frozen-pane"
          data-pane="frozen"
          style={{ width: FROZEN_WIDTH }}
        >
          <div className="gx-dt-head" role="rowgroup">
            <div className="gx-dt-row" role="row">
              <div
                className="gx-dt-hcell gx-dt-fixed"
                role="columnheader"
                style={{ width: FROZEN_WIDTH }}
              >
                Name
              </div>
            </div>
          </div>
          <div
            className="gx-dt-frozen-body"
            onScroll={() => apply("frozen")}
            ref={frozen}
            role="rowgroup"
          >
            {rows("frozen")}
          </div>
        </div>
        <div className="gx-dt-frozen-data" data-pane="data">
          <div className="gx-dt-head" role="rowgroup">
            <div
              className="gx-dt-row"
              role="row"
              style={{ minWidth: CONTENT_WIDTH }}
            >
              <div className="gx-dt-hcell" role="columnheader">
                Status
              </div>
              <div className="gx-dt-hcell" role="columnheader">
                Owner
              </div>
              <div className="gx-dt-hcell gx-dt-right" role="columnheader">
                Size
              </div>
            </div>
          </div>
          <div
            className="gx-dt-frozen-body"
            onScroll={() => apply("data")}
            ref={data}
            role="rowgroup"
          >
            {rows("data")}
          </div>
        </div>
      </div>
      <p className="gx-data-readout">
        height {Option.getOrElse(bound, () => "none — the pane's share")} ·{" "}
        {Option.match(chosen, {
          onNone: () => "no record chosen",
          onSome: (id) => `chosen ${id}`,
        })}
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
