import { Effect } from "effect";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as SubscriptionRef from "effect/SubscriptionRef";
import {
  type MeasuredBox,
  type MeasuredPoint,
  makeLocalState,
  type LocalState,
} from "@gpuixui/components/authoring";
import { liquidEdge, type LiquidEdge } from "./logic.js";

export interface Flood {
  readonly entry: LiquidEdge;
  readonly drain: LiquidEdge;
  readonly filled: boolean;
  readonly run: number;
}

export interface LiquidState {
  readonly box: Option.Option<MeasuredBox>;
  readonly flood: Option.Option<Flood>;
}

export interface LiquidStore {
  readonly local: LocalState<LiquidState>;

  readonly measure: (box: Option.Option<MeasuredBox>) => Effect.Effect<void>;

  readonly move: (
    point: Option.Option<MeasuredPoint>,
    inert: boolean,
  ) => Effect.Effect<void>;

  readonly leave: (
    point: Option.Option<MeasuredPoint>,
    inert: boolean,
    windowMs: number,
  ) => Effect.Effect<void>;

  readonly clear: Effect.Effect<void>;

  readonly retime: (windowMs: number) => Effect.Effect<void>;
}

export const makeLiquidStore: Effect.Effect<LiquidStore> = Effect.gen(
  function* () {
    const local = yield* makeLocalState<LiquidState>({
      box: Option.none(),
      flood: Option.none(),
    });
    const lastX = yield* Ref.make(Option.none<number>());

    const edgeAt = (
      box: Option.Option<MeasuredBox>,
      x: Option.Option<number>,
    ): Option.Option<LiquidEdge> =>
      Option.flatMap(x, (value) =>
        Option.map(box, (surface) => liquidEdge(value, surface)),
      );

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

      if (inert || Option.exists(current.flood, (flood) => flood.filled))
        return;
      const edge = edgeAt(current.box, yield* xOf(point));
      if (Option.isNone(edge)) return;

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

    const retime = Effect.fnUntraced(function* (windowMs: number) {
      const current = yield* SubscriptionRef.get(local.state);
      if (!Option.exists(current.flood, (flood) => !flood.filled)) return;
      yield* local.after(windowMs, dropFlood);
    });

    return { local, measure, move, leave, clear, retime };
  },
);
