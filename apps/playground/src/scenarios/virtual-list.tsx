/**
 * `virtual-list-window` — `<virtual-list>` builds only a window of rows.
 *
 * 5 000 rows are declared; only the rows near the viewport may be built. The
 * scenario reads the index range from `onVisibleRange`, then wheels and checks
 * the window actually moved. A list that builds every row fails the first
 * check; a list that never scrolls fails the second.
 */
import { useState } from "react";
import { Effect, pipe } from "effect";
import * as Option from "effect/Option";
import { theme } from "../theme.js";
import { Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const ROWS = 5000;

const VirtualListProbe = () => {
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
              <text style={{ color: theme.text }}>{`row ${index}`}</text>
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

export const virtualListScenario: PlaygroundScenario = {
  id: "virtual-list-window",
  title: "Virtual list builds only a window of rows",
  capability: "virtual-list",
  view: () => <VirtualListProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectSome(
        "virtual list painted",
        Option.fromNullishOr(ctx.host.bounds("vlist")),
      );
      const last = readIndex(Option.fromNullishOr(ctx.host.text("vlist-last")));
      yield* ctx.expectEqual(
        "initial window ends well before row 100",
        last >= 0 && last < 100,
        true,
      );

      ctx.host.wheel("vlist", 0, 400);
      ctx.host.advance(50);
      const first = readIndex(
        Option.fromNullishOr(ctx.host.text("vlist-first")),
      );
      yield* ctx.expectEqual("wheel moved the visible window", first > 0, true);
    }),
};
