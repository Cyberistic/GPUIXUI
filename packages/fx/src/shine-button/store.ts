import { Effect } from "effect";
import * as Option from "effect/Option";
import * as SubscriptionRef from "effect/SubscriptionRef";
import {
  type MeasuredBox,
  makeLocalState,
  type LocalState,
} from "@gpuixui/components/authoring";

export interface SheenState {
  readonly box: Option.Option<MeasuredBox>;

  readonly sweeping: boolean;

  readonly run: number;
}

export interface SheenStore {
  readonly local: LocalState<SheenState>;

  readonly measure: (box: Option.Option<MeasuredBox>) => Effect.Effect<void>;

  readonly enter: (inert: boolean, windowMs: number) => Effect.Effect<void>;

  readonly clear: Effect.Effect<void>;

  readonly retime: (windowMs: number) => Effect.Effect<void>;
}

export const makeSheenStore: Effect.Effect<SheenStore> = Effect.gen(
  function* () {
    const local = yield* makeLocalState<SheenState>({
      box: Option.none(),
      sweeping: false,
      run: 0,
    });

    const end = Effect.gen(function* () {
      const current = yield* SubscriptionRef.get(local.state);
      if (!current.sweeping) return;
      yield* local.write({ ...current, sweeping: false });
    });

    const measure = Effect.fnUntraced(function* (
      box: Option.Option<MeasuredBox>,
    ) {
      const current = yield* SubscriptionRef.get(local.state);
      yield* local.write({ ...current, box });
    });

    const enter = Effect.fnUntraced(function* (
      inert: boolean,
      windowMs: number,
    ) {
      if (inert) return;
      const current = yield* SubscriptionRef.get(local.state);
      yield* local.write({
        ...current,
        sweeping: true,
        run: current.run + 1,
      });
      yield* local.after(windowMs, end);
    });

    const clear = Effect.gen(function* () {
      yield* local.cancel;
      yield* end;
    });

    const retime = Effect.fnUntraced(function* (windowMs: number) {
      const current = yield* SubscriptionRef.get(local.state);
      if (!current.sweeping) return;
      yield* local.after(windowMs, end);
    });

    return { local, measure, enter, clear, retime };
  },
);
