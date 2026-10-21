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
 * so a real "follow" toggle is app state plus a scroll.
 *
 * Two-direction proof: dropping both props makes the tail assertions fail.
 */
import { useState } from "react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useTheme } from "@gpuixui/tokens/react";
import type { Smoke } from "@gpuixui/testing";
import { Pressable, Readout } from "../ui.js";
import type { ScenarioBody } from "../types.js";

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
      <div style={{ display: "flex", height: 280 }}>
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

export const logViewerScenario: ScenarioBody = {
  view: () => <LogViewerProbe />,
  steps: (ctx) =>
    Effect.gen(function* () {
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
    }),
};
