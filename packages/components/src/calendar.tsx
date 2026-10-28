/** @jsxImportSource @gpuix/react */
/**
 * Calendar: a month grid with one roving tab stop, painted from theme roles.
 *
 * GPUix has no calendar primitive, so the grid and its arithmetic are this
 * package's (`calendar/logic.ts`, pure `DateTime`; `calendar/store.ts`, the view
 * month and the focused day). The public value is always an ISO day
 * (`YYYY-MM-DD`), never a `DateTime` and never a locale-formatted string: a
 * stored value must not depend on the display.
 *
 * `react-day-picker` gives shadcn three selection modes, and the same three are
 * modelled here as a discriminated union, so `selected` and `onSelect` cannot
 * disagree about the mode. A span is `{ from, to }` with `to` absent until the
 * second day is chosen; a completed span starts a new one on the next press.
 *
 * Known scope, recorded in the docs: fixed English labels (no i18n layer), no
 * time (a time of day is the separate TimePicker), no week numbers, and the
 * runtime's closed `aria-*` set (no `aria-current`, no live region).
 */

import type { KeyEvent, StyleDesc } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { Select, type SelectOption } from "@gpuixui/primitives/select";
import {
  CALENDAR_DAY,
  CALENDAR_GRID,
  CALENDAR_MONTH,
  CALENDAR_MONTH_LABEL,
  CALENDAR_ROOT,
  CALENDAR_WEEKDAY,
  cn,
} from "@gpuixui/tw";
import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";
import { useLayoutEffect, useRef } from "react";
import {
  addMonths,
  boundsOfMatchers,
  calendarLabel,
  canBrowseMonth,
  clampToBounds,
  dayAriaLabel,
  dayInMonth,
  formatIsoDay,
  formatMonthLabel,
  isDayAvailable,
  isPainted,
  isSameDay,
  moveDay,
  moveKeyOf,
  monthGrid,
  monthShortName,
  monthWindow,
  nextDay,
  nextRange,
  paintOf,
  parseIsoDay,
  startOfMonth,
  todayUtc,
  toggleDay,
  unbounded,
  visibleMonth,
  weekdayLabels,
  yearRange,
  type CalendarMode,
  type CaptionLayout,
  type DayMatchers,
  type DayRange,
  type MonthCount,
  type Selection,
  type WeekStart,
} from "./calendar/logic.js";
import { makeCalendarStore } from "./calendar/store.js";
import { IconButton } from "./internal/button.js";
import { Icon } from "@gpuixui/icons";
import { isActivation, isDismiss, swallowsDefault } from "./internal/key.js";
import { send, useLocalState, useLocalStore } from "./internal/local-state.js";
import { recipeStyle } from "./internal/recipe.js";
import { mergeStyles } from "@gpuix/react/floating";
import {
  controlRing,
  disabledOpacity,
  useTheme,
  type Theme,
} from "./internal/theme.js";

/** The measured day square, in pixels. Kept out of the recipe (see the tw doc). */
const CELL = 34;

/** The earliest year the default window offers: 1900, a human's whole life. */
const DEFAULT_FROM_YEAR = 1900;

/** How far past today the default window reaches. */
const DEFAULT_YEARS_AHEAD = 100;

/** The props every mode shares. */
export interface CalendarBaseProps {
  /** How many months are painted side by side. Default `1`. */
  readonly numberOfMonths?: MonthCount;
  /** Paint the leading and trailing days of the neighbouring months. Default `true`. */
  readonly showOutsideDays?: boolean;
  /** Default `"label"`: a caption, or month and year dropdowns. */
  readonly captionLayout?: CaptionLayout;
  /** Default `1` (Monday). */
  readonly weekStartsOn?: WeekStart;
  /** The earliest year a dropdown or a `Shift`+Page jump may reach. */
  readonly fromYear?: number;
  /** The latest year a dropdown or a `Shift`+Page jump may reach. */
  readonly toYear?: number;
  /** The days the calendar refuses and, through `before`/`after`, its span. */
  readonly disabled?: DayMatchers;
  /**
   * The ISO day the grid marks as today. Defaults to the runtime clock; pass it
   * when a test or a server boundary needs a fixed day.
   */
  readonly today?: string;
  /** The ISO day whose month the grid opens on. Defaults to the selected day or today. */
  readonly defaultMonth?: string;
  /** Take focus on mount, for a calendar that opens inside a popover. */
  readonly autoFocus?: boolean;
  /** The grid's accessible name. Default `"Calendar"`. */
  readonly label?: string;
  /** Named by `Escape`; a popover passes its close. */
  readonly onDismiss?: () => void;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
}

