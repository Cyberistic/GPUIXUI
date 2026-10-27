/**
 * The flood a liquid action wears.
 *
 * One `SubscriptionRef` holds what the render needs — the measured box and the
 * flood itself — so React paints from the store instead of from a `useState`
 * per layer. The x of the last move lives beside it in a `Ref`: an enter or a
 * leave payload carries no position, so the edge it names is the one the
 * pointer was last on, and no render reads it.
 *
 * A drain is a journey with an end, so the store owns its own timer: a leave
 * schedules the removal, entering again replaces that timer, and the
 * component's teardown cancels it. A flood that is filled is not restarted by a
 * move inside the control, which is what keeps the wash steady under a hover.
 */

import { Effect } from "effect";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as SubscriptionRef from "effect/SubscriptionRef";
import type { MeasuredBox, MeasuredPoint } from "../internal/measure.js";
import { makeLocalState, type LocalState } from "../internal/local-state.js";
import { liquidEdge, type LiquidEdge } from "./logic.js";

/** One flood on screen: the edge it entered from, the edge it drains to, and its phase. */
export interface Flood {
  readonly entry: LiquidEdge;
  readonly drain: LiquidEdge;
  readonly filled: boolean;
  readonly run: number;
}

/** What the control paints. */
export interface LiquidState {
  /** The control's box, `None` until it has been laid out. */
  readonly box: Option.Option<MeasuredBox>;
  readonly flood: Option.Option<Flood>;
}

/** What the control can tell the store. */
export interface LiquidStore {
  readonly local: LocalState<LiquidState>;
  /** Record the box an `onLayout` reported. */
  readonly measure: (box: Option.Option<MeasuredBox>) => Effect.Effect<void>;
  /**
   * Report a move: it seeds the flood from the edge it landed on. `inert` is the
   * reduced-preference and disabled rule — a control that cannot answer the
   * pointer keeps no wash.
   */
  readonly move: (
    point: Option.Option<MeasuredPoint>,
    inert: boolean,
  ) => Effect.Effect<void>;
  /** Report a leave: turn the flood around and remove it after `windowMs`. */
  readonly leave: (
    point: Option.Option<MeasuredPoint>,
    inert: boolean,
    windowMs: number,
  ) => Effect.Effect<void>;
  /** Drop the flood and its drain, e.g. when the control becomes inert. */
  readonly clear: Effect.Effect<void>;
}

/** The store a mounted control floods through. */
export const makeLiquidStore: Effect.Effect<LiquidStore> = Effect.gen(
  function* () {
    const local = yield* makeLocalState<LiquidState>({
      box: Option.none(),
      flood: Option.none(),
    });
    const lastX = yield* Ref.make(Option.none<number>());

    /** The edge an x falls on, for the box the control has now. */
    const edgeAt = (
      box: Option.Option<MeasuredBox>,
      x: Option.Option<number>,
    ): Option.Option<LiquidEdge> =>
      Option.flatMap(x, (value) =>
        Option.map(box, (surface) => liquidEdge(value, surface)),
      );

    /**
     * The x the event names, or the last move's when it carries none: an enter or
     * a leave payload has no position, and the side the pointer was last over is
     * the side it drained through.
     */
    const xOf = (point: Option.Option<MeasuredPoint>) =>
      Option.match(point, {
        onNone: () => Ref.get(lastX),
        onSome: (measured) => Effect.succeed(Option.some(measured.x)),
      });

    const dropFlood = Effect.gen(function* () {
      const current = yield* SubscriptionRef.get(local.state);
      if (Option.isNone(current.flood)) return;
      yield* local.write({ ...current, flood: Option.none() });
    });

    const measure = Effect.fnUntraced(function* (
      box: Option.Option<MeasuredBox>,
    ) {
      const current = yield* SubscriptionRef.get(local.state);
      yield* local.write({ ...current, box });
    });

    const move = Effect.fnUntraced(function* (
      point: Option.Option<MeasuredPoint>,
      inert: boolean,
    ) {
      yield* Option.match(point, {
        onNone: () => Effect.void,
        onSome: (measured) => Ref.set(lastX, Option.some(measured.x)),
      });
      const current = yield* SubscriptionRef.get(local.state);
      // A move inside a filled control keeps the flood; only leaving ends it.
      if (inert || Option.exists(current.flood, (flood) => flood.filled))
        return;
      const edge = edgeAt(current.box, yield* xOf(point));
      if (Option.isNone(edge)) return;
      // A new entry ends the drain it interrupted.
      yield* local.cancel;
      yield* local.write({
        ...current,
        flood: Option.some({
          entry: edge.value,
          drain: edge.value,
          filled: true,
          run: Option.match(current.flood, {
            onNone: () => 0,
            onSome: (previous) => previous.run + 1,
          }),
        }),
      });
    });

    const leave = Effect.fnUntraced(function* (
      point: Option.Option<MeasuredPoint>,
      inert: boolean,
      windowMs: number,
    ) {
      if (inert) return;
      const current = yield* SubscriptionRef.get(local.state);
      const drain = edgeAt(current.box, yield* xOf(point));
      const flood = Option.map(current.flood, (previous) => ({
        ...previous,
        drain: Option.getOrElse(drain, () => previous.entry),
        filled: false,
      }));
      if (Option.isNone(flood)) return;
      yield* local.write({ ...current, flood });
      yield* local.after(windowMs, dropFlood);
    });

    const clear = Effect.gen(function* () {
      yield* local.cancel;
      yield* dropFlood;
    });

    return { local, measure, move, leave, clear };
  },
);
