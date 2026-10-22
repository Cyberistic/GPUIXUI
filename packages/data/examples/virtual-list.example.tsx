/**
 * A virtualized list of 2 000 rows: a window paints, the range is reported, and
 * a far row is revealed without mounting the rows above it.
 *
 * The list's children are all declared, and the runtime builds, lays out and
 * paints only the window near the viewport (`getPaintedText`, not the retained
 * child count, is what a probe can read). The readout is the range the runtime
 * last reported — the event lags the paint by one gesture, so the screen prints
 * it rather than treating it as the truth about what is visible.
 *
 * The reveal is the measured route for a far row: `renderer.scrollToItem` on the
 * list's own instance. It is why the ref matters.
 */

import { useGpuix, type PublicInstance } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useCallback, useRef, useState } from "react";
import { Button } from "@gpuixui/primitives/button";
import { VirtualList, type VisibleRange } from "../src/virtual/list.js";
import { textStyle, useTheme } from "../src/theme.js";

/** The logical row count. The screen paints a window of it. */
export const VIRTUAL_ROWS = 2_000;

/** The row the reveal action jumps to, and the row height every row declares. */
export const REVEAL_ROW = 1_200;
export const VIRTUAL_ROW_HEIGHT = 32;

const rowIds: ReadonlyArray<number> = Arr.range(0, VIRTUAL_ROWS - 1);

/** A list whose window the runtime owns. */
export const VirtualListExample = () => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const list = useRef<PublicInstance | null>(null);
  const [range, setRange] = useState<Option.Option<VisibleRange>>(
    Option.none(),
  );

  const attach = useCallback((instance: PublicInstance | null) => {
    list.current = instance;
  }, []);

  const reveal = () => {
    const instance = list.current;
    if (instance !== null) renderer?.scrollToItem?.(instance.id, REVEAL_ROW);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
        width: 360,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        <Button
          variant="outline"
          size="sm"
          onActivate={reveal}
          testId="virtual-reveal"
        >
          Reveal row {REVEAL_ROW}
        </Button>
        <text
          testId="virtual-range"
          style={{
            ...textStyle(theme, "caption"),
            color: theme.colors.mutedForeground,
          }}
        >
          {Option.match(range, {
            onNone: () => "first=- last=-",
            onSome: (window) => `first=${window.first} last=${window.last}`,
          })}
        </text>
      </div>
      <VirtualList
        ref={attach}
        height={320}
        aria-label="Two thousand rows"
        testId="virtual-list"
        onVisibleRange={(next) => setRange(Option.some(next))}
      >
        {Arr.map(rowIds, (row) => (
          <div
            key={row}
            testId={`virtual-row-${row}`}
            style={{
              height: VIRTUAL_ROW_HEIGHT,
              paddingLeft: theme.spacing.sm,
              paddingRight: theme.spacing.sm,
              display: "flex",
              alignItems: "center",
              backgroundColor:
                row % 2 === 0 ? theme.colors.card : theme.colors.background,
              borderBottomWidth: theme.borderWidth.thin,
              borderColor: theme.colors.border,
            }}
          >
            <text
              style={{
                ...textStyle(theme, "caption"),
                color: theme.colors.foreground,
              }}
            >
              {`Row ${row}`}
            </text>
          </div>
        ))}
      </VirtualList>
    </div>
  );
};
