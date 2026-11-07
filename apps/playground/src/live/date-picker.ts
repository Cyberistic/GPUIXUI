export const DATE_PICKER_PROBE = "date-picker-probe";
export const DATE_PICKER_TRIGGER = "date-picker-trigger";
export const DATE_PICKER_AFTER = "date-picker-after";

export const DATE_PICKER_EMPTY_TRIGGER = "date-picker-empty-trigger";

export const DATE_PICKER_CONTENT = "date-picker-content";
export const DATE_PICKER_MONTH = "date-month";
export const DATE_PICKER_NEXT = "date-next";
export const DATE_PICKER_CLEAR = "date-clear";

export const DATE_PICKER_READOUT = "date-picker-readout";

export const DATE_PICKER_TODAY = "2026-03-11";
export const DATE_PICKER_MIN = "2026-03-02";
export const DATE_PICKER_MAX = "2026-03-27";
export const DATE_PICKER_UNAVAILABLE = "2026-03-30";

export const DATE_PICKER_NAV_ARROW = "2026-03-12";

export const DATE_PICKER_MONTH_LABEL = "March 2026";
export const DATE_PICKER_PLACEHOLDER = "Pick a date";

export const DATE_PICKER_TODAY_LABEL = "Mar 11, 2026";
export const DATE_PICKER_CHOSEN_LABEL = "Mar 27, 2026";

export const datePickerCell = (iso: string): string => `date-day-${iso}`;

export interface DatePickerReadoutState {
  readonly value: string | null;
  readonly changes: number;
}

export const formatDatePickerReadout = (
  state: DatePickerReadoutState,
): string => `value=${state.value ?? "none"} changes=${state.changes}`;

export const DATE_PICKER_KEYS = [
  "right",
  "down",
  "left",
  "up",
  "home",
  "end",
] as const;

export type DatePickerKey = (typeof DATE_PICKER_KEYS)[number];

export interface DatePickerRoute {
  readonly key: DatePickerKey;
  readonly from: string;
  readonly to: string;

  readonly caption: string;
}

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
