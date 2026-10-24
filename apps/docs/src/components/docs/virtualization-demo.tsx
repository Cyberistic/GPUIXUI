import {
  DEFAULT_OVERDRAW,
  DEFAULT_ROW_HEIGHT,
  clampScrollOffset,
  createWindowCalculator,
  maxScrollOffset,
  rowIndex,
  type WindowSpec,
} from "@gpuixui/data/virtual/window";
import { useState } from "react";

/**
 * Browser preview for the Virtualization page.
 *
 * `VirtualTable` and `VirtualList` are GPUix hosts, so the page cannot mount
 * them and this drawing is a labelled approximation. The window is not
 * approximated: it is `@gpuixui/data`'s `createWindowCalculator` — the same
 * arithmetic `useVirtualRows` runs — over the same row height and overdraw the
 * package measures, so the rows painted and the readout cannot disagree.
 */

/** The logical rows the drawing windows over. */
export const VIRTUAL_COUNT = 1000;

/** The viewport the page documents, in pixels. */
export const VIRTUAL_VIEWPORT = 320;

/** The row height the shipped table paints at the default text step. */
export const VIRTUAL_ROW_HEIGHT = DEFAULT_ROW_HEIGHT;

/** The rows mounted beyond the viewport on each side. */
export const VIRTUAL_OVERDRAW = DEFAULT_OVERDRAW;

/** The spec both the drawing and its readout compute from. */
export const virtualSpec: WindowSpec = {
  count: VIRTUAL_COUNT,
  rowHeight: VIRTUAL_ROW_HEIGHT,
  viewportHeight: VIRTUAL_VIEWPORT,
  overdraw: VIRTUAL_OVERDRAW,
};

/** The farthest the drawing's scroll offset may go. */
export const virtualMaxOffset = maxScrollOffset(virtualSpec);

const calculator = createWindowCalculator(virtualSpec);

/** The offset a scroll gesture is clamped to, over these rows. */
export const virtualOffset = (offset: number): number =>
  clampScrollOffset(virtualSpec, offset);

/** The absolute row indices the window mounts at an offset. */
export const mountedRows = (offset: number): ReadonlyArray<number> =>
  calculator.indicesAt(virtualOffset(offset));

/** The rows in view, `start` inclusive and `end` exclusive. */
export const visibleRows = (offset: number): { start: number; end: number } =>
  calculator.at(virtualOffset(offset));

/** The offset a reveal of one row moves the window to. */
export const revealOffset = (index: number): number =>
  virtualOffset(rowIndex(index) * VIRTUAL_ROW_HEIGHT);

/** The row a mounted index paints; the first row is number 1. */
export const rowName = (index: number): string =>
  `row-${String(index + 1).padStart(4, "0")}.log`;

/** What the drawing reports about a window. */
export const windowReadout = (offset: number): string => {
  const window = visibleRows(offset);
  return `${window.start + 1}–${window.end} of ${VIRTUAL_COUNT} · ${
    mountedRows(offset).length
  } mounted`;
};

/** The virtualization page's browser rendering. */
export function VirtualizationDemo() {
  const [offset, setOffset] = useState(0);
  const mounted = mountedRows(offset);
  const window = visibleRows(offset);

  return (
    <div className="gx-virt-demo" data-demo="virtualization">
      <div className="gx-virt-toolbar">
        <label className="gx-virt-scroll">
          <span>Scroll offset</span>
          <input
            aria-label="Scroll offset"
            className="gx-virt-range"
            max={virtualMaxOffset}
            min={0}
            onChange={(event) =>
              setOffset(virtualOffset(Number(event.target.value)))
            }
            step={VIRTUAL_ROW_HEIGHT}
            type="range"
            value={offset}
          />
        </label>
        <button
          className="gx-table-columns-btn"
          onClick={() => setOffset(revealOffset(499))}
          type="button"
        >
          Reveal row 500
        </button>
      </div>
      <div className="gx-virt-frame">
        <div className="gx-virt-head" role="presentation">
          <span>File</span>
          <span>Window</span>
        </div>
        <div
          aria-label="The mounted rows"
          className="gx-virt-body"
          role="log"
          style={{ height: VIRTUAL_VIEWPORT }}
        >
          {mounted.map((index) => (
            <div
              className="gx-virt-row"
              data-index={index}
              key={index}
              style={{
                height: VIRTUAL_ROW_HEIGHT,
                top: index * VIRTUAL_ROW_HEIGHT - offset,
              }}
            >
              <span>{rowName(index)}</span>
              <span className="gx-table-number">
                {index >= window.start && index < window.end
                  ? "in view"
                  : "overdraw"}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="gx-trule-readout">{windowReadout(offset)}</p>
      <p className="gx-trule-hint">
        The header is a sibling above the row scroller, which is the only fixed
        header the runtime paints. Only the mounted rows exist: the window is{" "}
        {VIRTUAL_OVERDRAW * 2} rows wider than the viewport on each side, and a
        reveal moves the window before the body scrolls.
      </p>
    </div>
  );
}

/** The page's copyable native usage, shown in the preview's Code tab. */
export const virtualizationDemoSource = `import { VirtualTable } from "@gpuixui/data";

<VirtualTable
  aria-label="Build log"
  count={1000}
  height={320}
  rowHeight={37}
  header={
    <>
      <TableCell>File</TableCell>
      <TableCell>Size</TableCell>
    </>
  }
  row={(index) => (
    <>
      <TableCell>{files[index].name}</TableCell>
      <TableCell>{files[index].size}</TableCell>
    </>
  )}
/>;`;
