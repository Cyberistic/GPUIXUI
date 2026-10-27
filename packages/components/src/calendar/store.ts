/**
 * The calendar's view state: the month window and the focused day.
 *
 * Both live in a `SubscriptionRef` behind {@link makeLocalState}, because the
 * grid writes them from a key handler and reads them again in the same turn (a
 * move must land real focus on the cell it announces). `pending` is the one
 * request that survives a paint: the store asked for focus, and the grid hands
 * it to the runtime once the cell exists.
 */

import { Effect } from "effect";
import * as DateTime from "effect/DateTime";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { makeLocalState, type LocalState } from "../internal/local-state.js";
import { visibleMonth, type MonthCount } from "./logic.js";

/** What the calendar remembers between paints. */
export interface CalendarViewState {
  /** The first month the grid paints. */
  readonly month: DateTime.Utc;
  /** The day the roving tab stop sits on. */
  readonly focus: DateTime.Utc;
  /** Set when the last write must move real focus to `focus`. */
  readonly pending: boolean;
}

/** The calendar's store, and the writes that move it. */
export interface CalendarStore {
  readonly local: LocalState<CalendarViewState>;
  /** How many months the window paints. */
  readonly count: MonthCount;
  /** Move the focused day, pulling the window along if it left it. */
  readonly focusDay: (day: DateTime.Utc) => Effect.Effect<void>;
  /** Page the window to `month` and focus `day`. */
  readonly show: (
    month: DateTime.Utc,
    day: DateTime.Utc,
  ) => Effect.Effect<void>;
  /** Record the focus the runtime already moved, without asking for it again. */
  readonly visited: (day: DateTime.Utc) => Effect.Effect<void>;
  /** The request was honoured; the next paint must not focus again. */
  readonly settle: Effect.Effect<void>;
}

/** Build a store at `initial`, painting `count` months at a time. */
export const makeCalendarStore = (initial: {
  readonly month: DateTime.Utc;
  readonly focus: DateTime.Utc;
  readonly count: MonthCount;
  readonly pending?: boolean;
}): Effect.Effect<CalendarStore> =>
  Effect.gen(function* () {
    const count = initial.count;
    const local = yield* makeLocalState<CalendarViewState>({
      month: initial.month,
      focus: initial.focus,
      pending: initial.pending ?? false,
    });

    const focusDay = Effect.fnUntraced(function* (day: DateTime.Utc) {
      const current = yield* SubscriptionRef.get(local.state);
      yield* local.write({
        month: visibleMonth(current.month, count, day),
        focus: day,
        pending: true,
      });
    });

    const show = Effect.fnUntraced(function* (
      month: DateTime.Utc,
      day: DateTime.Utc,
    ) {
      yield* local.write({ month, focus: day, pending: true });
    });

    const visited = Effect.fnUntraced(function* (day: DateTime.Utc) {
      const current = yield* SubscriptionRef.get(local.state);
      if (DateTime.toEpochMillis(current.focus) === DateTime.toEpochMillis(day))
        return;
      yield* local.write({
        month: visibleMonth(current.month, count, day),
        focus: day,
        pending: false,
      });
    });

    const settle = Effect.flatMap(SubscriptionRef.get(local.state), (current) =>
      current.pending
        ? local.write({ ...current, pending: false })
        : Effect.void,
    );

    return { local, count, focusDay, show, visited, settle };
  });
