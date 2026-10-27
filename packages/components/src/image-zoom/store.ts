/**
 * ImageZoom's pointer, held in Effect.
 *
 * The magnification and the pan are arithmetic over the frame, the surface and
 * this one reading (`logic.ts`); what a component has to keep between renders is
 * therefore the pointer alone. It lives in a store so a move is a write into
 * Effect rather than a React state, and a repeat of the point already followed
 * writes nothing: the runtime emits a move per frame while the pointer is held.
 *
 * The surface a reading is taken against is measurement, not interaction: it
 * stays in `internal/surface-box.tsx` with the 1 px probe that keeps a moved
 * frame's origin fresh, and this store holds only what the reader did.
 */

import { Effect } from "effect";
import * as Option from "effect/Option";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { makeLocalState, type LocalState } from "../internal/local-state.js";
import { samePointer, type ZoomPointer } from "./logic.js";

/** {@link ImageZoom}'s pointer state and the two events that move it. */
export interface ZoomStore {
  readonly local: LocalState<Option.Option<ZoomPointer>>;
  /** Follow a pointer reading; a repeat of the held point writes nothing. */
  readonly follow: (point: ZoomPointer) => Effect.Effect<void>;
  /** The pointer left the frame: the picture returns to rest. */
  readonly leave: Effect.Effect<void>;
}

/** A zoom at rest: no pointer over the frame. */
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
