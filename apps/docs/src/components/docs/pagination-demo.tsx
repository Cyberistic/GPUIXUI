import { useState, type ReactNode } from "react";
import {
  DEPLOYMENTS,
  PAGE_SIZE,
  pageCountFor,
  pageWindow,
  rangeLabel,
  rowsOn,
  type PageItem,
} from "./pagination-preview";

/**
 * Browser previews for the Pagination page.
 *
 * The shipped control is controlled: the app owns the page, the control clamps
 * it and derives one stable crop around it. The drawing takes the same rules —
 * one `pageWindow` for every crop, an ellipsis only where it hides two or more
 * pages, Previous/Next disabled at an end — so a reader pressing through the
 * preview meets the component's arithmetic rather than a generic page rail.
 *
 * The paint is the library's: a page button is the `sm` control height square,
 * the current page wears the primary fill, and the rest are ghost rows. What the
 * page says it is an approximation of is the type scale and the drawing's
 * spacing; the geometry comes from the platform variables a `PreviewSurface`
 * sets.
 */

interface PaginationBarProps {
  readonly page: number;
  readonly pageCount: number;
  readonly onPageChange: (page: number) => void;
  readonly siblingCount?: number;
  readonly showEdges?: boolean;
  readonly label?: string;
}

/** The control itself: Previous, the derived window, Next. */
const PaginationBar = ({
  page,
  pageCount,
  onPageChange,
  siblingCount,
  showEdges,
  label,
}: PaginationBarProps): ReactNode => {
  const entries: ReadonlyArray<PageItem> =
    pageCount <= 0
      ? []
      : pageWindow({ page, pageCount, siblingCount, showEdges });

  if (pageCount <= 0) return null;

  const current = Math.min(Math.max(page, 1), pageCount);

  return (
    <nav aria-label={label ?? "Pagination"} className="gx-pagination">
      <button
        aria-label="Previous page"
        className="gx-btn gx-btn-sm gx-btn-ghost gx-pagination-step"
        disabled={current <= 1}
        onClick={() => onPageChange(current - 1)}
        type="button"
      >
        <span aria-hidden="true">‹</span> Prev
      </button>
      <div className="gx-pagination-list">
        {entries.map((entry) =>
          entry.kind === "page" ? (
            <button
              aria-label={`Page ${entry.page}`}
              aria-selected={entry.page === current}
              className={`gx-btn gx-btn-sm gx-pagination-page${
                entry.page === current ? " gx-btn-primary" : " gx-btn-ghost"
              }`}
              key={`page-${entry.page}`}
              onClick={
                entry.page === current
                  ? undefined
                  : () => onPageChange(entry.page)
              }
              type="button"
            >
              {entry.page}
            </button>
          ) : (
            <span
              aria-label="More pages"
              className="gx-pagination-ellipsis"
              key="gap"
            >
              …
            </span>
          ),
        )}
      </div>
      <button
        aria-label="Next page"
        className="gx-btn gx-btn-sm gx-btn-ghost gx-pagination-step"
        disabled={current >= pageCount}
        onClick={() => onPageChange(current + 1)}
        type="button"
      >
        Next <span aria-hidden="true">›</span>
      </button>
    </nav>
  );
};

/** A deployments list paged five at a time, the composition the component is for. */
const PaginationWorkflow = (): ReactNode => {
  const pageCount = pageCountFor(DEPLOYMENTS);
  const [page, setPage] = useState(1);
  const rows = rowsOn(DEPLOYMENTS, page);

  return (
    <div className="gx-demo-pagination">
      <div className="gx-pagination-scene">
        <div className="gx-pagination-head">
          <div>
            <p className="gx-pagination-title">Deployments</p>
            <p className="gx-pagination-subtitle">
              The last 24 hours, five per page
            </p>
          </div>
          <span className="gx-pagination-chip">
            {DEPLOYMENTS.length} deploys
          </span>
        </div>
        <ul className="gx-pagination-rows">
          {rows.map((row) => (
            <li className="gx-pagination-row" key={row.id}>
              <span className="gx-pagination-service">{row.service}</span>
              <span className="gx-pagination-meta">{row.environment}</span>
              <span className="gx-pagination-meta">{row.age}</span>
              <span className="gx-pagination-status" data-status={row.status}>
                <span aria-hidden="true" className="gx-pagination-dot" />
                {row.status}
              </span>
            </li>
          ))}
        </ul>
        <div className="gx-pagination-foot">
          <p aria-live="polite" className="gx-pagination-range" role="status">
            {rangeLabel(DEPLOYMENTS, page, PAGE_SIZE)}
          </p>
          <PaginationBar
            label="Deployment pages"
            onPageChange={setPage}
            page={page}
            pageCount={pageCount}
          />
        </div>
      </div>
      <p className="gx-pagination-hint">
        The footer and the rows read the same page. Press Next to the last page:
        it holds six hidden pages, so the crop is <code>1 … 6 7 8 9 10</code>{" "}
        rather than a rail that grows at the edge.
      </p>
    </div>
  );
};

