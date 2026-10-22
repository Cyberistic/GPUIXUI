/**
 * The measured frame a table's parts share.
 *
 * `@gpuix/native@0.11.0` sizes an `overflow-y: scroll` box from a definite
 * height: a flex child inside a horizontal scroller grew to its content
 * (measured in this package's behaviour suite, 8 880px for a 320px table), so a
 * `flex-1` body does not scroll. The probe's composition gives the row scroller
 * an explicit height instead, and this context is how the parts learn it
 * without the caller doing arithmetic across themes:
 *
 * - the viewport reports its owned height through `onLayout`;
 * - the header reports its own height the same way;
 * - the body's height is the difference.
 *
 * Until the first layout event arrives the header is assumed to be
 * {@link DEFAULT_HEADER_HEIGHT}, the height the shipped header recipe paints
 * at the default text step (measured by the behaviour suite). One frame of
 * estimate is the cost of not hard-coding a number into the API.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { EventPayload } from "@gpuix/react";
import * as Option from "effect/Option";

/** The header's painted height before the first layout event corrects it. */
export const DEFAULT_HEADER_HEIGHT = 44;

/** What the table's parts read and report. */
export interface TableFrame {
  /** The horizontal scroller's painted height, once measured. */
  readonly viewportHeight: Option.Option<number>;
  /** The header's painted height, once measured. */
  readonly headerHeight: Option.Option<number>;
  readonly reportViewport: (height: number) => void;
  readonly reportHeader: (height: number) => void;
}

const TableFrameContext = createContext<Option.Option<TableFrame>>(
  Option.none(),
);

/** The frame a part sits in, when it is inside a {@link TableFrameProvider}. */
export const useTableFrame = (): Option.Option<TableFrame> =>
  useContext(TableFrameContext);

/**
 * The row scroller's height: the viewport's painted height minus the header's.
 *
 * `@gpuix/native@0.11.0` sizes an `overflow-y: scroll` box from a definite
 * height, so a body cannot take a flex share of the horizontal scroller (a
 * `flex-1` body grew to its content — 8 880px for a 320px table, measured in the
 * package's behaviour suite). The virtual body needs the same number the plain
 * body does.
 */
export const useMeasuredBodyHeight = (): Option.Option<number> => {
  const frame = useTableFrame();
  return Option.flatMap(frame, (value) =>
    Option.map(value.viewportHeight, (viewport) =>
      Math.max(0, viewport - Option.getOrElse(value.headerHeight, () => 0)),
    ),
  );
};

/** How a part reports a height, ignoring an unchanged one. */
const useHeightReport = (
  initial?: number,
): [Option.Option<number>, (height: number) => void] => {
  const [height, setHeight] = useState<Option.Option<number>>(
    Option.fromNullishOr(initial),
  );
  const report = useCallback((next: number) => {
    if (!Number.isFinite(next) || next <= 0) return;
    setHeight((current) =>
      Option.contains(current, next) ? current : Option.some(next),
    );
  }, []);
  return [height, report];
};

/**
 * Hold the frame's two measurements and hand them to every part.
 *
 * Both `onLayout` handlers are composed with a part's own by the part itself, so
 * a caller that measures the same element still receives its event.
 */
export const TableFrameProvider = ({
  children,
  initialHeight,
}: {
  readonly children: ReactNode;
  /** The table's own height, used for the first frame's estimate. */
  readonly initialHeight?: number;
}) => {
  const [headerHeight, reportHeader] = useHeightReport(DEFAULT_HEADER_HEIGHT);
  const [viewportHeight, reportViewport] = useHeightReport(initialHeight);
  const frame = useMemo<TableFrame>(
    () => ({
      headerHeight,
      viewportHeight,
      reportHeader,
      reportViewport,
    }),
    [headerHeight, viewportHeight, reportHeader, reportViewport],
  );
  return (
    <TableFrameContext.Provider value={Option.some(frame)}>
      {children}
    </TableFrameContext.Provider>
  );
};

/** Call a caller's `onLayout` and the frame's report together. */
export const reportBoth = (
  event: EventPayload,
  caller: ((event: EventPayload) => void) | undefined,
  report: (height: number) => void,
): void => {
  caller?.(event);
  report(event.height ?? 0);
};
