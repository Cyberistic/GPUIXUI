import { Effect } from "effect";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as SubscriptionRef from "effect/SubscriptionRef";
import {
  type MeasuredBox,
  makeLocalState,
  type LocalState,
} from "@gpuixui/components/authoring";
import {
  directionOf,
  sameBox,
  turned,
  type StarBox,
  type StarDirection,
} from "./logic.js";

export interface StarsStoreState {
  readonly box: Option.Option<StarBox>;

  readonly directions: HashMap.HashMap<string, StarDirection>;
}

export interface StarsStore {
  readonly local: LocalState<StarsStoreState>;

  readonly measure: (box: Option.Option<MeasuredBox>) => Effect.Effect<void>;

  readonly turn: (key: string) => Effect.Effect<void>;
}

export const makeStarsStore: Effect.Effect<StarsStore> = Effect.gen(
  function* () {
    const local = yield* makeLocalState<StarsStoreState>({
      box: Option.none(),
      directions: HashMap.empty(),
    });

    const measure = Effect.fnUntraced(function* (
      box: Option.Option<MeasuredBox>,
    ) {
      const current = yield* SubscriptionRef.get(local.state);
      const next = Option.map(box, (measured) => ({
        width: measured.width,
        height: measured.height,
      }));
      if (sameBox(current.box, next)) return;
      yield* local.write({ ...current, box: next });
    });

    const turn = Effect.fnUntraced(function* (key: string) {
      const current = yield* SubscriptionRef.get(local.state);
      yield* local.write({
        ...current,
        directions: HashMap.set(
          current.directions,
          key,
          turned(directionOf(current.directions, key)),
        ),
      });
    });

    return {
      local,
      measure,
      turn,
    };
  },
);
