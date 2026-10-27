/**
 * MessageScroller's state, as one `LocalState` store.
 *
 * The scroller owns four facts: whether it follows the newest row, how many
 * rows arrived while it did not, whether a reply is streaming, and whether an
 * anchored turn owns the viewport until its reply fills. React only subscribes
 * ({@link useLocalState}); every change is a store command, so a scroll handler,
 * a row mount and a jump press all move the same value in the same turn.
 *
 * The rules are pure and live beside the store so a decision can be tested
 * without a window: a reader inside `threshold` of the tail is at the end; an
 * arrival while away increments the count; Jump to latest re-pins and clears it.
 */

import { Effect } from "effect";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { makeLocalState, type LocalState } from "../internal/local-state.js";

/** Whether the viewport follows new content, and how much arrived unseen. */
export interface MessageScrollerState {
  /** Following the newest row. */
  readonly pinned: boolean;
  /** Rows that arrived while the reader was not pinned. */
  readonly unread: number;
  /** A reply is still arriving. */
  readonly streaming: boolean;
}

/** A fresh scroller follows the end and has seen everything. */
export const initialMessageScrollerState = (
  pinned: boolean,
): MessageScrollerState => ({ pinned, unread: 0, streaming: false });

/** One measurement of the viewport's distance from its newest row. */
export interface ScrollObservation {
  /** Pixels between the bottom of the viewport and the tail sentinel. */
  readonly distanceFromEnd: number;
  /** How close to the tail still counts as "at the end"; a layout token. */
  readonly threshold: number;
}

/**
 * Fold one scroll observation.
 *
 * An observation the scroller cannot read is **no observation**: the threshold
 * is often arithmetic over a measured inset and the distance is bounds
 * arithmetic, and `NaN` fails every comparison — which used to read as "away
 * from the end", so a reader resting at the bottom stopped following.
 */
export const observeScroll = (
  state: MessageScrollerState,
  { distanceFromEnd, threshold }: ScrollObservation,
): MessageScrollerState => {
  if (Number.isNaN(distanceFromEnd) || Number.isNaN(threshold)) return state;
  const pinned = distanceFromEnd <= Math.max(0, threshold);
  // A reader at the end has seen everything; a reader away keeps the count it
  // already had. An anchored turn owns the viewport, so its arrivals are not
  // "unseen" — the reader is watching the turn, not the tail.
  const unread = pinned ? 0 : state.unread;
  return pinned === state.pinned && unread === state.unread
    ? state
    : { ...state, pinned, unread };
};

/**
 * Fold rows appended to the viewport. A pinned reader sees them, so only the
 * unpinned case counts; a count that is not an arrival — zero, negative, or one
 * the scroller cannot read — changes nothing.
 */
export const addItems = (
  state: MessageScrollerState,
  count: number,
): MessageScrollerState =>
  state.pinned || Number.isNaN(count) || count <= 0
    ? state
    : { ...state, unread: state.unread + count };

/** The state "jump to latest" produces: pinned, with nothing unseen. */
export const requestLatest = (
  state: MessageScrollerState,
): MessageScrollerState =>
  state.pinned && state.unread === 0
    ? state
    : { ...state, pinned: true, unread: 0 };

/** What the scroller can tell its store. */
export interface MessageScrollerStore {
  readonly local: LocalState<MessageScrollerState>;
  /** Record one scroll measurement, and report the pin it produced. */
  readonly observe: (observation: ScrollObservation) => Effect.Effect<boolean>;
  /** Count one row that mounted after the first paint. */
  readonly arrived: Effect.Effect<void>;
  /** Return to the end and clear the count. */
  readonly jump: Effect.Effect<void>;
  /** Record whether a reply is still arriving. */
  readonly stream: (streaming: boolean) => Effect.Effect<void>;
  /** Mirror a controlled `pinned` prop without counting an arrival. */
  readonly setPinned: (pinned: boolean) => Effect.Effect<void>;
}

/** The store a mounted scroller reads and writes through. */
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
