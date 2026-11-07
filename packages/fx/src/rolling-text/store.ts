import { Effect } from "effect";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { makeLocalState, type LocalState } from "@gpuixui/components/authoring";
import {
  initialSwap,
  requestSwap,
  restSwap,
  settleSwap,
  type SwapState,
} from "../internal/text-swap.js";

export interface RollPolicy {
  readonly reduced: boolean;

  readonly swapMs: number;
}

export interface RollingStore {
  readonly local: LocalState<SwapState>;

  readonly show: (text: string, policy: RollPolicy) => Effect.Effect<void>;

  readonly entered: Effect.Effect<void>;
}

export const makeRollingStore = (text: string): Effect.Effect<RollingStore> =>
  Effect.gen(function* () {
    const local = yield* makeLocalState<SwapState>(initialSwap(text));

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

      if (!local.running()) yield* local.after(policy.swapMs, settle);
    });

    const entered = Effect.gen(function* () {
      const current = yield* SubscriptionRef.get(local.state);
      const next = restSwap(current);
      if (next !== current) yield* local.write(next);
    });

    return { local, show, entered };
  });
