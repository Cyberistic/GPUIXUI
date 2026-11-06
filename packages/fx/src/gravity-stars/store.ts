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
  gravityAdvanced,
  gravityLifeOf,
  gravitySameBox,
  type GravityBox,
  type GravityLife,
} from "./logic.js";

export interface GravityStoreState {
  readonly box: Option.Option<GravityBox>;

  readonly lives: HashMap.HashMap<string, GravityLife>;
}

export interface GravityStore {
  readonly local: LocalState<GravityStoreState>;

  readonly measure: (box: Option.Option<MeasuredBox>) => Effect.Effect<void>;

  readonly advance: (key: string) => Effect.Effect<void>;
}

export const makeGravityStore: Effect.Effect<GravityStore> = Effect.gen(
  function* () {
    const local = yield* makeLocalState<GravityStoreState>({
      box: Option.none(),
      lives: HashMap.empty(),
    });

    const measure = Effect.fnUntraced(function* (
      box: Option.Option<MeasuredBox>,
    ) {
      const current = yield* SubscriptionRef.get(local.state);
      const next = Option.map(box, (measured) => ({
        width: measured.width,
        height: measured.height,
      }));
      if (gravitySameBox(current.box, next)) return;
      yield* local.write({ ...current, box: next });
    });

    const advance = Effect.fnUntraced(function* (key: string) {
      const current = yield* SubscriptionRef.get(local.state);
      yield* local.write({
        ...current,
        lives: HashMap.set(
          current.lives,
          key,
          gravityAdvanced(gravityLifeOf(current.lives, key)),
        ),
      });
    });

    return { local, measure, advance };
  },
);
