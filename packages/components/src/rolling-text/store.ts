/**
 * RollingText's swap, held in Effect.
 *
 * The state machine is `internal/text-swap.ts`; this store owns the half that
 * has a clock: the exit window. A value change that starts an exit forks one
 * sleep on the store's runtime, and the window **belongs to the exit the change
 * started** — a value arriving mid-exit replaces the pending one and cannot
 * push the window back, so a live counter still swaps every window instead of
 * leaving the clip empty.
 *
 * The entry's completion is the runtime's motion clock reporting in
 * (`entered`), the same seam `internal/presence.ts` uses for a surface's exit:
 * a tween ends when it ends, not when a wall-clock copy of its duration says so.
 */

import { Duration, Effect, type Fiber, Option } from "effect";
import { makeEffectStore, type EffectStore } from "../internal/effect-store.js";
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
export interface RollingStore extends EffectStore<SwapState> {
  /** Ask the slot to show `text`; a repeat of the value on screen does nothing. */
  readonly show: (text: string, policy: RollPolicy) => void;
  /** The incoming value's tween landed. */
  readonly entered: () => void;
}

/** A roll at rest on `text`, with no window running. */
export const makeRollingStore = (text: string): RollingStore => {
  const store = makeEffectStore<SwapState>(initialSwap(text));
  let exiting: Option.Option<Fiber.Fiber<void>> = Option.none();

  const cancelExit = (): void => {
    Option.match(exiting, {
      onNone: () => undefined,
      onSome: (fiber) => store.cancel(fiber),
    });
    exiting = Option.none();
  };

  /** The exit half has run: paint the newest pending value and travel it in. */
  const settle = (): void => {
    exiting = Option.none();
    const current = store.read();
    const next = settleSwap(current);
    if (next !== current) store.set(next);
  };

  return {
    ...store,
    show: (text, policy) => {
      const current = store.read();
      const next = requestSwap(current, text, policy.reduced);
      if (next === current) return;
      store.set(next);
      if (next.phase !== "leaving") {
        cancelExit();
        return;
      }
      if (Option.isNone(exiting)) {
        exiting = Option.some(
          store.fork(
            Effect.sleep(Duration.millis(policy.swapMs)).pipe(
              Effect.andThen(Effect.sync(settle)),
            ),
          ),
        );
      }
    },
    entered: () => {
      const current = store.read();
      const next = restSwap(current);
      if (next !== current) store.set(next);
    },
    stop: () => {
      exiting = Option.none();
      store.stop();
    },
  };
};
