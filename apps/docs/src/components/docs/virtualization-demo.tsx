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
import { rowsInView, viewReadout } from "./window-preview";

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

/** The rows the window mounts at an offset: the view plus the overdraw. */
export const mountedWindow = (offset: number): { start: number; end: number } =>
  calculator.at(virtualOffset(offset));

/** The offset a reveal of one row moves the window to. */
export const revealOffset = (index: number): number =>
  virtualOffset(rowIndex(index) * VIRTUAL_ROW_HEIGHT);

/** The row a mounted index paints; the first row is number 1. */
export const rowName = (index: number): string =>
  `row-${String(index + 1).padStart(4, "0")}.log`;

/** What the drawing reports about a window. */
export const windowReadout = (offset: number): string =>
  viewReadout(virtualSpec, offset, mountedRows(offset).length);

/** The virtualization page's browser rendering. */
export function VirtualizationDemo() {
  const [offset, setOffset] = useState(0);
  const mounted = mountedRows(offset);
  const view = rowsInView(virtualSpec, offset);

  return (
    <div className="gx-data-scene" data-demo="virtualization">
      <div className="gx-data-row">
        <label className="gx-dfield gx-dfield-sm gx-dnumber">
          <input
            aria-label="Scroll offset"
            max={virtualMaxOffset}
            min={0}
            onChange={(event) =>
              setOffset(virtualOffset(Number(event.target.value)))
            }
            step={VIRTUAL_ROW_HEIGHT}
            type="number"
            value={offset}
          />
          <span className="gx-dnumber-steps">
            <button
              aria-label="Scroll up one row"
              className="gx-dnumber-step"
              onClick={() =>
                setOffset(virtualOffset(offset - VIRTUAL_ROW_HEIGHT))
              }
              type="button"
            >
              ▲
            </button>
            <button
              aria-label="Scroll down one row"
              className="gx-dnumber-step"
              onClick={() =>
                setOffset(virtualOffset(offset + VIRTUAL_ROW_HEIGHT))
              }
              type="button"
            >
              ▼
            </button>
          </span>
        </label>
        <button
          className="gx-btn gx-btn-sm gx-btn-secondary"
          onClick={() => setOffset(revealOffset(499))}
          type="button"
        >
          Reveal row 500
        </button>
      </div>
      <div aria-label="Build log" className="gx-dt" role="table">
        <div className="gx-dt-head" role="rowgroup">
          <div className="gx-dt-row" role="row">
            <div className="gx-dt-hcell" role="columnheader">
              File
            </div>
            <div className="gx-dt-hcell gx-dt-right" role="columnheader">
              Window
            </div>
          </div>
        </div>
        <div
          aria-label="The mounted rows"
          className="gx-virt-body"
          role="rowgroup"
          style={{ height: VIRTUAL_VIEWPORT - 36 }}
        >
          {mounted.map((index) => (
            <div
              className="gx-dt-row gx-virt-row"
              data-index={index}
              key={index}
              role="row"
              style={{
                height: VIRTUAL_ROW_HEIGHT,
                top: index * VIRTUAL_ROW_HEIGHT - offset,
              }}
            >
              <div className="gx-dt-cell" role="cell">
                {rowName(index)}
              </div>
              <div className="gx-dt-cell gx-dt-right" role="cell">
                <span
                  className={`gx-badge gx-badge-sm ${
                    index >= view.start && index < view.end
                      ? "gx-badge-success"
                      : "gx-badge-neutral"
                  }`}
                >
                  {index >= view.start && index < view.end
                    ? "in view"
                    : "overdraw"}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="gx-dt-caption">{windowReadout(offset)}</p>
      </div>
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
