/** @jsxImportSource @gpuix/react */
import type { EventPayload, Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";
import { paintableSize } from "../internal/size.js";
import { rowCount, rowHeightOf, rowIndex, overdrawRows } from "./window.js";

export interface VisibleRange {
  readonly first: number;

  readonly last: number;
}

export const visibleRange = (
  event: EventPayload,
): Option.Option<VisibleRange> =>
  Option.flatMap(Option.fromNullishOr(event.startIndex), (first) =>
    Option.map(
      Option.fromNullishOr(event.endIndex),
      (last): VisibleRange => ({ first, last }),
    ),
  );

interface VirtualListShared extends Omit<Props, "children" | "onVisibleRange"> {
  readonly height?: number;

  readonly followTail?: boolean;

  readonly alignment?: "top" | "bottom";

  readonly overdraw?: number;

  readonly onVisibleRange?: (range: VisibleRange) => void;

  readonly className?: string;
  readonly children?: ReactNode;
}

export type VirtualListProps =
  | (VirtualListShared & {
      readonly itemCount?: undefined;
      readonly estimatedItemHeight?: number;
      readonly windowStart?: undefined;
    })
  | (VirtualListShared & {
      readonly itemCount: number;

      readonly estimatedItemHeight: number;
      readonly windowStart?: number;
    });

const listBox = (height?: number): StyleDesc =>
  height === undefined
    ? {}
    : { height, flexGrow: 0, flexShrink: 0, flexBasis: height };

export const VirtualList = (props: VirtualListProps) => {
  const theme = useTheme();
  const {
    height,
    followTail,
    alignment,
    overdraw,
    onVisibleRange,
    className,
    children,
    style,
    ...rest
  } = props;
  const handleRange =
    onVisibleRange === undefined
      ? undefined
      : (event: EventPayload) =>
          Option.match(visibleRange(event), {
            onNone: () => {},
            onSome: onVisibleRange,
          });
  const shared = {
    ...rest,
    followTail,
    alignment,
    overdraw: overdraw === undefined ? undefined : overdrawRows(overdraw),
    onVisibleRange: handleRange,
    style: mergeStyles(
      recipeStyle(cn(className ?? ""), theme),
      mergeStyles(listBox(Option.getOrUndefined(paintableSize(height))), style),
    ),
  };
  const windowed =
    props.itemCount === undefined
      ? undefined
      : {
          itemCount: rowCount(props.itemCount),

          estimatedItemHeight: rowHeightOf(props.estimatedItemHeight),
          windowStart:
            props.windowStart === undefined
              ? undefined
              : rowIndex(props.windowStart),
        };
  return windowed === undefined ? (
    <virtual-list {...shared}>{children}</virtual-list>
  ) : (
    <virtual-list
      {...shared}
      itemCount={windowed.itemCount}
      estimatedItemHeight={windowed.estimatedItemHeight}
      windowStart={windowed.windowStart}
    >
      {children}
    </virtual-list>
  );
};
