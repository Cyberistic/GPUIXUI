export const calendars = [
  { id: "exam", label: "Hunter Exam", tone: "primary" },
  { id: "arena", label: "Heavens Arena", tone: "warning" },
  { id: "island", label: "Greed Island", tone: "success" },
] as const;
export type CalendarId = (typeof calendars)[number]["id"];

export interface CalendarEvent {
  readonly id: string;
  readonly calendar: CalendarId;
  readonly title: string;
  /** 0 = Monday. */
  readonly day: number;
  /** Hours from midnight, fractional. */
  readonly start: number;
  readonly end: number;
}

export const events: ReadonlyArray<CalendarEvent> = [
  {
    id: "e1",
    calendar: "exam",
    title: "Phase one: the marathon",
    day: 0,
    start: 9,
    end: 12,
  },
  {
    id: "e2",
    calendar: "exam",
    title: "Examiners' sync",
    day: 0,
    start: 11,
    end: 12.5,
  },
  {
    id: "e3",
    calendar: "arena",
    title: "Gon vs Gido",
    day: 1,
    start: 14,
    end: 15,
  },
  {
    id: "e4",
    calendar: "island",
    title: "Card trade with Goreinu",
    day: 2,
    start: 10,
    end: 11,
  },
  {
    id: "e5",
    calendar: "exam",
    title: "Trick Tower briefing",
    day: 3,
    start: 9.5,
    end: 10.5,
  },
  {
    id: "e6",
    calendar: "arena",
    title: "Floor 200 registration",
    day: 3,
    start: 9,
    end: 11,
  },
  {
    id: "e7",
    calendar: "island",
    title: "Bisky's training",
    day: 4,
    start: 8,
    end: 17,
  },
];

/** The first Monday the view opens on, as an ISO date. */
export const firstMonday = "2026-11-02";
