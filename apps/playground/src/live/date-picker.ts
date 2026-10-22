/**
 * The `date-picker-lifecycle` fixture: the shipped `DatePicker`'s keyboard and
 * bounds contract, as the focused day each gesture must leave behind.
 *
 * `DatePicker` is the library's one calendar, and the grid is ours because
 * `@gpuix/native@0.11.0` publishes no date input. Its key table is proved
 * offscreen against a `TestRenderer`, where a key is handed to the grid's own
 * `onKeyDown`. A window is a different path in three ways nothing had measured:
 * the key lands on the **focused day cell** and has to reach the grid above it;
 * the runtime moves focus only when component code calls `focusElement`; and the
 * cell a move lands on is a `tabIndex` -1 `div` inside an anchored surface.
 *
 * The routes are cumulative and in the probe's order — each row's `from` is the
 * previous row's `to` — so a row that credited a key with the wrong day names
 * the gesture it broke. `date-picker.test.ts` re-derives each move from
 * `effect/DateTime`, clamps it to the bounds below and holds the month label to
 * the calendar's own English format, so the table cannot drift into an arbitrary
 * sequence of iso strings.
 *
 * Kept native-free, so the table is testable on a host with no binding.
 */

/** The probe root, the field it drives and the stop after it. */
export const DATE_PICKER_PROBE = "date-picker-probe";
export const DATE_PICKER_TRIGGER = "date-picker-trigger";
export const DATE_PICKER_AFTER = "date-picker-after";
/** A second, never-used instance: the empty first open has its own anchor. */
export const DATE_PICKER_EMPTY_TRIGGER = "date-picker-empty-trigger";

/** The parts the surface paints, all default ids of the shipped component. */
export const DATE_PICKER_CONTENT = "date-picker-content";
export const DATE_PICKER_MONTH = "date-month";
export const DATE_PICKER_NEXT = "date-next";
export const DATE_PICKER_CLEAR = "date-clear";

/** The app's own record: the value it received and how often it heard one. */
export const DATE_PICKER_READOUT = "date-picker-readout";

/**
 * The days the probe pins.
 *
 * `today` is a Wednesday in March 2026, and both bounds sit inside that month,
 * so the month controls have no neighbouring month with a selectable day — which
 * is what makes "the control refuses" a measurement rather than a frame race.
 * `2026-03-30` is inside the grid (the last week starts on the 30th) and after
 * the last bound, so pressing it is the unavailable-day control.
 */
export const DATE_PICKER_TODAY = "2026-03-11";
export const DATE_PICKER_MIN = "2026-03-02";
export const DATE_PICKER_MAX = "2026-03-27";
export const DATE_PICKER_UNAVAILABLE = "2026-03-30";

/**
 * The day `Right` moves to after a press parks the focus on the refused
 * next-month control.
 *
 * The runtime focuses the element a pointer pressed even when it is `disabled`
 * (`button-activation-lifecycle` measured the same rule), so the press leaves
 * `date-next` holding the focus. Both the nav row and the grid answer the
 * movement keys now, so the arrow moves the calendar and pulls real focus back to
 * a day instead of leaving the reader without a keyboard until a reopen.
 * `date-picker.test.ts` derives it from the anchor and the bounds.
 */
export const DATE_PICKER_NAV_ARROW = "2026-03-12";

/** The header a March grid paints, and the trigger's text while nothing is chosen. */
export const DATE_PICKER_MONTH_LABEL = "March 2026";
export const DATE_PICKER_PLACEHOLDER = "Pick a date";

/**
 * The labels the trigger paints for the two days the probe asserts.
 *
 * The component formats a day as `"27 March 2026"` (`formatDayLabel`); the
 * fixture restates the labels the window check names, and
 * `date-picker.test.ts` derives them again from `Intl` in UTC so a mistyped
 * month cannot pass.
 */
export const DATE_PICKER_TODAY_LABEL = "11 March 2026";
export const DATE_PICKER_CHOSEN_LABEL = "27 March 2026";

/** The focused day's `testId`, one per grid cell. */
export const datePickerCell = (iso: string): string => `date-day-${iso}`;

/**
 * The value the app holds, and how many changes it has recorded.
 *
 * `null` is the component's own public "no date" state (`DatePickerProps.value`),
 * so the fixture records what the app was handed in the API's vocabulary rather
 * than inventing a second absence.
 */
export interface DatePickerReadoutState {
  readonly value: string | null;
  readonly changes: number;
}

/** The readout a frame prints; an absent day is the word `none`, never `""`. */
export const formatDatePickerReadout = (
  state: DatePickerReadoutState,
): string => `value=${state.value ?? "none"} changes=${state.changes}`;

/** The keys the probe sends to the grid, in the fixture's order. */
export const DATE_PICKER_KEYS = [
  "right",
  "down",
  "left",
  "up",
  "home",
  "end",
] as const;

/** One key the probe sends, and the day the focus must land on. */
export type DatePickerKey = (typeof DATE_PICKER_KEYS)[number];

/** One gesture of the measured route: the key, the cell it starts on and ends on. */
export interface DatePickerRoute {
  readonly key: DatePickerKey;
  readonly from: string;
  readonly to: string;
  /** The README column's description of the gesture. */
  readonly caption: string;
}

/**
 * The measured route, on `@gpuix/native@0.11.0`.
 *
 * Arrows move a day or a week, Home/End reach the week's edges by `weekStartsOn`,
 * and a move that would leave the bounds lands on the bound instead of on an
 * unavailable day: the 29th is past `max`, so the second `down` of the last week
 * stops on the 27th, and `right` there stays put.
 */
export const DATE_PICKER_ROUTES: ReadonlyArray<DatePickerRoute> = [
  {
    key: "right",
    from: DATE_PICKER_TODAY,
    to: "2026-03-12",
    caption: "ArrowRight moves one day forward",
  },
  {
    key: "down",
    from: "2026-03-12",
    to: "2026-03-19",
    caption: "ArrowDown moves one week forward",
  },
  {
    key: "left",
    from: "2026-03-19",
    to: "2026-03-18",
    caption: "ArrowLeft moves one day back",
  },
  {
    key: "up",
    from: "2026-03-18",
    to: DATE_PICKER_TODAY,
    caption: "ArrowUp moves one week back",
  },
  {
    key: "home",
    from: DATE_PICKER_TODAY,
    to: "2026-03-09",
    caption: "Home reaches the week's first day",
  },
  {
    key: "end",
    from: "2026-03-09",
    to: "2026-03-15",
    caption: "End reaches the week's last day",
  },
  {
    key: "down",
    from: "2026-03-15",
    to: "2026-03-22",
    caption: "a week forward crosses into the next row",
  },
  {
    key: "down",
    from: "2026-03-22",
    to: DATE_PICKER_MAX,
    caption: "a week past the last bound lands on it",
  },
  {
    key: "right",
    from: DATE_PICKER_MAX,
    to: DATE_PICKER_MAX,
    caption: "a day past the last bound stays on it",
  },
];
