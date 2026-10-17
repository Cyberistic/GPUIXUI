/**
 * `scroll-container` — wheel scrolling and programmatic scroll.
 *
 * `overflow: "scroll"` makes a container natively scrollable. The scenario
 * checks three things a component library depends on: the wheel actually moves
 * the offset, `onScroll` fires so an app can react, and a ref's
 * `scrollIntoView()` moves content without a gesture.
 *
 * The wheel's `deltaY` is **negative to scroll down** (GPUI's convention, the
 * opposite of the DOM `WheelEvent`): a positive delta asks to scroll past the
 * top and clamps at `0`. Measured on this host — see plan `140` §4.
 */
import { useRef, useState } from "react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import type { PublicInstance } from "@gpuix/react";
import { theme } from "../theme.js";
import { Body, Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const ROWS = 24;

const ScrollProbe = () => {
  const [delta, setDelta] = useState(0);
  const bottom = useRef<PublicInstance | null>(null);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8, width: 360 }}
    >
      <Pressable
        testId="scroll-jump"
        onClick={() => bottom.current?.scrollIntoView?.()}
      >
        <Body>jump to end</Body>
      </Pressable>
      <div
        testId="scroll-view"
        style={{ width: 320, height: 200, overflow: "scroll" }}
        onScroll={(event) =>
          setDelta((current) => current + (event.deltaY ?? 0))
        }
      >
        {Array.from({ length: ROWS }, (_, index) => (
          <div
            key={index}
            testId={`scroll-row-${index}`}
            ref={index === ROWS - 1 ? bottom : undefined}
            style={{ height: 40, padding: 8 }}
          >
            <text style={{ color: theme.text }}>{`row ${index}`}</text>
          </div>
        ))}
      </div>
      <Readout testId="scroll-readout">{`delta=${delta}`}</Readout>
    </div>
  );
};

export const scrollScenario: PlaygroundScenario = {
  id: "scroll-container",
  title: "Scroll: wheel offset, onScroll and scrollIntoView",
  capability: "scroll",
  view: () => <ScrollProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      ctx.host.wheel("scroll-view", 0, -200);
      const offset = yield* ctx.expectSome(
        "scroll offset readable",
        Option.fromNullishOr(ctx.host.scrollOffset("scroll-view")),
      );
      yield* ctx.expectEqual("wheel moved the offset", offset.y < 0, true);

      const readout = yield* ctx.expectSome(
        "scroll readout present",
        Option.fromNullishOr(ctx.host.text("scroll-readout")),
      );
      yield* ctx.expectEqual(
        "onScroll fired for the wheel",
        readout !== "delta=0",
        true,
      );

      ctx.host.click("scroll-jump");
      ctx.host.advance(50);
      const afterJump = yield* ctx.expectSome(
        "scroll offset after jump",
        Option.fromNullishOr(ctx.host.scrollOffset("scroll-view")),
      );
      yield* ctx.expectEqual(
        "scrollIntoView moved further than the wheel",
        afterJump.y < offset.y,
        true,
      );
    }),
};
