import { Effect } from "effect";
import * as DateTime from "effect/DateTime";
import * as SubscriptionRef from "effect/SubscriptionRef";
import { makeLocalState, type LocalState } from "../internal/local-state.js";
import { visibleMonth, type MonthCount } from "./logic.js";

export interface CalendarViewState {
  readonly month: DateTime.Utc;

  readonly focus: DateTime.Utc;

  readonly pending: boolean;
}

export interface CalendarStore {
  readonly local: LocalState<CalendarViewState>;

  readonly count: MonthCount;

  readonly focusDay: (day: DateTime.Utc) => Effect.Effect<void>;

  readonly show: (
    month: DateTime.Utc,
    day: DateTime.Utc,
  ) => Effect.Effect<void>;

  readonly visited: (day: DateTime.Utc) => Effect.Effect<void>;

  readonly settle: Effect.Effect<void>;
}

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
