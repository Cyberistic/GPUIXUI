import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import type { CalendarEvent, CalendarId } from "./data.js";

export const weekStart = (monday: string, weeks: number): string => {
  const date = new Date(`${monday}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
};

export interface Placed {
  readonly event: CalendarEvent;
  readonly lane: number;
  readonly lanes: number;
}

const overlaps = (a: CalendarEvent, b: CalendarEvent) =>
  a.start < b.end && b.start < a.end;

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

export const visible = (
  all: ReadonlyArray<CalendarEvent>,
  on: ReadonlyArray<CalendarId>,
): ReadonlyArray<CalendarEvent> =>
  Arr.filter(all, (event) => on.includes(event.calendar));
