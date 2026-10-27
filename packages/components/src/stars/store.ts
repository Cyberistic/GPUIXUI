/**
 * The sky a stars field paints.
 *
 * One `SubscriptionRef` holds the measured box and the light each star is
 * heading for. The box is the field's state — a size change re-draws the sky
 * from the same seed — and a direction is a per-star slice: the field subscribes
 * to the box alone, and each star subscribes to its own turnaround, so one
 * completion repaints one star rather than the whole field.
 *
 * The tween itself stays the runtime's, and its `onMotionComplete` is the only
 * thing that turns a star around (`turned`). There is no timer here: a twinkle's
 * time is the motion description the star hands the runtime.
 */

import { Effect } from "effect";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as SubscriptionRef from "effect/SubscriptionRef";
import type { MeasuredBox } from "../internal/measure.js";
import { makeLocalState, type LocalState } from "../internal/local-state.js";
import {
  directionOf,
  sameBox,
  turned,
  type StarBox,
  type StarDirection,
} from "./logic.js";

/** What a field holds. */
export interface StarsStoreState {
  /** The box the field is laid out in, `None` until it has been laid out. */
  readonly box: Option.Option<StarBox>;
  /** The light each star is heading for, by `StarSpec.key`. */
  readonly directions: HashMap.HashMap<string, StarDirection>;
}

/** What the field can tell the store. */
export interface StarsStore {
  readonly local: LocalState<StarsStoreState>;
  /**
   * Record the box an `onLayout` reported. The same size again writes nothing,
   * so a report cannot churn a field the runtime is already tweening.
   */
  readonly measure: (box: Option.Option<MeasuredBox>) => Effect.Effect<void>;
  /** Turn a star around: the end of one twinkle is the start of the next. */
  readonly turn: (key: string) => Effect.Effect<void>;
}

/** The store a mounted field paints through. */
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
