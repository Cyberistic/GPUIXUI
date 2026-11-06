import { useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import { Body, Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";

const COLUMNS = 18;
const COLUMN_WIDTH = 80;

const HorizontalProbe = () => {
  const theme = useTheme();
  const [delta, setDelta] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        testId="h-scroll-view"
        style={{ width: 320, height: 72, overflowX: "scroll" }}
        onScroll={(event) =>
          setDelta((current) => current + (event.deltaX ?? 0))
        }
      >
        <div style={{ display: "flex", flexDirection: "row" }}>
          {Array.from({ length: COLUMNS }, (_, index) => (
            <div
              key={index}
              testId={`h-column-${index}`}
              style={{
                width: COLUMN_WIDTH,
                height: 56,
                padding: 8,
                backgroundColor: theme.colors.muted,
              }}
            >
              <Body>{`col ${index}`}</Body>
            </div>
          ))}
        </div>
      </div>
      <Readout testId="h-readout">{`deltaX=${delta}`}</Readout>
    </div>
  );
};

export const scrollHorizontalScenario: ScenarioBody = {
  view: () => <HorizontalProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      const start = yield* ctx.expectSome(
        "the strip reports a scroll offset",
        Option.fromNullishOr(ctx.host.scrollOffset("h-scroll-view")),
      );
      yield* ctx.expectEqual("the strip starts at the left", start.x, 0);

      ctx.host.wheel("h-scroll-view", -160, 0);
      const moved = yield* ctx.expectSome(
        "the strip reports an offset after the wheel",
        Option.fromNullishOr(ctx.host.scrollOffset("h-scroll-view")),
      );
      yield* ctx.expectEqual("deltaX moves the strip right", moved.x < 0, true);
      yield* ctx.expectEqual(
        "the horizontal wheel does not move the vertical axis",
        moved.y,
        0,
      );

      const readout = yield* ctx.expectSome(
        "the strip readout is painted",
        Option.fromNullishOr(ctx.host.text("h-readout")),
      );
      yield* ctx.expectEqual(
        "onScroll reports the horizontal delta",
        readout !== "deltaX=0",
        true,
      );

      ctx.host.wheel("h-scroll-view", -4000, 0);
      const clamped = yield* ctx.expectSome(
        "the clamped strip reports an offset",
        Option.fromNullishOr(ctx.host.scrollOffset("h-scroll-view")),
      );
      yield* ctx.expectEqual(
        "the offset clamps at the content's right edge",
        clamped.x,
        -(COLUMNS * COLUMN_WIDTH - 320),
      );
    }),
};
