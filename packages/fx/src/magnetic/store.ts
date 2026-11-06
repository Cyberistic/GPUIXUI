import { Effect } from "effect";
import * as Option from "effect/Option";
import * as SubscriptionRef from "effect/SubscriptionRef";
import {
  type MeasuredPoint,
  makeLocalState,
  type LocalState,
} from "@gpuixui/components/authoring";
import { samePoint } from "./logic.js";

export type MagneticFollower = Option.Option<MeasuredPoint>;

export interface MagneticStore {
  readonly local: LocalState<MagneticFollower>;

  readonly follow: (point: Option.Option<MeasuredPoint>) => Effect.Effect<void>;

  readonly release: Effect.Effect<void>;
}

export const makeMagneticStore: Effect.Effect<MagneticStore> = Effect.gen(
  function* () {
    const local = yield* makeLocalState<MagneticFollower>(Option.none());

    const follow = Effect.fnUntraced(function* (
      point: Option.Option<MeasuredPoint>,
    ) {
      if (Option.isNone(point)) return;
      const held = yield* SubscriptionRef.get(local.state);
      if (Option.exists(held, (current) => samePoint(current, point.value)))
        return;
      yield* local.write(point);
    });

    return {
      local,
      follow,
      release: local.write(Option.none()),
    };
  },
);