/** One day at a time; pressing the chosen day clears it. */
export interface SingleCalendarProps extends CalendarBaseProps {
  readonly mode?: "single";
  readonly selected?: string | null;
  readonly onSelect?: (day: string | null) => void;
}

/** Any number of days; a press toggles the day. */
export interface MultipleCalendarProps extends CalendarBaseProps {
  readonly mode: "multiple";
  readonly selected?: ReadonlyArray<string>;
  readonly onSelect?: (days: ReadonlyArray<string>) => void;
}

/** A span; `to` is absent until the second day is chosen. */
export interface RangeCalendarProps extends CalendarBaseProps {
  readonly mode: "range";
  readonly selected?: DayRange | null;
  readonly onSelect?: (range: DayRange | null) => void;
}

/** {@link Calendar} props, one variant per selection mode. */
export type CalendarProps =
  | SingleCalendarProps
  | MultipleCalendarProps
  | RangeCalendarProps;

/** How the caller's props read as one selection and one press handler. */
interface SelectionAdapter {
  readonly selection: Selection;
  readonly select: (day: string) => void;
}

/**
 * The mode's own selection and press handler.
 *
 * The union is narrowed once, here, so the component body speaks one shape and
 * a press can never report the wrong variant's value.
 */
const adapterOf = (props: CalendarProps): SelectionAdapter => {
  if (props.mode === "range") {
    const range = props.selected ?? null;
    return {
      selection: { mode: "range", range },
      select: (day) => props.onSelect?.(nextRange(range, day)),
    };
  }
  if (props.mode === "multiple") {
    const days = props.selected ?? [];
    return {
      selection: { mode: "multiple", days },
      select: (day) => props.onSelect?.(toggleDay(days, day)),
    };
  }
  const day = props.selected ?? null;
  return {
    selection: { mode: "single", day },
    select: (next) => props.onSelect?.(nextDay(day, next)),
  };
};

/** The day the calendar opens on: the selection's first day, else today. */
const anchorOf = (selection: Selection, today: DateTime.Utc): DateTime.Utc =>
  pipe(
    Match.value(selection).pipe(
      Match.when({ mode: "single" }, (current) =>
        Option.flatMap(Option.fromNullishOr(current.day), parseIsoDay),
      ),
      Match.when({ mode: "multiple" }, (current) =>
        Option.flatMap(Arr.head(current.days), parseIsoDay),
      ),
      Match.when({ mode: "range" }, (current) =>
        Option.flatMap(Option.fromNullishOr(current.range?.from), parseIsoDay),
      ),
      Match.exhaustive,
    ),
    Option.getOrElse(() => today),
  );

/** The month index a dropdown names, `1`–`12`. */
const monthIndexOf = (value: DateTime.Utc): string =>
  String(DateTime.toPartsUtc(value).month);

/**
 * The caption row: two dropdowns that jump the view, or the month's name.
 *
 * `react-day-picker` treats a dropdown caption as a jump control and keeps the
 * focus inside the grid; the primitives' `Select` is the package's one list
 * control, so the jump is that control rather than a second overlay.
 */
