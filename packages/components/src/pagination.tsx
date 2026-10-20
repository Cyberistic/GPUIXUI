/**
 * Pagination: previous/next controls around a stable-width page window.
 *
 * The page arithmetic is `pagination/logic.ts`. This module maps the window onto
 * parts: the root owns the clamped page and the window, `PaginationList` renders
 * it, and Previous/Next are the caller's to place. Pressing the current page is
 * still the one meaningful no-op.
 *
 * `docs/component-api.md` §1: every region is a part; the root keeps the state
 * because the window is derived from it, not because it is the only composition.
 */

import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import {
  cn,
  PAGINATION_ELLIPSIS,
  PAGINATION_LIST,
  PAGINATION_ROOT,
} from "@gpuixui/tw";
import * as Arr from "effect/Array";
import { createContext, useContext, useMemo } from "react";
import { Button } from "./internal/button.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { controlHeight, useTheme } from "./internal/theme.js";
import { pageWindow, type PageItem } from "./pagination/logic.js";

/** The rules a pagination part follows; throws outside a {@link Pagination}. */
interface PaginationContextValue {
  /** The current page, already clamped into `[1, pageCount]`. */
  readonly current: number;
  readonly pageCount: number;
  readonly onPageChange: (page: number) => void;
  /** The entries the list renders, in display order. */
  readonly window: ReadonlyArray<PageItem>;
}

const PaginationContext = createContext<PaginationContextValue | undefined>(
  undefined,
);

/** The pagination a part belongs to. Throws when there is none. */
const usePagination = (): PaginationContextValue => {
  const value = useContext(PaginationContext);
  if (value === undefined) {
    throw new Error("Pagination parts must be used inside Pagination");
  }
  return value;
};

/** {@link Pagination} props. */
export interface PaginationProps extends Omit<Props, "children"> {
  /** The current page, 1-based. Clamped into `[1, pageCount]`. */
  readonly page: number;
  /** How many pages exist. Zero or fewer renders nothing. */
  readonly pageCount: number;
  readonly onPageChange: (page: number) => void;
  /** Pages shown either side of the current one. Default 1. */
  readonly siblingCount?: number;
  /** Keep the first and last page visible. Default `true`. */
  readonly showEdges?: boolean;
  readonly className?: string;
  readonly children?: PartChildren;
}

/**
 * The landmarks, the clamped page and the window. Compose
 * {@link PaginationPrevious}, {@link PaginationList} and {@link PaginationNext}
 * inside it; the control renders nothing when there are no pages.
 */
export const Pagination = ({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  showEdges = true,
  className,
  children,
  style,
  ...rest
}: PaginationProps) => {
  const theme = useTheme();
  const current = Math.min(Math.max(page, 1), pageCount);
  const window = useMemo(
    () => pageWindow({ page: current, pageCount, siblingCount, showEdges }),
    [current, pageCount, siblingCount, showEdges],
  );

  if (pageCount <= 0) return null;

  assertParts(paginationRoot, children);

  return (
    <PaginationContext.Provider
      value={{ current, pageCount, onPageChange, window }}
    >
      <div
        role="navigation"
        aria-label="Pagination"
        {...rest}
        style={mergeStyles(
          recipeStyle(cn(PAGINATION_ROOT, className), theme),
          style,
        )}
      >
        {children}
      </div>
    </PaginationContext.Provider>
  );
};

/** {@link PaginationPrevious} props. */
export type PaginationPreviousProps = Props;

/** The previous-page control; it leaves the tab order on the first page. */
export const PaginationPrevious = ({
  style,
  ...rest
}: PaginationPreviousProps) => {
  const theme = useTheme();
  const { current, onPageChange } = usePagination();

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Previous page"
      disabled={current <= 1}
      onClick={() => onPageChange(current - 1)}
      {...rest}
      style={mergeStyles(
        {
          paddingLeft: theme.spacing.sm,
          paddingRight: theme.spacing.sm,
        },
        style,
      )}
    >
      ‹ Prev
    </Button>
  );
};

