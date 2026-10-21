/**
 * `virtual-list-window` — `<virtual-list>` paints only a window of rows.
 *
 * 5 000 rows are declared. React and the retained tree hold every row, but GPUI
 * builds, lays out and paints only those near the viewport — so the honest
 * check is `getPaintedText()`, not the retained child count (which is 5 000).
 * Measured on this host: 9 rows painted at rest; see plan `140` §4.
 *
 * The wheel's `deltaY` is negative to scroll down (see `scroll.tsx`).
 */
import { useState } from "react";
import { Effect, pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import { Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";

const ROWS = 5000;

const VirtualListProbe = () => {
  const theme = useTheme();
  const [first, setFirst] = useState(0);
  const [last, setLast] = useState(-1);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 320,
        height: 340,
      }}
    >
      <div style={{ display: "flex", height: 280 }}>
        <virtual-list
          testId="vlist"
          style={{ flexGrow: 1, minHeight: 0 }}
          onVisibleRange={(event) => {
            setFirst(event.startIndex ?? -1);
            setLast(event.endIndex ?? -1);
          }}
        >
          {Array.from({ length: ROWS }, (_, index) => (
            <div
              key={index}
              testId={`v-${index}`}
              style={{ height: 32, padding: 6 }}
            >
              <text
                style={{ color: theme.colors.foreground }}
              >{`row ${index}`}</text>
            </div>
          ))}
        </virtual-list>
      </div>
      <Readout testId="vlist-first">{`${first}`}</Readout>
      <Readout testId="vlist-last">{`${last}`}</Readout>
    </div>
  );
};

/** Parses a readout holding one index; a missing or malformed readout is `-1`. */
const readIndex = (text: Option.Option<string>): number =>
  pipe(
    text,
    Option.map((value) => Number.parseInt(value, 10)),
    Option.filter(Number.isInteger),
    Option.getOrElse(() => -1),
  );

export const virtualListScenario: ScenarioBody = {
  view: () => <VirtualListProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const painted = ctx.host.paintedText();
      yield* ctx.expectContains(
        "virtual list painted the first row",
        Arr.join(painted, "\n"),
        "row 0",
      );
      yield* ctx.expectEqual(
        "only a window of rows is painted, not all 5000",
        Arr.some(painted, (line) => line === `row ${ROWS - 1}`),
        false,
      );

      ctx.host.wheel("vlist", 0, -400);
      ctx.host.advance(50);
      // `onVisibleRange` fires on scroll; the readouts start at `first=0
      // last=-1`, so a non-negative `last` proves the event reached React.
      const lastAfter = readIndex(
        Option.fromNullishOr(ctx.host.text("vlist-last")),
      );
      yield* ctx.expectEqual(
        "onVisibleRange fired for the wheel",
        lastAfter >= 0,
        true,
      );
      // The first `onVisibleRange` reports the pre-scroll range, so the window
      // moving is asserted on the painted rows instead: row 0 scrolls away.
      yield* ctx.expectEqual(
        "the painted window moved past the first row",
        Arr.some(ctx.host.paintedText(), (line) => line === "row 0"),
        false,
      );
    }),
};