const Caption = ({
  month,
  layout,
  months,
  years,
  onMonth,
  onYear,
  testId,
}: {
  readonly month: DateTime.Utc;
  readonly layout: CaptionLayout;
  readonly months: ReadonlyArray<SelectOption>;
  readonly years: ReadonlyArray<SelectOption>;
  readonly onMonth: (month: number) => void;
  readonly onYear: (year: number) => void;
  readonly testId: string;
}) => {
  const theme = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.xs,
        minHeight: CELL,
      }}
    >
      {layout === "dropdown" ? (
        <>
          <Select
            label="Month"
            options={months}
            value={monthIndexOf(month)}
            onValueChange={(next) => onMonth(Number(next))}
            triggerTestId={`${testId}-select`}
            itemTestId={(value) => `${testId}-month-${value}`}
            size="sm"
          />
          <Select
            label="Year"
            options={years}
            value={String(DateTime.toPartsUtc(month).year)}
            onValueChange={(next) => onYear(Number(next))}
            triggerTestId={`${testId}-year`}
            itemTestId={(value) => `${testId}-year-${value}`}
            size="sm"
          />
        </>
      ) : (
        <text testId={testId} style={recipeStyle(CALENDAR_MONTH_LABEL, theme)}>
          {formatMonthLabel(month)}
        </text>
      )}
    </div>
  );
};

/** Whether a paint fills the cell with the primary role. */
const cellStyle = (
  theme: Theme,
  paint: ReturnType<typeof paintOf>,
  outside: boolean,
  today: boolean,
  available: boolean,
): StyleDesc => ({
  width: CELL,
  height: CELL,
  backgroundColor: isPainted(paint)
    ? theme.colors.primary
    : paint === "range-middle"
      ? theme.colors.muted
      : undefined,
  color: isPainted(paint)
    ? theme.colors.primaryForeground
    : paint === "range-middle"
      ? theme.colors.foreground
      : available
        ? outside
          ? theme.colors.mutedForeground
          : theme.colors.foreground
        : theme.colors.mutedForeground,
  borderWidth: today && !isPainted(paint) ? theme.borderWidth.thin : undefined,
  borderColor: today ? theme.colors.primary : undefined,
  cursor: available ? "pointer" : "not-allowed",
  opacity: available ? undefined : disabledOpacity,
  hover:
    isPainted(paint) || !available
      ? undefined
      : { backgroundColor: theme.colors.hover },
  ...controlRing(theme, { disabled: !available }),
});

