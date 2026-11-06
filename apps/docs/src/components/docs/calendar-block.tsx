import * as Arr from "effect/Array";
import { useState } from "react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const YEAR = 2026;
const MONTH = 5;
const TODAY = 12;

interface CalendarEvent {
  readonly day: number;
  readonly time: string;
  readonly title: string;
  readonly who: string;
  readonly tone: "primary" | "green" | "amber";
}

const EVENTS: ReadonlyArray<CalendarEvent> = [
  {
    day: 2,
    time: "09:30",
    title: "Hunter Exam briefing",
    who: "Gon · Killua · Leorio",
    tone: "primary",
  },
  {
    day: 2,
    time: "14:00",
    title: "Nen training",
    who: "Biscuit",
    tone: "green",
  },
  {
    day: 12,
    time: "10:00",
    title: "Zoldyck estate call",
    who: "Silva",
    tone: "amber",
  },
  {
    day: 12,
    time: "16:30",
    title: "Yorknew auction",
    who: "Kurapika",
    tone: "primary",
  },
  {
    day: 18,
    time: "11:00",
    title: "Greed Island review",
    who: "The team",
    tone: "green",
  },
  {
    day: 25,
    time: "08:00",
    title: "Heavens Arena match",
    who: "Gon",
    tone: "amber",
  },
];

const daysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

const mondayFirst = (year: number, month: number): number =>
  (new Date(year, month, 1).getDay() + 6) % 7;

interface Cell {
  readonly day: number;
  readonly outside: boolean;
}

const monthCells = (year: number, month: number): ReadonlyArray<Cell> => {
  const length = daysInMonth(year, month);
  const lead = mondayFirst(year, month);
  const previous = daysInMonth(year, month === 0 ? 11 : month - 1);
  const count = Math.ceil((lead + length) / 7) * 7;
  return Arr.makeBy(count, (index) => {
    const offset = index - lead;
    if (offset < 0) return { day: previous + offset + 1, outside: true };
    if (offset >= length) return { day: offset - length + 1, outside: true };
    return { day: offset + 1, outside: false };
  });
};

const selectedLabel = (day: number): string =>
  `Friday, ${day} ${MONTHS[MONTH]} ${YEAR}`;

export const CalendarRender = () => {
  const [month, setMonth] = useState(MONTH);
  const [selected, setSelected] = useState(TODAY);
  const cells = monthCells(YEAR, month);
  const agenda = EVENTS.filter((event) => event.day === selected);

  return (
    <div className="gx-cal">
      <header className="gx-cal-head">
        <div>
          <h3 className="gx-cal-title">Calendar</h3>
          <p className="gx-cal-desc">
            One month at a glance, with the day's schedule beside it.
          </p>
        </div>
        <button
          className="gx-btn gx-btn-outline gx-btn-sm"
          onClick={() => {
            setMonth(MONTH);
            setSelected(TODAY);
          }}
          type="button"
        >
          Today
        </button>
      </header>

      <div className="gx-cal-body">
        <section aria-label="Month" className="gx-cal-month">
          <div className="gx-cal-month-head">
            <h4 className="gx-cal-month-title">
              {MONTHS[month]} {YEAR}
            </h4>
            <span className="gx-cal-nav">
              <button
                aria-label="Previous month"
                className="gx-cal-arrow"
                onClick={() => setMonth(month === 0 ? 11 : month - 1)}
                type="button"
              >
                ‹
              </button>
              <button
                aria-label="Next month"
                className="gx-cal-arrow"
                onClick={() => setMonth(month === 11 ? 0 : month + 1)}
                type="button"
              >
                ›
              </button>
            </span>
          </div>

          <div className="gx-cal-grid" role="grid">
            {WEEKDAYS.map((day) => (
              <span className="gx-cal-weekday" key={day} role="columnheader">
                {day}
              </span>
            ))}
            {cells.map((cell, index) => {
              const isSelected = !cell.outside && cell.day === selected;
              const isToday =
                !cell.outside && month === MONTH && cell.day === TODAY;
              const events = EVENTS.filter(
                (event) => !cell.outside && event.day === cell.day,
              );
              return (
                <button
                  aria-current={isToday ? "date" : undefined}
                  aria-selected={isSelected}
                  className="gx-cal-day"
                  data-outside={cell.outside || undefined}
                  data-selected={isSelected || undefined}
                  data-today={isToday || undefined}
                  key={`${index}-${cell.day}`}
                  onClick={() => {
                    if (!cell.outside) setSelected(cell.day);
                  }}
                  role="gridcell"
                  type="button"
                >
                  <span className="gx-cal-day-number">{cell.day}</span>
                  <span className="gx-cal-dots">
                    {events.map((event) => (
                      <i data-tone={event.tone} key={event.time} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="Agenda" className="gx-cal-agenda">
          <header className="gx-cal-agenda-head">
            <div>
              <p className="gx-cal-agenda-day">{selectedLabel(selected)}</p>
              <p className="gx-cal-agenda-count">
                {agenda.length} {agenda.length === 1 ? "event" : "events"}
              </p>
            </div>
            <button
              className="gx-btn gx-btn-primary gx-btn-sm"
              type="button"
            >
              New event
            </button>
          </header>

          {agenda.length === 0 ? (
            <p className="gx-cal-empty">Nothing scheduled. A good day to train.</p>
          ) : (
            <ul className="gx-cal-list">
              {agenda.map((event) => (
                <li className="gx-cal-event" data-tone={event.tone} key={event.time}>
                  <span className="gx-cal-time">{event.time}</span>
                  <span className="gx-cal-event-text">
                    <span className="gx-cal-event-title">{event.title}</span>
                    <span className="gx-cal-event-who">{event.who}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export const calendarBlockSource = `import * as Arr from "effect/Array";
import { useState } from "react";
import { Calendar } from "@gpuixui/components/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@gpuixui/components/card";
import { Button, Stack, Text } from "@gpuixui/primitives";

const EVENTS = [
  { day: "2026-06-12", time: "10:00", title: "Zoldyck estate call" },
  { day: "2026-06-12", time: "16:30", title: "Yorknew auction" },
];

export function CalendarPage() {
  const [day, setDay] = useState<string | null>("2026-06-12");
  const agenda = EVENTS.filter((event) => event.day === day);

  return (
    <Stack direction="row" gap="lg" style={{ width: 980 }}>
      <Card>
        <CardHeader>
          <CardTitle>Appointment</CardTitle>
          <Button size="sm" variant="outline" onActivate={() => setDay("2026-06-12")}>
            Today
          </Button>
        </CardHeader>
        <CardContent>
          <Calendar mode="single" selected={day} onSelect={setDay} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{day ?? "No day"}</CardTitle>
        </CardHeader>
        <CardContent>
          {agenda.map((event) => (
            <Stack direction="row" gap="sm" key={event.time}>
              <Text role="label">{event.time}</Text>
              <Text>{event.title}</Text>
            </Stack>
          ))}
        </CardContent>
      </Card>
    </Stack>
  );
}`;
