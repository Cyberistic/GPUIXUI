/**
 * The field of stars falling toward a well.
 *
 * One `SubscriptionRef` holds the measured box and each star's life — which leg
 * of the fall it is on, and which lap. The box is the field's state; a life is a
 * per-star slice, so the field subscribes to the box alone and each star
 * subscribes to its own phase. One leg completing repaints one star rather than
 * re-laying the field.
 *
 * The fall itself stays the runtime's tween, and `onMotionComplete` is the only
 * thing that advances a star (`gravityAdvanced`). There is no timer here: a
 * star's pace is the motion description it hands the runtime, and the two ends
 * of its journey are invisible, so the rebirth at the well has no frame a reader
 * can see.
 */

import { Effect } from "effect";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as SubscriptionRef from "effect/SubscriptionRef";
import type { MeasuredBox } from "../internal/measure.js";
import { makeLocalState, type LocalState } from "../internal/local-state.js";
import {
  gravityAdvanced,
  gravityLifeOf,
  gravitySameBox,
  type GravityBox,
  type GravityLife,
} from "./logic.js";

/** What a field holds. */
export interface GravityStoreState {
  /** The box the field is laid out in, `None` until it has been laid out. */
  readonly box: Option.Option<GravityBox>;
  /** The leg each star is on, by `GravityStar.key`. */
  readonly lives: HashMap.HashMap<string, GravityLife>;
}

/** What the field can tell the store. */
export interface GravityStore {
  readonly local: LocalState<GravityStoreState>;
  /**
   * Record the box an `onLayout` reported. The same size again writes nothing,
   * so a report cannot restart a field the runtime is already falling.
   */
  readonly measure: (box: Option.Option<MeasuredBox>) => Effect.Effect<void>;
  /** Advance a star: the approach hands over to the plunge, a plunge to a new lap. */
  readonly advance: (key: string) => Effect.Effect<void>;
}

/** The store a mounted field falls through. */
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