/** {@link Calendar}. */
export const Calendar = (props: CalendarProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const {
    numberOfMonths = 1,
    showOutsideDays = true,
    captionLayout = "label",
    weekStartsOn = 1,
    label = "Calendar",
    autoFocus = false,
    onDismiss,
  } = props;
  const today = pipe(
    Option.flatMap(Option.fromNullishOr(props.today), parseIsoDay),
    Option.getOrElse(() => todayUtc(DateTime.nowUnsafe())),
  );
  const bounds = Option.match(Option.fromNullishOr(props.disabled), {
    onNone: () => unbounded,
    onSome: boundsOfMatchers,
  });
  const adapter = adapterOf(props);
  const { selection, select } = adapter;
  const anchor = clampToBounds(anchorOf(selection, today), bounds);
  const initialMonth = pipe(
    Option.flatMap(Option.fromNullishOr(props.defaultMonth), parseIsoDay),
    Option.getOrElse(() => startOfMonth(anchor)),
  );
  const store = useLocalStore(
    makeCalendarStore({
      month: visibleMonth(startOfMonth(initialMonth), numberOfMonths, anchor),
      focus: anchor,
      count: numberOfMonths,
      pending: autoFocus,
    }),
  );
  const view = useLocalState(store.local);
  const cells = useRef<Record<string, number>>({});
  const months = monthWindow(view.month, numberOfMonths);
  const year = DateTime.toPartsUtc(today).year;
  // A calendar is not limited to the decade it is looked at in: the default
  // window is a century back — a birthday, a hire date, an invoice — and a
  // century forward, narrowed only by the caller's own bound. Read raw, the
  // ±10 window refused 1994 and put no year before it in the dropdown.
  const fromYear =
    props.fromYear ??
    Math.max(
      DEFAULT_FROM_YEAR,
      Option.match(bounds.min, {
        onNone: () => Number.NEGATIVE_INFINITY,
        onSome: (min) => DateTime.toPartsUtc(min).year,
      }),
    );
  const toYear =
    props.toYear ??
    Math.min(
      year + DEFAULT_YEARS_AHEAD,
      Option.match(bounds.max, {
        onNone: () => Number.POSITIVE_INFINITY,
        onSome: (max) => DateTime.toPartsUtc(max).year,
      }),
    );

  const monthFocus = (month: DateTime.Utc): DateTime.Utc =>
    clampToBounds(dayInMonth(view.focus, month), bounds);

  // The focus the store asked for lands here, once the cell exists. It is the
  // same commit that painted the month: a React state write inside the effect is
  // not visible to it, which is why the target travels in the store.
  useLayoutEffect(() => {
    if (!view.pending) return;
    send(store.settle);
    const panel = Arr.findFirstIndex(months, (month) =>
      isSameDay(startOfMonth(month), startOfMonth(view.focus)),
    );
    const key = `${Option.getOrElse(panel, () => 0)}-${formatIsoDay(view.focus)}`;
    const id = cells.current[key];
    if (id !== undefined) renderer?.focusElement?.(id);
  }, [view, months, renderer, store]);

  const movement = (event: KeyEvent): void => {
    if (swallowsDefault(event, "down")) event.preventDefault();
    if (isDismiss(event) && onDismiss !== undefined) {
      onDismiss();
      return;
    }
    pipe(
      moveKeyOf(event.key ?? ""),
      Option.match({
        onNone: () => undefined,
        onSome: (key) => {
          event.preventDefault();
          send(
            store.focusDay(
              clampToBounds(
                moveDay(
                  view.focus,
                  { key, year: event.modifiers?.shift === true },
                  {
                    weekStartsOn,
                    viewMonth: view.month,
                    months: numberOfMonths,
                    showOutsideDays,
                    bounds,
                    matchers: props.disabled,
                    fromYear,
                    toYear,
                  },
                ),
                bounds,
              ),
            ),
          );
        },
      }),
    );
  };

  const page = (direction: -1 | 1): void => {
    const next = addMonths(view.month, direction);
    send(store.show(next, monthFocus(next)));
  };

  const monthOptions: ReadonlyArray<SelectOption> = Arr.map(
    Arr.range(1, 12),
    (index) => ({ value: String(index), label: monthShortName(index) }),
  );
  const yearOptions: ReadonlyArray<SelectOption> = Arr.map(
    yearRange(fromYear, toYear),
    (year) => ({ value: String(year), label: String(year) }),
  );

  return (
    <div
      data-calendar=""
      aria-label={calendarLabel(label, selection)}
      role="group"
      onKeyDown={movement}
      style={mergeStyles(
        recipeStyle(cn(CALENDAR_ROOT, props.className), theme),
        {
          gap: theme.spacing.md,
        },
      )}
    >
      {Arr.map(months, (month, index) => {
        const grid = monthGrid(month, weekStartsOn, showOutsideDays);
        return (
          <div
            key={formatIsoDay(month)}
            style={recipeStyle(CALENDAR_MONTH, theme)}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: theme.spacing.xs,
              }}
            >
              {index === 0 ? (
                <IconButton
                  label="Previous month"
                  size="sm"
                  testId="date-prev"
                  disabled={!canBrowseMonth(month, -1, bounds)}
                  onClick={() => page(-1)}
                >
                  <Icon
                    name="chevron-left"
                    size="md"
                    color={theme.colors.foreground}
                  />
                </IconButton>
              ) : (
                <div style={{ width: CELL }} />
              )}
              <Caption
                month={month}
                layout={captionLayout}
                months={monthOptions}
                years={yearOptions}
                testId={index === 0 ? "date-month" : `date-month-${index}`}
                onMonth={(next) => {
                  const target = addMonths(
                    startOfMonth(month),
                    next - DateTime.toPartsUtc(month).month,
                  );
                  send(store.show(target, monthFocus(target)));
                }}
                onYear={(year) => {
                  const target = addMonths(
                    startOfMonth(month),
                    (year - DateTime.toPartsUtc(month).year) * 12,
                  );
                  send(store.show(target, monthFocus(target)));
                }}
              />
              {index === numberOfMonths - 1 ? (
                <IconButton
                  label="Next month"
                  size="sm"
                  testId="date-next"
                  disabled={!canBrowseMonth(month, 1, bounds)}
                  onClick={() => page(1)}
                >
                  <Icon
                    name="chevron-right"
                    size="md"
                    color={theme.colors.foreground}
                  />
                </IconButton>
              ) : (
                <div style={{ width: CELL }} />
              )}
            </div>
            <div
              role="grid"
              aria-label={calendarLabel(
                `${label}, ${formatMonthLabel(month)}`,
                selection,
              )}
              style={recipeStyle(CALENDAR_GRID, theme)}
            >
              <div role="row" style={{ display: "flex", flexDirection: "row" }}>
                {Arr.map(weekdayLabels(weekStartsOn), (name) => (
                  <text
                    key={name}
                    role="columnheader"
                    aria-label={name}
                    style={mergeStyles(recipeStyle(CALENDAR_WEEKDAY, theme), {
                      width: CELL,
                    })}
                  >
                    {name}
                  </text>
                ))}
              </div>
              {Arr.map(grid, (week, weekIndex) => (
                <div
                  key={weekIndex}
                  role="row"
                  style={{ display: "flex", flexDirection: "row" }}
                >
                  {Arr.map(week, (cell, dayIndex) =>
                    Option.match(cell, {
                      onNone: () => (
                        <div
                          key={dayIndex}
                          style={{ width: CELL, height: CELL }}
                        />
                      ),
                      onSome: (day) => {
                        const iso = formatIsoDay(day);
                        const available = isDayAvailable(
                          day,
                          bounds,
                          props.disabled,
                        );
                        const paint = paintOf(selection, iso);
                        const focused = isSameDay(day, view.focus);
                        const panel = Arr.findFirstIndex(months, (entry) =>
                          isSameDay(startOfMonth(entry), startOfMonth(day)),
                        );
                        const tabbable =
                          focused && Option.getOrElse(panel, () => 0) === index;
                        return (
                          <div
                            key={`${index}-${iso}`}
                            role="gridcell"
                            aria-label={dayAriaLabel(day, paint, available)}
                            aria-selected={paint !== "none"}
                            tabIndex={tabbable ? 0 : -1}
                            ref={(instance) => {
                              const key = `${index}-${iso}`;
                              if (instance === null) delete cells.current[key];
                              else cells.current[key] = instance.id;
                            }}
                            testId={`date-day-${iso}`}
                            onClick={
                              available
                                ? () => {
                                    select(iso);
                                    send(store.visited(day));
                                  }
                                : undefined
                            }
                            onFocus={() => send(store.visited(day))}
                            onKeyDown={(event: KeyEvent) => {
                              if (swallowsDefault(event, "down"))
                                event.preventDefault();
                              if (available && isActivation(event, "down"))
                                select(iso);
                            }}
                            onKeyUp={(event: KeyEvent) => {
                              if (available && isActivation(event, "up"))
                                select(iso);
                            }}
                            style={mergeStyles(
                              recipeStyle(CALENDAR_DAY, theme),
                              cellStyle(
                                theme,
                                paint,
                                !isSameDay(startOfMonth(day), month),
                                isSameDay(day, today),
                                available,
                              ),
                            )}
                          >
                            {DateTime.toPartsUtc(day).day}
                          </div>
                        );
                      },
                    }),
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** The mode a calendar runs in, for a caller that keeps it as data. */
export type { CalendarMode };

/** Inventory record, mirrored into `COMPONENTS.md`. */
export const calendarMeta = {
  name: "Calendar",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "day, month and weekday labels are fixed English strings: the repo has no i18n layer",
    "0.11.0 has no aria-current, so today is marked by a border only",
    "0.11.0 has no aria-disabled and no live region: an unavailable day leaves the tab order, and a selection change is announced by the focused cell's name rather than a live region",
    "no week numbers and no time of day: a time is the separate TimePicker",
  ],
  docs: "docs/calendar.mdx",
  example: "examples/calendar.example.tsx",
  testFile: "src/behaviour/calendar.test.tsx",
} as const;
