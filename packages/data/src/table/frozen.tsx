/** @jsxImportSource @gpuix/react */
import {
  useGpuix,
  type EventPayload,
  type Props,
  type PublicInstance,
} from "@gpuix/react";
import { mergeStyles } from "@gpuix/react/floating";
import * as Option from "effect/Option";
import { Fragment, useRef, useState, type ReactNode } from "react";
import { rowsOf } from "../internal/list.js";
import { paneFill, usePaintedHeight } from "../internal/painted.js";
import { paintableSize } from "../internal/size.js";
import { DEFAULT_HEADER_HEIGHT } from "./frame.js";
import {
  TableBody,
  TableEmpty,
  TableHeader,
  TableViewport,
  emptyMessage,
} from "./table.js";

export interface FrozenTableProps<Row> extends Omit<Props, "children"> {
  readonly height: number;

  readonly frozenWidth: number;

  readonly contentWidth: number;

  readonly rows: ReadonlyArray<Row>;

  readonly rowKey: (row: Row) => string;

  readonly frozenHeader: ReactNode;

  readonly frozenRow: (row: Row) => ReactNode;

  readonly header: ReactNode;

  readonly row: (row: Row) => ReactNode;

  readonly empty?: ReactNode;

  readonly frozenTestId?: string;

  readonly bodyTestId?: string;

  readonly viewportTestId?: string;
}

export const FrozenTable = <Row,>({
  height,
  frozenWidth,
  contentWidth,
  rows,
  rowKey,
  frozenHeader,
  frozenRow,
  header,
  row,
  empty,
  frozenTestId,
  bodyTestId,
  viewportTestId,
  onLayout,
  style,
  ...rest
}: FrozenTableProps<Row>) => {
  const renderer = useGpuix().renderer;
  const frozen = useRef<PublicInstance | null>(null);
  const body = useRef<PublicInstance | null>(null);
  const syncing = useRef(false);
  const bodyX = useRef(0);

  const bound = paintableSize(height);
  const painted = usePaintedHeight(onLayout);
  const box = Option.orElse(bound, () => painted.measured);
  const boxHeight = Option.getOrUndefined(box);

  const frozenTrack = Option.getOrUndefined(paintableSize(frozenWidth));
  const contentTrack = Option.getOrUndefined(paintableSize(contentWidth));

  const records = rowsOf(rows, rowKey);
  const [frozenHeaderHeight, setFrozenHeaderHeight] = useState(0);
  const [dataHeaderHeight, setDataHeaderHeight] = useState(0);

  const measuredHeader = Math.max(frozenHeaderHeight, dataHeaderHeight);
  const headerHeight =
    measuredHeader === 0 ? DEFAULT_HEADER_HEIGHT : measuredHeader;
  const bodyHeight = Option.getOrUndefined(
    Option.map(box, (size) => Math.max(0, size - headerHeight)),
  );

  const mirror = (from: "frozen" | "body") => (event: EventPayload) => {
    const y = event.scrollY;
    if (from === "body" && event.scrollX !== undefined) {
      bodyX.current = event.scrollX;
    }
    if (y === undefined || syncing.current) return;
    const target = from === "body" ? frozen : body;
    const id = target.current?.id;
    if (id === undefined) return;
    syncing.current = true;
    renderer?.scrollTo?.(id, from === "body" ? 0 : bodyX.current, y);
    syncing.current = false;
  };

  return (
    <div
      {...rest}
      onLayout={painted.onLayout}
      role="table"
      style={mergeStyles(
        {
          ...paneFill(bound),
          display: "flex",
          flexDirection: "row",
          minHeight: 0,
          overflow: "hidden",
          ...(boxHeight === undefined ? {} : { height: boxHeight }),
        },
        style,
      )}
    >
      <div
        style={{
          flexGrow: 0,
          flexShrink: 0,
          ...(frozenTrack === undefined
            ? {}
            : { width: frozenTrack, flexBasis: frozenTrack }),
          display: "flex",
          flexDirection: "column",
          height: boxHeight,
          minHeight: 0,
        }}
      >
        <TableHeader
          style={{ minHeight: headerHeight }}
          onLayout={(event) => setFrozenHeaderHeight(event.height ?? 0)}
        >
          {frozenHeader}
        </TableHeader>
        <TableBody
          height={bodyHeight}
          testId={frozenTestId}
          ref={frozen}
          onScrollChange={mirror("frozen")}
        >
          {records.map((record) => (
            <Fragment key={rowKey(record)}>{frozenRow(record)}</Fragment>
          ))}
        </TableBody>
      </div>
      <div
        style={{
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
          minWidth: 0,
          height: boxHeight,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TableViewport
          testId={viewportTestId}
          style={{ flexGrow: 1, minHeight: 0 }}
        >
          <div
            style={{
              flexGrow: 0,
              flexShrink: 0,
              ...(contentTrack === undefined
                ? {}
                : { width: contentTrack, flexBasis: contentTrack }),
              display: "flex",
              flexDirection: "column",
              height: boxHeight,
              minHeight: 0,
            }}
          >
            <TableHeader
              style={{ minHeight: headerHeight }}
              onLayout={(event) => setDataHeaderHeight(event.height ?? 0)}
            >
              {header}
            </TableHeader>
            <TableBody
              height={bodyHeight}
              testId={bodyTestId}
              ref={body}
              onScrollChange={mirror("body")}
            >
              {records.length === 0 ? (
                <TableEmpty>{emptyMessage(empty)}</TableEmpty>
              ) : (
                records.map((record) => (
                  <Fragment key={rowKey(record)}>{row(record)}</Fragment>
                ))
              )}
            </TableBody>
          </div>
        </TableViewport>
      </div>
    </div>
  );
};
