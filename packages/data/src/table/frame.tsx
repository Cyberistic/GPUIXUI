/** @jsxImportSource @gpuix/react */
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

export const DEFAULT_HEADER_HEIGHT = 44;

export interface TableFrame {
  readonly viewportHeight: Option.Option<number>;

  readonly headerHeight: Option.Option<number>;
  readonly reportViewport: (height: number) => void;
  readonly reportHeader: (height: number) => void;
}

const TableFrameContext = createContext<Option.Option<TableFrame>>(
  Option.none(),
);

export const useTableFrame = (): Option.Option<TableFrame> =>
  useContext(TableFrameContext);

export const useMeasuredBodyHeight = (): Option.Option<number> => {
  const frame = useTableFrame();
  return Option.flatMap(frame, (value) =>
    Option.map(value.viewportHeight, (viewport) =>
      Math.max(0, viewport - Option.getOrElse(value.headerHeight, () => 0)),
    ),
  );
};

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

export const TableFrameProvider = ({
  children,
  initialHeight,
}: {
  readonly children: ReactNode;

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

export const reportBoth = (
  event: EventPayload,
  caller: ((event: EventPayload) => void) | undefined,
  report: (height: number) => void,
): void => {
  caller?.(event);
  report(event.height ?? 0);
};