/** {@link PaginationNext} props. */
export type PaginationNextProps = Props;

/** The next-page control; it leaves the tab order on the last page. */
export const PaginationNext = ({ style, ...rest }: PaginationNextProps) => {
  const theme = useTheme();
  const { current, pageCount, onPageChange } = usePagination();

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Next page"
      disabled={current >= pageCount}
      onClick={() => onPageChange(current + 1)}
      {...rest}
      style={mergeStyles(
        {
          paddingLeft: theme.spacing.sm,
          paddingRight: theme.spacing.sm,
        },
        style,
      )}
    >
      Next ›
    </Button>
  );
};

/** {@link PaginationList} props. */
export interface PaginationListProps extends Props {
  readonly className?: string;
}

/** The page window: page buttons and the ellipses that stand in for gaps. */
export const PaginationList = ({
  className,
  style,
  ...rest
}: PaginationListProps) => {
  const theme = useTheme();
  const { window } = usePagination();

  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(PAGINATION_LIST, className), theme),
        style,
      )}
    >
      {Arr.map(window, (entry) =>
        entry.kind === "page" ? (
          <PaginationItem key={`page-${entry.page}`} page={entry.page} />
        ) : (
          <PaginationEllipsis key={`gap-${entry.side}`} />
        ),
      )}
    </div>
  );
};

/** {@link PaginationItem} props. */
export interface PaginationItemProps extends Omit<Props, "style"> {
  /** The page this button goes to. */
  readonly page: number;
  /** A style, or a function of the page's state. */
  readonly style?: StateStyle<PaginationItemState>;
}

/** What a page control draws. */
export interface PaginationItemState {
  /** This control is the current page. */
  readonly active: boolean;
}

/**
 * One page number. The current page is painted with the primary role, carries
 * `aria-selected`, and pressing it does nothing.
 */
export const PaginationItem = ({
  page,
  style,
  ...rest
}: PaginationItemProps) => {
  const theme = useTheme();
  const { current, onPageChange } = usePagination();
  const isCurrent = page === current;
  const height = controlHeight(theme, "sm");
  const state: PaginationItemState = { active: isCurrent };

  return (
    <Button
      variant={isCurrent ? "primary" : "ghost"}
      size="sm"
      aria-label={`Page ${page}`}
      aria-selected={isCurrent}
      onClick={isCurrent ? undefined : () => onPageChange(page)}
      {...rest}
      style={mergeStyles(
        {
          height,
          minWidth: height,
          paddingLeft: 0,
          paddingRight: 0,
        },
        resolveStyle(style, state),
      )}
    >
      {String(page)}
    </Button>
  );
};

/** {@link PaginationEllipsis} props. */
export interface PaginationEllipsisProps extends Props {
  readonly className?: string;
}

/** A non-focusable stand-in for pages the window leaves out. */
export const PaginationEllipsis = ({
  className,
  style,
  ...rest
}: PaginationEllipsisProps) => {
  const theme = useTheme();

  return (
    <text
      aria-label="More pages"
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(PAGINATION_ELLIPSIS, className), theme),
        style,
      )}
    >
      …
    </text>
  );
};

/** Every part of Pagination, so a misplaced sibling is named. */
const paginationParts: ReadonlyArray<PartComponent> = [
  Pagination,
  PaginationPrevious,
  PaginationNext,
  PaginationList,
  PaginationItem,
  PaginationEllipsis,
];

const paginationRoot: PartsContract = {
  parent: "Pagination",
  family: paginationParts,
  accepts: [
    PaginationPrevious,
    PaginationList,
    PaginationNext,
    // A bare item is supported: it reads the root's page and can stand outside
    // the window (the measurement in `pagination.test.tsx` relies on it).
    PaginationItem,
    PaginationEllipsis,
  ],
  hint: "Put PaginationPrevious, PaginationList and PaginationNext directly inside Pagination.",
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
