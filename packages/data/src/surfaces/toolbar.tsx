/** @jsxImportSource @gpuix/react */
import type { Props } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { Input } from "@gpuixui/primitives";
import { spokenText, visibleCopy } from "@gpuixui/primitives/core";
import { cn } from "@gpuixui/tw";
import { Debouncer } from "@tanstack/pacer";
import * as Option from "effect/Option";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import { DATA_TOOLBAR } from "./recipe.js";

export interface ToolbarSearch {
  readonly value: string;

  readonly onValueChange: (next: string) => void;

  readonly placeholder?: string;

  readonly label?: string;

  readonly debounceMs?: number;
}

export interface DataToolbarProps extends Omit<Props, "children"> {
  readonly children?: ReactNode;

  readonly search?: ToolbarSearch;
  readonly className?: string;

  readonly testId?: string;
}

export const DEFAULT_SEARCH_DEBOUNCE_MS = 150;

export const DEFAULT_SEARCH_LABEL = "Search";

export const DEFAULT_SEARCH_PLACEHOLDER = "Search…";

const searchWait = (milliseconds: number | undefined): number =>
  milliseconds === undefined ||
  !Number.isFinite(milliseconds) ||
  milliseconds < 0
    ? DEFAULT_SEARCH_DEBOUNCE_MS
    : milliseconds;

export const DataToolbar = ({
  children,
  search,
  className,
  style,
  testId,
  ...rest
}: DataToolbarProps) => {
  const theme = useTheme();

  const field = Option.fromNullishOr(search);
  const wait = searchWait(search?.debounceMs);

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
      {Option.match(field, {
        onNone: () => undefined,
        onSome: (query) => (
          <Input
            label={spokenText(
              Option.fromNullishOr(query.label),
              DEFAULT_SEARCH_LABEL,
            )}
            placeholder={
              visibleCopy(query.placeholder) ?? DEFAULT_SEARCH_PLACEHOLDER
            }
            value={query.value}
            onValueChange={(next) => {
              if (wait <= 0) report.current(next);
              else debouncer.maybeExecute(next);
            }}
            size="sm"
            testId={
              testId === undefined ? "toolbar-search" : `${testId}-search`
            }
          />
        ),
      })}
      {children}
    </div>
  );
};
