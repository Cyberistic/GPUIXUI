/**
 * A toolbar: the row of controls a data surface acts from.
 *
 * The runtime provides no toolbar host and needs none — a toolbar is a row
 * (`inspector-lifecycle` measured two actions sharing one `y`, both above the
 * rows they act on), so this component is that row: the muted strip, the
 * controls in it, and an optional search field at its head.
 *
 * The search field **debounces** through `@tanstack/pacer`: a query over a long
 * set is not worth a re-filter per keystroke, and the core's debouncer owns
 * the wait. The table's own filter field is a different control and is not
 * debounced — `table-filter-lifecycle` measured the set narrowing as the reader
 * types, and a delay there would be a regression.
 *
 * ```tsx
 * <DataToolbar search={{ value: query, onValueChange: setQuery }}>
 *   <Button onActivate={reset}>Reset</Button>
 * </DataToolbar>
 * ```
 */

import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Input } from "@gpuixui/primitives";
import { cn } from "@gpuixui/tw";
import { Debouncer } from "@tanstack/pacer";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import { DATA_TOOLBAR } from "./recipe.js";

/** The search field a toolbar carries. */
export interface ToolbarSearch {
  /** The query the field shows. */
  readonly value: string;
  /** Receives the debounced query. */
  readonly onValueChange: (next: string) => void;
  /** The hint a reader sees in the empty field. */
  readonly placeholder?: string;
  /** The field's accessible name. Defaults to `Search`. */
  readonly label?: string;
  /**
   * How long the query waits before it is reported, in milliseconds.
   *
   * Defaults to `150`. Zero reports every edit at once.
   */
  readonly debounceMs?: number;
}

/** {@link DataToolbar} props. */
export interface DataToolbarProps extends Omit<Props, "children"> {
  /** The controls the row holds. */
  readonly children?: ReactNode;
  /** The search field, at the head of the row. */
  readonly search?: ToolbarSearch;
  readonly className?: string;
  /**
   * The toolbar's test id. The search field derives from it:
   * `${testId}-search`.
   */
  readonly testId?: string;
}

/** How long a toolbar's query waits by default. */
export const DEFAULT_SEARCH_DEBOUNCE_MS = 150;

/**
 * A row of controls above a data surface.
 *
 * The search field reports a **debounced** query: the wait is the core's, and
 * a pending query is dropped when the toolbar unmounts.
 */
export const DataToolbar = ({
  children,
  search,
  className,
  style,
  testId,
  ...rest
}: DataToolbarProps) => {
  const theme = useTheme();
  const wait = search?.debounceMs ?? DEFAULT_SEARCH_DEBOUNCE_MS;
  // The debouncer holds the callback it was built with, so the latest one is
  // read through a ref: a new `onValueChange` must not rebuild the debouncer
  // and lose a pending query.
  const report = useRef<(next: string) => void>(() => {});
  report.current = search?.onValueChange ?? (() => {});
  const debouncer = useMemo(
    () => new Debouncer((next: string) => report.current(next), { wait }),
    [wait],
  );

  useEffect(() => () => debouncer.cancel(), [debouncer]);

  return (
    <div
      {...rest}
      style={mergeStyles(
        recipeStyle(cn(DATA_TOOLBAR, className), theme),
        style,
      )}
    >
      {search === undefined ? undefined : (
        <Input
          label={search.label ?? "Search"}
          placeholder={search.placeholder ?? "Search…"}
          value={search.value}
          onValueChange={(next) => {
            if (wait <= 0) report.current(next);
            else debouncer.maybeExecute(next);
          }}
          size="sm"
          testId={testId === undefined ? "toolbar-search" : `${testId}-search`}
        />
      )}
      {children}
    </div>
  );
};
