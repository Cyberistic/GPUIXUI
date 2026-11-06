/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type StateStyle,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
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
import {
  pageWindow,
  paginationRange,
  type PageItem,
} from "./pagination/logic.js";

interface PaginationContextValue {
  readonly current: number;
  readonly pageCount: number;
  readonly onPageChange: (page: number) => void;

  readonly window: ReadonlyArray<PageItem>;
}

const PaginationContext = createContext<PaginationContextValue | undefined>(
  undefined,
);

const usePagination = (): PaginationContextValue => {
  const value = useContext(PaginationContext);
  if (value === undefined) {
    throw new Error("Pagination parts must be used inside Pagination");
  }
  return value;
};

export interface PaginationProps extends Omit<Props, "children"> {
  readonly page: number;

  readonly pageCount: number;
  readonly onPageChange: (page: number) => void;

  readonly siblingCount?: number;

  readonly showEdges?: boolean;
  readonly className?: string;
  readonly children?: PartChildren;
}

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
  const { current, pageCount: count } = paginationRange(page, pageCount);
  const window = useMemo(
    () =>
      pageWindow({
        page: current,
        pageCount: count,
        siblingCount,
        showEdges,
      }),
    [current, count, siblingCount, showEdges],
  );

  if (count === 0) return null;

  assertParts(paginationRoot, children);

  return (
    <PaginationContext.Provider
      value={{ current, pageCount: count, onPageChange, window }}
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

export type PaginationPreviousProps = Props;

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
      <Icon name="chevron-left" size="md" color={theme.colors.foreground} />
      Prev
    </Button>
  );
};

export type PaginationNextProps = Props;

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
      Next
      <Icon name="chevron-right" size="md" color={theme.colors.foreground} />
    </Button>
  );
};

export interface PaginationListProps extends Props {
  readonly className?: string;
}

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

export interface PaginationItemProps extends Omit<Props, "style"> {
  readonly page: number;

  readonly style?: StateStyle<PaginationItemState>;
}

export interface PaginationItemState {
  readonly active: boolean;
}

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

export interface PaginationEllipsisProps extends Props {
  readonly className?: string;
}

export const PaginationEllipsis = ({
  className,
  style,
  ...rest
}: PaginationEllipsisProps) => {
  const theme = useTheme();

  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(PAGINATION_ELLIPSIS, className), theme),
        style,
      )}
    >
      <Icon
        name="ellipsis"
        size="xs"
        color={theme.colors.mutedForeground}
        label="More pages"
      />
    </div>
  );
};

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

    PaginationItem,
    PaginationEllipsis,
  ],
  hint: "Put PaginationPrevious, PaginationList and PaginationNext directly inside Pagination.",
};

export const paginationMeta = {
  name: "Pagination",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "no aria-current in 0.11.0; the current page carries aria-selected",
    "page numbers are the only navigation: there is no page-size control",
  ],
  docs: "docs/pagination.mdx",
  example: "examples/pagination.example.tsx",
  testFile: "src/behaviour/pagination.test.tsx",
} as const;
