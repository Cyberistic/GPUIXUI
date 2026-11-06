import { Duration, Effect } from "effect";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { textStyle, type Theme } from "@gpuixui/tokens";
import { useTheme } from "@gpuixui/tokens/react";
import { useState, type ReactNode } from "react";
import { palettes } from "../palettes.js";
import {
  decodeHoverCounts,
  formatHoverCounts,
  HOVER_AWAY,
  HOVER_CASES,
  HOVER_CAPTION,
  HoverCounts,
  hoverChildId,
  hoverReadoutId,
  hoverRowId,
  pixelRegion,
  type HoverCase,
} from "./hover-routing.js";

const HOVER_PAINT = {
  rest: "card",
  hover: "accent",
  child: "muted",
} as const;

const HOVER_SETTLE = Duration.millis(120);

const HOVER_CHILD_LABEL = "Nested row content";

const HoverRow = ({
  probeCase,
  counts,
  onEnter,
  onChildEnter,
  onLeave,
}: {
  readonly probeCase: HoverCase;
  readonly counts: HoverCounts;
  readonly onEnter: () => void;
  readonly onChildEnter: () => void;
  readonly onLeave: () => void;
}): ReactNode => {
  const theme = useTheme();
  const filled =
    probeCase.id === "text-filled" ||
    probeCase.id === "div-filled" ||
    probeCase.id === "inert-div";
  const child =
    probeCase.id === "text-unfilled" || probeCase.id === "text-filled" ? (
      <text
        testId={hoverChildId(probeCase.id)}
        onMouseEnter={onChildEnter}
        onMouseLeave={() => undefined}
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.foreground,
          padding: 6,
          backgroundColor: filled ? theme.colors[HOVER_PAINT.child] : undefined,
        }}
      >
        {HOVER_CHILD_LABEL}
      </text>
    ) : (
      <div
        testId={hoverChildId(probeCase.id)}
        onMouseEnter={onChildEnter}
        onMouseLeave={() => undefined}
        style={{
          width: 180,
          height: 28,
          backgroundColor: theme.colors[HOVER_PAINT.child],
          pointerEvents: probeCase.id === "inert-div" ? "none" : undefined,
        }}
      />
    );
  return (
    <div
      testId={hoverRowId(probeCase.id)}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        width: 460,
        height: 56,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 16,
        paddingRight: 16,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors[HOVER_PAINT.rest],
        hover: { backgroundColor: theme.colors[HOVER_PAINT.hover] },
      }}
    >
      {child}
      <text
        testId={hoverReadoutId(probeCase.id)}
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        {formatHoverCounts(counts)}
      </text>
    </div>
  );
};

export const HoverRoutingProbe = (): ReactNode => {
  const theme = useTheme();
  const [counts, setCounts] = useState<Record<string, HoverCounts>>({});
  const bump = (id: string, field: "row" | "child" | "leave"): void =>
    setCounts((previous) => {
      const current =
        previous[id] ?? HoverCounts.make({ row: 0, child: 0, leave: 0 });
      return {
        ...previous,
        [id]: HoverCounts.make({
          row: current.row + (field === "row" ? 1 : 0),
          child: current.child + (field === "child" ? 1 : 0),
          leave: current.leave + (field === "leave" ? 1 : 0),
        }),
      };
    });
  return (
    <div
      style={{
        width: 520,
        height: 420,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing.sm,
      }}
    >
      <text
        testId={HOVER_CAPTION}
        style={{
          ...textStyle(theme, "caption"),
          color: theme.colors.mutedForeground,
        }}
      >
        A painted child is the boundary a hover stops at.
      </text>
      {HOVER_CASES.map((probeCase) => (
        <HoverRow
          key={probeCase.id}
          probeCase={probeCase}
          counts={
            counts[probeCase.id] ??
            HoverCounts.make({ row: 0, child: 0, leave: 0 })
          }
          onEnter={() => bump(probeCase.id, "row")}
          onChildEnter={() => bump(probeCase.id, "child")}
          onLeave={() => bump(probeCase.id, "leave")}
        />
      ))}
      <text
        testId={HOVER_AWAY}
        style={{
          ...textStyle(theme, "body"),
          color: theme.colors.mutedForeground,
        }}
      >
        Away from every row
      </text>
    </div>
  );
};

