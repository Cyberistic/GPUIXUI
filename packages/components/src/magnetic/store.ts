/**
 * The pointer a magnetic surface follows.
 *
 * One `SubscriptionRef` holds the point the last move landed on, `None` while
 * the pointer is away or the preference has released it. The plate's lean stays
 * a pure function of that point and the measured box
 * (`magneticPull`), so the store only answers *where the pointer is* — a
 * repeated move over the point already held changes nothing, which is what
 * keeps a held pointer from re-rendering a frame the runtime would paint
 * identically.
 */

import { Effect } from "effect";
import * as Option from "effect/Option";
import * as SubscriptionRef from "effect/SubscriptionRef";
import type { MeasuredPoint } from "../internal/measure.js";
import { makeLocalState, type LocalState } from "../internal/local-state.js";
import { samePoint } from "./logic.js";

/** The pointer the plate is leaning toward; `None` at rest. */
export type MagneticFollower = Option.Option<MeasuredPoint>;

/** What the surface can tell the store. */
export interface MagneticStore {
  readonly local: LocalState<MagneticFollower>;
  /**
   * Report a move. A payload with no readable point, or one that repeats the
   * point already held, writes nothing.
   */
  readonly follow: (point: Option.Option<MeasuredPoint>) => Effect.Effect<void>;
  /** Forget the pointer, so a lean the preference removed is not restored. */
  readonly release: Effect.Effect<void>;
}

/** The store a mounted surface follows the pointer through. */
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
