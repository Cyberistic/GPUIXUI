/**
 * `log-viewer` — `<virtual-list alignment="bottom" followTail>`.
 *
 * A log viewer asks two things of the runtime that a plain list does not:
 * does it start at the **tail**, and does it **stay** there when lines are
 * appended? The runtime types advertise `alignment="bottom"` and `followTail`;
 * this probe measures the composition with 20px lines in a 280px list, so only
 * ~14 of the declared lines fit.
 *
 * The two props overlap: `alignment="bottom"` alone and `alignment="top"` with
 * `followTail` alone both anchor at the tail (measured, plan `154` §8). The
 * probe pins the composition a log viewer uses; it does not claim which prop
 * causes the anchoring. Scrolling up and then appending does **not** snap back,
 * so a real "follow" toggle is app state plus a scroll — the probe drives that
 * path too, because it is the contract the two props cannot express.
 *
 * Two-direction proof: dropping both props makes the tail assertions fail, and
 * removing the wheel leaves the no-snap-back check asserting an anchor that
 * never moved.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import type { PlaygroundScenario } from "../types.js";

const INITIAL = 30;
const APPEND = 20;

const LogViewerProbe = () => {
  const theme = useTheme();
  const [lines, setLines] = useState<ReadonlyArray<number>>(
    Arr.range(0, INITIAL - 1),
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 320,
        height: 360,
      }}
    >
      <Pressable
        testId="log-append"
        onClick={() =>
          setLines((current) =>
            Arr.appendAll(
              current,
              Arr.range(current.length, current.length + APPEND - 1),
            ),
          )
        }
      >
        <text style={{ color: theme.colors.foreground }}>append 20 lines</text>
      </Pressable>
      <Readout testId="log-count">{`${lines.length}`}</Readout>
      <div testId="log-viewport" style={{ display: "flex", height: 280 }}>
        <virtual-list
          testId="log-list"
          alignment="bottom"
          followTail
          style={{ flexGrow: 1, minHeight: 0 }}
        >
          {Arr.map(lines, (line) => (
            <div
              key={line}
              testId={`log-line-${line}`}
              style={{ height: 20, padding: 2 }}
            >
              <text
                style={{ color: theme.colors.foreground }}
              >{`line ${line}`}</text>
            </div>
          ))}
        </virtual-list>
      </div>
    </div>
  );
};

const paintedExactly = (ctx: Smoke.SmokeContext, label: string): boolean =>
  Arr.some(ctx.host.paintedText(), (line) => line === label);

const readout = (ctx: Smoke.SmokeContext, id: string): string =>
  Option.getOrElse(Option.fromNullishOr(ctx.host.text(id)), () => "");

/** `index,offset` from the list anchor, or `none` when the host reports none. */
const anchor = (ctx: Smoke.SmokeContext): string =>
  Option.getOrElse(
    Option.map(
      Option.fromNullishOr(ctx.host.listScrollTop("log-list")),
      ([index, offset]) => `${index},${offset}`,
    ),
    () => "none",
  );

export const logViewerScenario: PlaygroundScenario = {
  id: "log-viewer",
  title: "Log viewer: starts at the tail and follows appends",
  capability: "log",
  view: () => <LogViewerProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
      yield* ctx.expectEqual(
        "the list opens at the tail anchor",
        anchor(ctx),
        "30,0",
      );
      yield* ctx.expectEqual(
        "the list starts at the tail",
        paintedExactly(ctx, `line ${INITIAL - 1}`),
        true,
      );
      yield* ctx.expectEqual(
        "the head is outside the window",
        paintedExactly(ctx, "line 0"),
        false,
      );

      ctx.host.click("log-append");
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the append reached React",
        readout(ctx, "log-count"),
        `${INITIAL + APPEND}`,
      );
      yield* ctx.expectEqual(
        "the new tail is painted",
        paintedExactly(ctx, `line ${INITIAL + APPEND - 1}`),
        true,
      );
      yield* ctx.expectEqual(
        "the old tail scrolled out of the window",
        paintedExactly(ctx, `line ${INITIAL - 1}`),
        false,
      );

      ctx.host.click("log-append");
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the second append reached React",
        readout(ctx, "log-count"),
        `${INITIAL + 2 * APPEND}`,
      );
      yield* ctx.expectEqual(
        "the newest tail is painted",
        paintedExactly(ctx, `line ${INITIAL + 2 * APPEND - 1}`),
        true,
      );
      yield* ctx.expectEqual(
        "the first appended tail scrolled out too",
        paintedExactly(ctx, `line ${INITIAL + APPEND - 1}`),
        false,
      );
      yield* ctx.expectEqual(
        "two pinned appends report the tail anchor",
        anchor(ctx),
        "70,0",
      );

      ctx.host.wheel("log-list", 0, 100);
      ctx.host.advance(50);
      const scrolled = anchor(ctx);
      yield* ctx.expectEqual(
        "a wheel moves the reader away from the tail",
        scrolled,
        "51,0",
      );
      yield* ctx.expectEqual(
        "the tail leaves the window",
        paintedExactly(ctx, `line ${INITIAL + 2 * APPEND - 1}`),
        false,
      );
      yield* ctx.expectEqual(
        "an earlier line is inside the scrolled window",
        paintedExactly(ctx, "line 60"),
        true,
      );

      ctx.host.click("log-append");
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the append while scrolled up reached React",
        readout(ctx, "log-count"),
        `${INITIAL + 3 * APPEND}`,
      );
      yield* ctx.expectEqual(
        "an append while scrolled up does not snap back",
        anchor(ctx),
        scrolled,
      );
      yield* ctx.expectEqual(
        "the appended tail stays out of the reader's window",
        paintedExactly(ctx, `line ${INITIAL + 3 * APPEND - 1}`),
        false,
      );

      ctx.host.scrollToItem("log-list", INITIAL + 3 * APPEND);
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the at-end sentinel returns to the tail",
        anchor(ctx),
        "90,0",
      );
      yield* ctx.expectEqual(
        "the newest tail is painted again",
        paintedExactly(ctx, `line ${INITIAL + 3 * APPEND - 1}`),
        true,
      );

      ctx.host.click("log-append");
      ctx.host.advance(50);
      yield* ctx.expectEqual(
        "the append at the tail reached React",
        readout(ctx, "log-count"),
        `${INITIAL + 4 * APPEND}`,
      );
      yield* ctx.expectEqual(
        "an append at the tail follows again",
        anchor(ctx),
        "110,0",
      );
      yield* ctx.expectEqual(
        "the following tail is painted",
        paintedExactly(ctx, `line ${INITIAL + 4 * APPEND - 1}`),
        true,
      );
      yield* ctx.expectEqual(
        "the previous tail leaves the window",
        paintedExactly(ctx, `line ${INITIAL + 3 * APPEND - 1}`),
        false,
      );
    }),
};
