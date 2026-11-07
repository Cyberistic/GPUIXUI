import { Effect } from "effect";
import * as Option from "effect/Option";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { makeLocalState, type LocalState } from "../internal/local-state.js";
import { samePointer, type ZoomPointer } from "./logic.js";

export interface ZoomStore {
  readonly local: LocalState<Option.Option<ZoomPointer>>;

  readonly follow: (point: ZoomPointer) => Effect.Effect<void>;

  readonly leave: Effect.Effect<void>;
}

export const makeZoomStore: Effect.Effect<ZoomStore> = Effect.gen(function* () {
  const local = yield* makeLocalState<Option.Option<ZoomPointer>>(
    Option.none(),
  );

  const follow = Effect.fnUntraced(function* (point: ZoomPointer) {
    const held = yield* SubscriptionRef.get(local.state);
    if (Option.exists(held, (previous) => samePointer(previous, point))) return;
    yield* local.write(Option.some(point));
  });

  const leave = Effect.gen(function* () {
    const held = yield* SubscriptionRef.get(local.state);
    if (Option.isNone(held)) return;
    yield* local.write(Option.none());
  });

  return { local, follow, leave };
});