interface TileProps {
  readonly title: string;
  readonly note: string;
  readonly page: number;
  readonly pageCount: number;
  readonly siblingCount?: number;
  readonly showEdges?: boolean;
}

/** One tile: its own page state, so the reader can page the crop it shows. */
const PaginationTile = ({
  title,
  note,
  page,
  pageCount,
  siblingCount,
  showEdges,
}: TileProps): ReactNode => {
  const [current, setCurrent] = useState(page);

  return (
    <div className="gx-pagination-tile">
      <p className="gx-pagination-tile-title">{title}</p>
      <div className="gx-pagination-tile-rail">
        {pageCount <= 0 ? (
          <p className="gx-pagination-empty">renders nothing</p>
        ) : (
          <PaginationBar
            label={title}
            onPageChange={setCurrent}
            page={current}
            pageCount={pageCount}
            showEdges={showEdges}
            siblingCount={siblingCount}
          />
        )}
      </div>
      <p className="gx-pagination-tile-note">{note}</p>
    </div>
  );
};

/** The window rule, the two knobs, the clamp and the empty result set. */
const PaginationStates = (): ReactNode => (
  <div className="gx-demo-pagination">
    <div className="gx-pagination-tiles">
      <PaginationTile
        note="A list that fits (siblings + 5 pages or fewer) is drawn whole."
        page={1}
        pageCount={10}
        title="First page of ten"
      />
      <PaginationTile
        note="Two gaps become two ellipses; the crop keeps its width."
        page={5}
        pageCount={10}
        title="A page in the middle"
      />
      <PaginationTile
        note="The same width at the end — Next is disabled, not hidden."
        page={10}
        pageCount={10}
        title="The last page"
      />
      <PaginationTile
        note="One hidden page is the number itself, not an ellipsis."
        page={8}
        pageCount={8}
        title="A gap of one"
      />
      <PaginationTile
        note="siblingCount={2} widens the crop around the current page."
        page={3}
        pageCount={20}
        siblingCount={2}
        title="Wider siblings"
      />
      <PaginationTile
        note="showEdges={false} drops the first and last page entirely."
        page={3}
        pageCount={20}
        showEdges={false}
        title="No edges"
      />
      <PaginationTile
        note="A stored page past the end paints the last page, not a blank rail."
        page={99}
        pageCount={10}
        title="page={99} on ten pages"
      />
      <PaginationTile
        note="No pages is no control: the root returns nothing."
        page={1}
        pageCount={0}
        title="pageCount={0}"
      />
    </div>
    <p className="gx-pagination-hint">
      Every tile clamps and crops with the component&apos;s own rule — the
      ellipsis only ever hides two or more pages, which is why a gap of one
      prints the number.
    </p>
  </div>
);

const workflowSource = `import { useState } from "react";
import {
  Pagination,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from "@gpuixui/components/pagination";

const PAGE_SIZE = 5;

export const DeploymentPages = ({ deployments }: { deployments: string[] }) => {
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(deployments.length / PAGE_SIZE);
  const rows = deployments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <DeploymentList rows={rows} />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage}>
        <PaginationPrevious />
        <PaginationList />
        <PaginationNext />
      </Pagination>
    </>
  );
};`;

const statesSource = `import {
  Pagination,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
} from "@gpuixui/components/pagination";

// The two knobs are the only variants: the window is derived, not composed.
export const Windows = () => (
  <>
    {/* 1 2 3 4 5 … 10 */}
    <Pagination page={1} pageCount={10} onPageChange={() => {}}>
      <PaginationPrevious />
      <PaginationList />
      <PaginationNext />
    </Pagination>

    {/* 1 2 3 4 5 6 7 … 20 — a wider crop */}
    <Pagination
      page={3}
      pageCount={20}
      siblingCount={2}
      onPageChange={() => {}}
    >
      <PaginationPrevious />
      <PaginationList />
      <PaginationNext />
    </Pagination>

    {/* 2 3 4 — the siblings alone */}
    <Pagination
      page={3}
      pageCount={20}
      showEdges={false}
      onPageChange={() => {}}
    >
      <PaginationPrevious />
      <PaginationList />
      <PaginationNext />
    </Pagination>

    {/* An out-of-range page paints the last page, not a blank rail. */}
    <Pagination page={99} pageCount={10} onPageChange={() => {}}>
      <PaginationPrevious />
      <PaginationList />
      <PaginationNext />
    </Pagination>
  </>
);`;

export {
  PaginationStates,
  PaginationWorkflow,
  statesSource as paginationStatesSource,
  workflowSource as paginationWorkflowSource,
};
