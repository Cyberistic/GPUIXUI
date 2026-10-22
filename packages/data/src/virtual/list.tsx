/**
 * The virtualized list, over the runtime's own `<virtual-list>`.
 *
 * `@gpuix/native@0.11.0` publishes the list as a host element, and the two
 * modes differ in what is retained (`virtual-list-windowed`,
 * `virtual-list-lifecycle`, `virtual-list-rows`):
 *
 * - **children mode** keeps every React child and skips only the build, layout
 *   and paint of the rows near the viewport — 9 of 5 000 rows painted in the
 *   probe;
 * - **`itemCount` mode** retains only the slice the app renders, and positions
 *   it by index from `estimatedItemHeight` and `windowStart`.
 *
 * This component is the typed seam over both: the narrow mode is a discriminated
 * union, so a windowed caller cannot forget the estimate, and the range the
 * runtime reports is mapped to {@link VisibleRange} instead of an untyped event.
 * It owns no window arithmetic: `windowStart` is app state in the windowed mode,
 * because the runtime cannot infer a window it was not given (the probe measured
 * `onVisibleRange` lagging the paint by one gesture, so the app's window must be
 * wider than the viewport plus overdraw).
 *
 * A list sizes its viewport from a definite height. When `height` is omitted the
 * caller's layout owns it (`flexGrow` inside a bounded parent, as the probes
 * mount it); a list with no bound paints no rows.
 *
 * The list paints no chrome of its own. Rows are ordinary children — a `div`
 * with a measured height, a `TableRow`, a tree row — so the component adds no
 * second row abstraction.
 *
 * ```tsx
 * <VirtualList height={320} aria-label="Rows" onVisibleRange={setRange}>
 *   {rows.map((row) => (
 *     <div key={row.id} style={{ height: 32 }}>
 *       <text>{row.label}</text>
 *     </div>
 *   ))}
 * </VirtualList>
 * ```
 */

import type { EventPayload, Props, StyleDesc } from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { recipeStyle } from "../recipe.js";
import { useTheme } from "../theme.js";

/** The window the runtime built, in absolute logical-row indices. */
export interface VisibleRange {
  /** The first row the runtime built. */
  readonly first: number;
  /** The last row the runtime built. */
  readonly last: number;
}

/**
 * The range a `<virtual-list>` reported, when the event carried one.
 *
 * The host event omits the pair when it has no range to report, and a consumer
 * must not read a fabricated `0..0` as "the first row is visible".
 */
export const visibleRange = (
  event: EventPayload,
): Option.Option<VisibleRange> =>
  Option.flatMap(Option.fromNullishOr(event.startIndex), (first) =>
    Option.map(
      Option.fromNullishOr(event.endIndex),
      (last): VisibleRange => ({ first, last }),
    ),
  );

/** The rules both list modes share. */
interface VirtualListShared extends Omit<Props, "children" | "onVisibleRange"> {
  /** A definite viewport height, in pixels. */
  readonly height?: number;
  /** Keep the list at its trailing edge as rows arrive. */
  readonly followTail?: boolean;
  /** Where the content sits when it does not fill the viewport. */
  readonly alignment?: "top" | "bottom";
  /** Rows built beyond the viewport, when the runtime can use them. */
  readonly overdraw?: number;
  /**
   * Receives the built window. In the windowed mode this is the signal the app
   * advances `windowStart` on — read the painted rows as well, because the
   * event lags the paint by one gesture.
   */
  readonly onVisibleRange?: (range: VisibleRange) => void;
  /** A Tailwind class string, joined after the list's own (empty) recipe. */
  readonly className?: string;
  readonly children?: ReactNode;
}

/**
 * {@link VirtualList} props.
 *
 * The children form is the mode with every row retained; the `itemCount` form
 * retains only the slice the app renders and needs all three window fields.
 */
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

/** The list's viewport: a definite height when one is named. */
const listBox = (height?: number): StyleDesc =>
  height === undefined
    ? {}
    : { height, flexGrow: 0, flexShrink: 0, flexBasis: height };

/** A list that builds only the rows near its viewport. */
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
    overdraw,
    onVisibleRange: handleRange,
    style: mergeStyles(
      recipeStyle(cn(className ?? ""), theme),
      mergeStyles(listBox(height), style),
    ),
  };
  const windowed =
    props.itemCount === undefined
      ? undefined
      : {
          itemCount: props.itemCount,
          estimatedItemHeight: props.estimatedItemHeight,
          windowStart: props.windowStart,
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