const readCounts = (
  ctx: Smoke.AsyncSmokeContext,
  probeCase: HoverCase,
): Effect.Effect<Option.Option<HoverCounts>, Smoke.SmokeHostError> =>
  Effect.flatMap(ctx.host.text(hoverReadoutId(probeCase.id)), (text) =>
    Effect.succeed(decodeHoverCounts(text)),
  );

const hoverPixels = (
  ctx: Smoke.AsyncSmokeContext,
  probeCase: HoverCase,
  theme: Theme,
): Effect.Effect<
  number,
  Smoke.SmokeAssertionError | Smoke.SmokeHostError,
  never
> =>
  Effect.gen(function* () {
    const name = `hover-${probeCase.id}`;
    yield* ctx.host.capture(name);
    const frame = yield* ctx.host.pixels(name);
    const window = yield* ctx.host.windowSize();
    const box = yield* ctx.expectSome(
      `${probeCase.id} paints a row`,
      Option.fromNullishOr(yield* ctx.host.bounds(hoverRowId(probeCase.id))),
    );
    const crop = yield* ctx.expectSome(
      `${probeCase.id} keeps its row inside the frame`,
      Option.fromNullishOr(
        Pixels.crop(
          frame,
          pixelRegion(box, frame.width / Math.max(window.width, 1)),
        ),
      ),
    );
    return Pixels.countColour(
      crop,
      yield* ctx.expectSome(
        `${probeCase.id} names the hover fill it counts`,
        Option.fromNullishOr(Pixels.hexToRgba(theme.colors[HOVER_PAINT.hover])),
      ),
    );
  });

const hoverCaseSteps = (
  ctx: Smoke.AsyncSmokeContext,
  theme: Theme,
  probeCase: HoverCase,
): Effect.Effect<void, Smoke.SmokeAssertionError | Smoke.SmokeHostError> =>
  Effect.gen(function* () {
    yield* ctx.host.hover(HOVER_AWAY);
    yield* Effect.sleep(HOVER_SETTLE);
    const before = yield* ctx.expectSome(
      `${probeCase.caption} starts from a settled readout`,
      yield* readCounts(ctx, probeCase),
    );

    yield* ctx.host.hover(hoverChildId(probeCase.id));
    yield* Effect.sleep(HOVER_SETTLE);
    const hovered = yield* ctx.expectSome(
      `${probeCase.caption} paints a readout`,
      yield* readCounts(ctx, probeCase),
    );
    yield* ctx.expectEqual(
      `${probeCase.id}: the row ${probeCase.rowEnter ? "hears" : "misses"} the hover`,
      hovered.row - before.row,
      probeCase.rowEnter ? 1 : 0,
    );
    yield* ctx.expectEqual(
      `${probeCase.id}: the child ${probeCase.childEnter ? "hears" : "misses"} it`,
      hovered.child - before.child,
      probeCase.childEnter ? 1 : 0,
    );
    yield* ctx.expectEqual(
      `${probeCase.id}: the row ${probeCase.painted ? "paints" : "does not paint"} its hover fill`,
      (yield* hoverPixels(ctx, probeCase, theme)) > 0,
      probeCase.painted,
    );

    yield* ctx.host.hover(HOVER_AWAY);
    yield* Effect.sleep(HOVER_SETTLE);
    const left = yield* ctx.expectSome(
      `${probeCase.id} paints a readout after the pointer leaves`,
      yield* readCounts(ctx, probeCase),
    );
    yield* ctx.expectEqual(
      `${probeCase.id}: the row hears ${probeCase.rowEnter ? "one enter and one leave" : "no enter, so no leave"}`,
      left.leave - hovered.leave,
      probeCase.rowEnter ? 1 : 0,
    );
    yield* ctx.expectEqual(
      `${probeCase.id}: the row is back on its resting fill`,
      yield* hoverPixels(ctx, probeCase, theme),
      0,
    );
  });

export const hoverRoutingSteps: Smoke.AsyncSmokeScenario["steps"] = (ctx) =>
  Effect.gen(function* () {
    yield* ctx.host.waitFor(hoverChildId("text-unfilled"));
    yield* ctx.host.waitFor(HOVER_AWAY);
    yield* Effect.forEach(
      HOVER_CASES,
      (probeCase) => hoverCaseSteps(ctx, palettes.dark, probeCase),
      { concurrency: 1, discard: true },
    );
  });
