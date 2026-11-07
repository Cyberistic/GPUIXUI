import { Effect } from "effect";
import * as Option from "effect/Option";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { makeLocalState, type LocalState } from "../local-state.js";
import type { PatternBox } from "../svg-pattern.js";

export interface FieldStoreState {
  readonly box: Option.Option<PatternBox>;

  readonly lit: boolean;
}

export interface FieldStore {
  readonly local: LocalState<FieldStoreState>;

  readonly note: (box: PatternBox) => Effect.Effect<void>;

  readonly breathe: Effect.Effect<void>;
}

const resting: FieldStoreState = { box: Option.none(), lit: false };

export const makeFieldStore: Effect.Effect<FieldStore> = Effect.gen(
  function* () {
    const local = yield* makeLocalState<FieldStoreState>(resting);

    const note = Effect.fnUntraced(function* (box: PatternBox) {
      const current = yield* SubscriptionRef.get(local.state);
      if (
        Option.exists(
          current.box,
          (held) => held.width === box.width && held.height === box.height,
        )
      )
        return;
      yield* local.write({ ...current, box: Option.some(box) });
    });

    const breathe = Effect.gen(function* () {
      const current = yield* SubscriptionRef.get(local.state);
      yield* local.write({ ...current, lit: !current.lit });
    });

    return { local, note, breathe };
  },
);
