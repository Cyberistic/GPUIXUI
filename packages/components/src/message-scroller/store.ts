import { Effect } from "effect";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { makeLocalState, type LocalState } from "../internal/local-state.js";

export interface MessageScrollerState {
  readonly pinned: boolean;

  readonly unread: number;

  readonly streaming: boolean;
}

export const initialMessageScrollerState = (
  pinned: boolean,
): MessageScrollerState => ({ pinned, unread: 0, streaming: false });

export interface ScrollObservation {
  readonly distanceFromEnd: number;

  readonly threshold: number;
}

export const observeScroll = (
  state: MessageScrollerState,
  { distanceFromEnd, threshold }: ScrollObservation,
): MessageScrollerState => {
  if (Number.isNaN(distanceFromEnd) || Number.isNaN(threshold)) return state;
  const pinned = distanceFromEnd <= Math.max(0, threshold);

  const unread = pinned ? 0 : state.unread;
  return pinned === state.pinned && unread === state.unread
    ? state
    : { ...state, pinned, unread };
};

export const addItems = (
  state: MessageScrollerState,
  count: number,
): MessageScrollerState =>
  state.pinned || Number.isNaN(count) || count <= 0
    ? state
    : { ...state, unread: state.unread + count };

export const requestLatest = (
  state: MessageScrollerState,
): MessageScrollerState =>
  state.pinned && state.unread === 0
    ? state
    : { ...state, pinned: true, unread: 0 };

export interface MessageScrollerStore {
  readonly local: LocalState<MessageScrollerState>;

  readonly observe: (observation: ScrollObservation) => Effect.Effect<boolean>;

  readonly arrived: Effect.Effect<void>;

  readonly jump: Effect.Effect<void>;

  readonly stream: (streaming: boolean) => Effect.Effect<void>;

  readonly setPinned: (pinned: boolean) => Effect.Effect<void>;
}

export const makeMessageScrollerStore = (
  defaultPinned: boolean,
): Effect.Effect<MessageScrollerStore> =>
  Effect.gen(function* () {
    const local = yield* makeLocalState(
      initialMessageScrollerState(defaultPinned),
    );

    const observe = Effect.fnUntraced(function* (
      observation: ScrollObservation,
    ) {
      const current = yield* SubscriptionRef.get(local.state);
      const next = observeScroll(current, observation);
      if (next !== current) yield* local.write(next);
      return next.pinned;
    });

    const arrived = Effect.gen(function* () {
      const current = yield* SubscriptionRef.get(local.state);
      const next = addItems(current, 1);
      if (next !== current) yield* local.write(next);
    });

    const jump = Effect.gen(function* () {
      const current = yield* SubscriptionRef.get(local.state);
      const next = requestLatest(current);
      if (next !== current) yield* local.write(next);
    });

    const stream = Effect.fnUntraced(function* (streaming: boolean) {
      const current = yield* SubscriptionRef.get(local.state);
      if (current.streaming === streaming) return;
      yield* local.write({ ...current, streaming });
    });

    const setPinned = Effect.fnUntraced(function* (pinned: boolean) {
      const current = yield* SubscriptionRef.get(local.state);
      if (current.pinned === pinned) return;
      yield* local.write({
        ...current,
        pinned,
        unread: pinned ? 0 : current.unread,
      });
    });

    return { local, observe, arrived, jump, stream, setPinned };
  });
