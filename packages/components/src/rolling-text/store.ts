/**
 * RollingText's swap, held in Effect.
 *
 * The state machine is `internal/text-swap.ts`; this store owns the half that
 * has a clock: the exit window. A value change that starts an exit schedules one
 * settle on the store's timer, and the window **belongs to the exit the change
 * started** — a value arriving mid-exit replaces the pending one and cannot
 * push the window back, which is why the arm is guarded by
 * {@link LocalState.running} rather than by replacing the timer. A live counter
 * therefore still swaps every window instead of leaving the clip empty.
 *
 * The entry's completion is the runtime's motion clock reporting in
 * (`entered`), the same seam `internal/presence.ts` uses for a surface's exit:
 * a tween ends when it ends, not when a wall-clock copy of its duration says so.
 */

import { Effect } from "effect";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { makeLocalState, type LocalState } from "../internal/local-state.js";
import {
  initialSwap,
  requestSwap,
  restSwap,
  settleSwap,
  type SwapState,
} from "../internal/text-swap.js";

/** The policy one value change rolls under. */
export interface RollPolicy {
  /** The reader asked for less motion: the value is painted, not travelled. */
  readonly reduced: boolean;
  /** The exit half's window, in milliseconds. */
  readonly swapMs: number;
}

/** {@link RollingText}'s state and the two events that move it. */
export interface RollingStore {
  readonly local: LocalState<SwapState>;
  /** Ask the slot to show `text`; a repeat of the value on screen does nothing. */
  readonly show: (text: string, policy: RollPolicy) => Effect.Effect<void>;
  /** The incoming value's tween landed. */
  readonly entered: Effect.Effect<void>;
}

/** A roll at rest on `text`, with no window running. */
export const makeRollingStore = (text: string): Effect.Effect<RollingStore> =>
  Effect.gen(function* () {
    const local = yield* makeLocalState<SwapState>(initialSwap(text));

    /** The exit half has run: paint the newest pending value and travel it in. */
    const settle = Effect.gen(function* () {
      const current = yield* SubscriptionRef.get(local.state);
      const next = settleSwap(current);
      if (next !== current) yield* local.write(next);
    });

    const show = Effect.fnUntraced(function* (
      text: string,
      policy: RollPolicy,
    ) {
      const current = yield* SubscriptionRef.get(local.state);
      const next = requestSwap(current, text, policy.reduced);
      if (next === current) return;
      yield* local.write(next);
      if (next.phase !== "leaving") {
        yield* local.cancel;
        return;
      }
      // The window is the exit's, not the newest arrival's: a value that lands
      // mid-exit replaces the pending one and finds the settle already armed.
      if (!local.running()) yield* local.after(policy.swapMs, settle);
    });

    const entered = Effect.gen(function* () {
      const current = yield* SubscriptionRef.get(local.state);
      const next = restSwap(current);
      if (next !== current) yield* local.write(next);
    });

    return { local, show, entered };
  });
