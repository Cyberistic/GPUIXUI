/**
 * The sheen a shine action wears.
 *
 * One `SubscriptionRef` holds the measured box and the sweep — whether a band is
 * crossing and which crossing it is, so a re-entry re-mounts the two halves
 * instead of retargeting a band already on screen.
 *
 * A sweep is a journey with an end, so the store owns its timer: an entry
 * replaces the timer already running, and the component's teardown cancels it.
 * A disabled or reduced-motion control never starts one and drops the one it
 * wears, because the band marks a hover the control can no longer answer.
 */

import { Effect } from "effect";
import * as Option from "effect/Option";
import * as SubscriptionRef from "effect/SubscriptionRef";
import type { MeasuredBox } from "../internal/measure.js";
import { makeLocalState, type LocalState } from "../internal/local-state.js";

/** What the control paints. */
export interface SheenState {
  /** The control's box, `None` until it has been laid out. */
  readonly box: Option.Option<MeasuredBox>;
  /** Whether a band is crossing right now. */
  readonly sweeping: boolean;
  /** Which crossing it is; the halves are keyed by it, so a new one starts outside. */
  readonly run: number;
}

/** What the control can tell the store. */
export interface SheenStore {
  readonly local: LocalState<SheenState>;
  /** Record the box an `onLayout` reported. */
  readonly measure: (box: Option.Option<MeasuredBox>) => Effect.Effect<void>;
  /**
   * Start a sweep on a hover entry and remove it after `windowMs`. `inert` is
   * the reduced-preference and disabled rule.
   */
  readonly enter: (inert: boolean, windowMs: number) => Effect.Effect<void>;
  /** Drop the band and its timer, e.g. when the control becomes inert. */
  readonly clear: Effect.Effect<void>;
}

/** The store a mounted action shines through. */
export const makeSheenStore: Effect.Effect<SheenStore> = Effect.gen(
  function* () {
    const local = yield* makeLocalState<SheenState>({
      box: Option.none(),
      sweeping: false,
      run: 0,
    });

    /** The sweep that ends when its window does. */
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

    return { local, measure, enter, clear };
  },
);
