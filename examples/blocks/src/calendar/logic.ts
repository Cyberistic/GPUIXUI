/**
 * The calendar block's rules: the week a step lands on, and how one day's
 * overlapping events share its column.
 */

import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import type { CalendarEvent, CalendarId } from "./data.js";

/** The Monday `weeks` weeks after `monday`, as an ISO date (UTC arithmetic). */
export const weekStart = (monday: string, weeks: number): string => {
  const date = new Date(`${monday}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
};

/** One event placed in its day: which of `lanes` side-by-side lanes it takes. */
export interface Placed {
  readonly event: CalendarEvent;
  readonly lane: number;
  readonly lanes: number;
}

const overlaps = (a: CalendarEvent, b: CalendarEvent) =>
  a.start < b.end && b.start < a.end;

/**
 * Lay out one day: each event takes the first lane free at its start, and
 * every event in an overlapping cluster divides the column by the cluster's
 * lane count.
 */
export const layoutDay = (
  dayEvents: ReadonlyArray<CalendarEvent>,
): ReadonlyArray<Placed> => {
  const sorted = Arr.sort(
    dayEvents,
    Order.mapInput(Order.Number, (event: CalendarEvent) => event.start),
  );
  const lanes = Arr.reduce(
    sorted,
    [] as ReadonlyArray<{
      readonly event: CalendarEvent;
      readonly lane: number;
    }>,
    (placed, event) => {
      const taken = Arr.map(
        Arr.filter(placed, (other) => overlaps(other.event, event)),
        (other) => other.lane,
      );
      const lane =
        Arr.range(0, sorted.length).find((n) => !taken.includes(n)) ?? 0;
      return Arr.append(placed, { event, lane });
    },
  );
  return Arr.map(lanes, ({ event, lane }) => {
    const cluster = Arr.filter(lanes, (other) => overlaps(other.event, event));
    return {
      event,
      lane,
      lanes: Math.max(...Arr.map(cluster, (other) => other.lane)) + 1,
    };
  });
};

/** The events of the calendars that are switched on. */
export const visible = (
  all: ReadonlyArray<CalendarEvent>,
  on: ReadonlyArray<CalendarId>,
): ReadonlyArray<CalendarEvent> =>
  Arr.filter(all, (event) => on.includes(event.calendar));
