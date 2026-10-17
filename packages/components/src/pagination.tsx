/**
 * Pagination: previous/next controls around a stable-width page window.
 *
 * The page arithmetic is `pagination/logic.ts`. This module only maps the window
 * onto buttons and guards the two meaningful no-ops: a disabled edge cannot be
 * pressed, and pressing the current page does not report a change.
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import * as Arr from "effect/Array";
import { Button } from "./internal/button.js";
import { controlHeight, textStyle, useTheme } from "./internal/theme.js";
import { pageWindow } from "./pagination/logic.js";

/** {@link Pagination} props. */
export interface PaginationProps extends Props {
  /** The current page, 1-based. Clamped into `[1, pageCount]`. */
  readonly page: number;
  /** How many pages exist. Zero or fewer renders nothing. */
  readonly pageCount: number;
  readonly onPageChange: (page: number) => void;
  /** Pages shown either side of the current one. Default 1. */
  readonly siblingCount?: number;
  /** Keep the first and last page visible. Default `true`. */
  readonly showEdges?: boolean;
}

/** A page number in the window. */
const PageButton = ({
  page,
  current,
  onSelect,
}: {
  readonly page: number;
  readonly current: boolean;
  readonly onSelect: (page: number) => void;
}) => {
  const theme = useTheme();
  const height = controlHeight(theme, "sm");

  return (
    <Button
      variant={current ? "primary" : "ghost"}
      size="sm"
      aria-label={`Page ${page}`}
      aria-selected={current}
      onClick={current ? undefined : () => onSelect(page)}
      style={{
        height,
        minWidth: height,
        paddingLeft: 0,
        paddingRight: 0,
      }}
    >
      {String(page)}
    </Button>
  );
};

/**
 * Previous/next plus the numbered window. `onPageChange` is only called with a
 * page the user can actually go to, and never with the current page.
 */
export const Pagination = ({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  showEdges = true,
  style,
  ...rest
}: PaginationProps) => {
  const theme = useTheme();
  if (pageCount <= 0) return null;

  const current = Math.min(Math.max(page, 1), pageCount);
  const window = pageWindow({
    page: current,
    pageCount,
    siblingCount,
    showEdges,
  });
  const hasPrevious = current > 1;
  const hasNext = current < pageCount;

  return (
    <div
      role="navigation"
      aria-label="Pagination"
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.xs,
        },
        style,
      )}
    >
      <Button
        variant="ghost"
        size="sm"
        aria-label="Previous page"
        disabled={!hasPrevious}
        onClick={() => onPageChange(current - 1)}
        style={{
          paddingLeft: theme.spacing.sm,
          paddingRight: theme.spacing.sm,
        }}
      >
        ‹ Prev
      </Button>
      {Arr.map(window, (entry) =>
        entry.kind === "page" ? (
          <PageButton
            key={`page-${entry.page}`}
            page={entry.page}
            current={entry.page === current}
            onSelect={onPageChange}
          />
        ) : (
          <text
            key={`gap-${entry.side}`}
            aria-label="More pages"
            style={{
              ...textStyle(theme, "caption"),
              color: theme.colors.mutedForeground,
              paddingLeft: theme.spacing["2xs"],
              paddingRight: theme.spacing["2xs"],
            }}
          >
            …
          </text>
        ),
      )}
      <Button
        variant="ghost"
        size="sm"
        aria-label="Next page"
        disabled={!hasNext}
        onClick={() => onPageChange(current + 1)}
        style={{
          paddingLeft: theme.spacing.sm,
          paddingRight: theme.spacing.sm,
        }}
      >
        Next ›
      </Button>
    </div>
  );
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const paginationMeta = {
  name: "Pagination",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no aria-current in 0.10.0; the current page carries aria-selected",
    "page numbers are the only navigation: there is no page-size control",
  ],
  docs: "docs/pagination.mdx",
  example: "examples/pagination.example.tsx",
  testFile: "src/behaviour/pagination.test.tsx",
} as const;
