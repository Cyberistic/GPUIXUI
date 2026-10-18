/**
 * DatePicker: one day, chosen from a month grid in a popover.
 *
 * GPUix has no calendar primitive and no native date input, so the grid is ours
 * (`date-picker/calendar.ts`, pure `DateTime` math) and the surface is the
 * package's **Popover** — which brings the anchored layer, the dismiss stack and
 * Escape focus-return with it.
 *
 * The public value is an ISO day (`YYYY-MM-DD`), never a `DateTime` and never a
 * locale-formatted string: a stored value must not depend on the display.
 * `min`/`max` bound selection inclusively, keyboard movement clamps to them, and
 * `clearable` adds the reset to `null`; none of that rewrites a controlled value.
 *
 * The root owns the value, the bounds and the open state; `DatePickerTrigger`,
 * `DatePickerContent` and `DatePickerCalendar` are the caller's parts. The
 * calendar keeps its own view month and focused day — those reset on open and
 * are not the component's value.
 *
 * Known scope, recorded in the docs: fixed English month/day labels (no i18n
 * layer in the repo yet), no adjacent-month days in the grid, and no time: a time
 * of day is the separate TimePicker.
 */

import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import { mergeStyles, type FloatingContentProps } from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import { Match, pipe } from "effect";
import * as Arr from "effect/Array";
import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  addDays,
  addMonths,
  boundsOf,
  canBrowseMonth,
  clampToBounds,
  formatDayLabel,
  formatIsoDay,
  formatMonthLabel,
  isAvailable,
  isSameDay,
  lastDayOfMonth,
  monthGrid,
  parseIsoDay,
  startOfMonth,
  weekdayLabels,
  type DayBounds,
  type WeekStart,
} from "./date-picker/calendar.js";
import { Button, IconButton, type ButtonProps } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import {
  isActivation,
  isDown,
  isFirst,
  isLast,
  isLeft,
  isPageDown,
  isPageUp,
  isRight,
  isUp,
} from "./internal/key.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { useMergedRef } from "./internal/ref.js";
import {
  controlHeight,
  focusRing,
  textStyle,
  useTheme,
} from "./internal/theme.js";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.js";

/** The rules a date-picker part follows; throws outside a {@link DatePicker}. */
interface DatePickerContextValue {
  readonly selectedDay: Option.Option<DateTime.Utc>;
  readonly selectedIso: Option.Option<string>;
  readonly bounds: DayBounds;
  readonly weekStartsOn: WeekStart;
  readonly todayDay: DateTime.Utc;
  readonly clearable: boolean;
  readonly disabled: boolean;
  readonly open: boolean;
  readonly choose: (day: DateTime.Utc) => void;
  readonly clear: () => void;
  readonly closeToTrigger: () => void;
  readonly registerTrigger: (instance: PublicInstance | null) => void;
}

const DatePickerContext = createContext<DatePickerContextValue | undefined>(
  undefined,
);

/** The picker a part belongs to. Throws when there is none. */
const useDatePicker = (): DatePickerContextValue => {
  const value = useContext(DatePickerContext);
  if (value === undefined) {
    throw new Error("DatePicker parts must be used inside DatePicker");
  }
  return value;
};

/** {@link DatePicker} props. */
export interface DatePickerProps {
  /** The controlled ISO day, or `null` for none. `undefined` means uncontrolled. */
  readonly value?: string | null;
  readonly defaultValue?: string | null;
  readonly onValueChange?: (value: string | null) => void;
  /** Default `1` (Monday). */
  readonly weekStartsOn?: WeekStart;
  /**
   * The first selectable ISO day, inclusive. Absent or malformed means no lower
   * bound. Bounds constrain choosing; they never rewrite a controlled `value`.
   */
  readonly min?: string;
  /** The last selectable ISO day, inclusive. Absent or malformed is unbounded. */
  readonly max?: string;
  /** Show a `Clear` action in the surface while a day is selected. Default `false`. */
  readonly clearable?: boolean;
  readonly disabled?: boolean;
  /**
   * The ISO day the picker treats as today. Defaults to the runtime clock; pass
   * it when a test or a server boundary needs a fixed day.
   */
  readonly today?: string;
  readonly children?: PartChildren;
}

/** The day the picker calls today, at UTC midnight. */
const todayOf = (value: string | undefined): DateTime.Utc => {
  const parsed = Option.flatMap(Option.fromNullishOr(value), parseIsoDay);
  return Option.getOrElse(parsed, () =>
    DateTime.startOf("day")(DateTime.nowUnsafe()),
  );
};

/** The picker's state. Compose the trigger and the content inside it. */
export const DatePicker = ({
  value: valueProp,
  defaultValue,
  onValueChange,
  weekStartsOn = 1,
  min,
  max,
  clearable = false,
  disabled = false,
  today,
  children,
}: DatePickerProps) => {
  const renderer = useGpuix().renderer;
  const todayIso = today ?? DateTime.formatIsoDateUtc(DateTime.nowUnsafe());
  const todayDay = todayOf(todayIso);
  const [selected, setSelected] = useControllableState<string | null>({
    value: valueProp,
    defaultValue: defaultValue ?? null,
    onChange: onValueChange,
  });
  const selectedDay = Option.flatMap(
    Option.fromNullishOr(selected),
    parseIsoDay,
  );
  const selectedIso = Option.map(selectedDay, formatIsoDay);
  const bounds = boundsOf(min, max);
  const [open, setOpen] = useState(false);
  const trigger = useRef<PublicInstance | null>(null);

  /** Close the surface and hand focus back to the trigger. */
  const closeToTrigger = useCallback((): void => {
    setOpen(false);
    const instance = trigger.current;
    if (instance !== null) renderer?.focusElement?.(instance.id);
  }, [renderer]);

  const choose = useCallback(
    (day: DateTime.Utc): void => {
      if (!isAvailable(day, bounds)) return;
      setSelected(formatIsoDay(day));
      closeToTrigger();
    },
    [bounds, closeToTrigger, setSelected],
  );

  /** Drop the selection and close; the next open anchors on today. */
  const clear = useCallback((): void => {
    setSelected(null);
    closeToTrigger();
  }, [closeToTrigger, setSelected]);

  assertParts(datePickerRoot, children);

  return (
    <DatePickerContext.Provider
      value={{
        selectedDay,
        selectedIso,
        bounds,
        weekStartsOn,
        todayDay,
        clearable,
        disabled,
        open,
        choose,
        clear,
        closeToTrigger,
        registerTrigger: (instance) => {
          trigger.current = instance;
        },
      }}
    >
      <Popover open={open} onOpenChange={setOpen}>
        {children}
      </Popover>
    </DatePickerContext.Provider>
  );
};

/** {@link DatePickerTrigger} props. */
export interface DatePickerTriggerProps extends Omit<ButtonProps, "children"> {
  /** Default `"Pick a date"`. */
  readonly placeholder?: string;
  /** The trigger's accessible name. */
  readonly label?: string;
  /** Default `"date-picker-trigger"`. */
  readonly testId?: string;
}

/** The field-shaped trigger: the selected day or the placeholder, plus a chevron. */
export const DatePickerTrigger = ({
  placeholder = "Pick a date",
  label,
  testId = "date-picker-trigger",
  ...rest
}: DatePickerTriggerProps) => {
  const theme = useTheme();
  const { selectedDay, disabled, registerTrigger } = useDatePicker();
  const setTrigger = useMergedRef<PublicInstance | null>(
    registerTrigger,
    rest.ref,
  );
  const labelText = Option.match(selectedDay, {
    onNone: () => placeholder,
    onSome: formatDayLabel,
  });

  return (
    <PopoverTrigger
      {...rest}
      ref={setTrigger}
      testId={testId}
      disabled={disabled}
      {...(label === undefined ? {} : { "aria-label": label })}
      style={mergeStyles(
        {
          ...textStyle(theme, "label"),
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.md,
          width: 220,
          height: controlHeight(theme, "md"),
          paddingLeft: theme.spacing.md,
          paddingRight: theme.spacing.md,
          backgroundColor: theme.colors.background,
          color: Option.isNone(selectedDay)
            ? theme.colors.mutedForeground
            : theme.colors.foreground,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.borderStrong,
          borderRadius: theme.radius.md,
        },
        rest.style,
      )}
    >
      <text
        style={{
          ...textStyle(theme, "label"),
          color: Option.isNone(selectedDay)
            ? theme.colors.mutedForeground
            : theme.colors.foreground,
        }}
      >
        {labelText}
      </text>
      <Icon
        name="chevron-down"
        color={theme.colors.mutedForeground}
        size="sm"
      />
    </PopoverTrigger>
  );
};

/** {@link DatePickerContent} props: the anchored popup surface. */
export interface DatePickerContentProps extends FloatingContentProps {
  /** Default `"bottom"`. */
  readonly side?: "top" | "right" | "bottom" | "left";
  /** Default `"start"`. */
  readonly align?: "start" | "center" | "end";
  /** The gap between trigger and surface. Default `6`. */
  readonly sideOffset?: number;
  readonly children?: PartChildren;
}

/** The popup. Focus stays on the grid's day cell rather than the surface. */
export const DatePickerContent = ({
  side = "bottom",
  align = "start",
  sideOffset = 6,
  children,
  style,
  ...rest
}: DatePickerContentProps) => {
  const theme = useTheme();
  assertParts(datePickerContent, children);

  return (
    <PopoverContent
      autoFocus={false}
      side={side}
      align={align}
      sideOffset={sideOffset}
      testId="date-picker-content"
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.md,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.popover,
          color: theme.colors.popoverForeground,
          borderRadius: theme.radius.md,
          borderWidth: theme.borderWidth.thin,
          borderColor: theme.colors.border,
          pointerEvents: "auto",
        },
        style,
      )}
    >
      {children}
    </PopoverContent>
  );
};

const CELL = 34;

/** {@link DatePickerCalendar} props. */
export interface DatePickerCalendarProps {
  /** The grid's accessible name. Default `"Calendar"`. */
  readonly label?: string;
}

/** The month navigation, the weekday header and the day grid. */
export const DatePickerCalendar = ({
  label = "Calendar",
}: DatePickerCalendarProps) => {
  const theme = useTheme();
  const renderer = useGpuix().renderer;
  const {
    selectedDay,
    selectedIso,
    bounds,
    weekStartsOn,
    todayDay,
    clearable,
    open,
    choose,
    clear,
  } = useDatePicker();

  /**
   * Where an open with no active day lands: the selection, else today, clamped to
   * the bounds. The focus effect uses it too, because the open effect's state has
   * not rendered in the commit that effect runs in (plan 368).
   */
  const anchor = clampToBounds(
    Option.getOrElse(selectedDay, () => todayDay),
    bounds,
  );
  const [viewMonth, setViewMonth] = useState<DateTime.Utc>(() =>
    startOfMonth(anchor),
  );
  const [active, setActive] = useState<Option.Option<DateTime.Utc>>(() =>
    Option.some(anchor),
  );
  const cellIds = useRef<Record<string, number>>({});
  const pendingFocus = useRef(false);
  const wasOpen = useRef(false);

  /** Focus the active cell after the month it lives in has rendered. */
  const focusActive = useCallback((day: DateTime.Utc) => {
    pendingFocus.current = true;
    setViewMonth(startOfMonth(day));
    setActive(Option.some(day));
  }, []);

  useLayoutEffect(() => {
    if (!open || wasOpen.current) {
      wasOpen.current = open;
      return;
    }
    wasOpen.current = true;
    setViewMonth(startOfMonth(anchor));
    setActive(Option.some(anchor));
    pendingFocus.current = true;
    // `open` is the trigger; the anchor is stable while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    Option.getOrNull(selectedIso),
    DateTime.formatIsoDateUtc(todayDay),
  ]);

  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    const day = Option.getOrElse(active, () => anchor);
    const id = cellIds.current[formatIsoDay(day)];
    if (id === undefined) return;
    pendingFocus.current = false;
    renderer?.focusElement?.(id);
  });

  const attachCell = (iso: string) => (instance: PublicInstance | null) => {
    if (instance === null) {
      delete cellIds.current[iso];
      return;
    }
    cellIds.current[iso] = instance.id;
  };

  const moveDays = (delta: number): void => {
    const from = Option.getOrElse(active, () => startOfMonth(viewMonth));
    focusActive(clampToBounds(addDays(from, delta), bounds));
  };

  const moveToWeekEdge = (edge: "first" | "last"): void => {
    const from = Option.getOrElse(active, () => startOfMonth(viewMonth));
    const parts = DateTime.toPartsUtc(from);
    const offset = (parts.weekDay - weekStartsOn + 7) % 7;
    focusActive(
      clampToBounds(
        addDays(from, edge === "first" ? -offset : 6 - offset),
        bounds,
      ),
    );
  };

  const moveMonths = (delta: number): void => {
    const from = Option.getOrElse(active, () => startOfMonth(viewMonth));
    const parts = DateTime.toPartsUtc(from);
    const target = addMonths(from, delta);
    const lastDay = DateTime.toPartsUtc(lastDayOfMonth(target)).day;
    const day = Math.min(parts.day, lastDay);
    focusActive(clampToBounds(addDays(startOfMonth(target), day - 1), bounds));
  };

  const handleKeyDown = (event: EventPayload): void => {
    Match.value(event).pipe(
      Match.when(isLeft, () => moveDays(-1)),
      Match.when(isRight, () => moveDays(1)),
      Match.when(isUp, () => moveDays(-7)),
      Match.when(isDown, () => moveDays(7)),
      Match.when(isFirst, () => moveToWeekEdge("first")),
      Match.when(isLast, () => moveToWeekEdge("last")),
      Match.when(isPageUp, () => moveMonths(-1)),
      Match.when(isPageDown, () => moveMonths(1)),
      Match.when(isActivation, () => {
        pipe(
          active,
          Option.match({
            onNone: () => undefined,
            onSome: choose,
          }),
        );
      }),
      Match.orElse(() => undefined),
    );
  };

  const grid = monthGrid(viewMonth, weekStartsOn);
  const tabbable = clampToBounds(
    Option.getOrElse(
      Option.filter(active, (day) => isSameDay(startOfMonth(day), viewMonth)),
      () => startOfMonth(viewMonth),
    ),
    bounds,
  );

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.spacing.md,
        }}
      >
        <IconButton
          label="Previous month"
          size="sm"
          testId="date-prev"
          disabled={!canBrowseMonth(viewMonth, -1, bounds)}
          onClick={() => setViewMonth(addMonths(viewMonth, -1))}
        >
          <Icon
            name="chevron-left"
            color={theme.colors.mutedForeground}
            size="sm"
          />
        </IconButton>
        <text
          testId="date-month"
          style={{
            ...textStyle(theme, "label"),
            color: theme.colors.foreground,
          }}
        >
          {formatMonthLabel(viewMonth)}
        </text>
        <IconButton
          label="Next month"
          size="sm"
          testId="date-next"
          disabled={!canBrowseMonth(viewMonth, 1, bounds)}
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
        >
          <Icon
            name="chevron-right"
            color={theme.colors.mutedForeground}
            size="sm"
          />
        </IconButton>
      </div>
      <div
        role="grid"
        aria-label={label}
        onKeyDown={handleKeyDown}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing["2xs"],
        }}
      >
        <div role="row" style={{ display: "flex", flexDirection: "row" }}>
          {Arr.map(weekdayLabels(weekStartsOn), (name) => (
            <text
              key={name}
              aria-label={name}
              style={{
                ...textStyle(theme, "caption"),
                width: CELL,
                textAlign: "center",
                color: theme.colors.mutedForeground,
              }}
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
                  <div key={dayIndex} style={{ width: CELL, height: CELL }} />
                ),
                onSome: (day) => {
                  const iso = formatIsoDay(day);
                  const available = isAvailable(day, bounds);
                  const isSelected = Option.contains(selectedIso, iso);
                  const isToday = isSameDay(day, todayDay);
                  return (
                    <div
                      key={iso}
                      role="gridcell"
                      aria-label={
                        available
                          ? formatDayLabel(day)
                          : `${formatDayLabel(day)}, unavailable`
                      }
                      aria-selected={isSelected}
                      tabIndex={iso === formatIsoDay(tabbable) ? 0 : -1}
                      ref={attachCell(iso)}
                      testId={`date-day-${iso}`}
                      onClick={available ? () => choose(day) : undefined}
                      onFocus={() => setActive(Option.some(day))}
                      style={{
                        ...textStyle(theme, "caption"),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: CELL,
                        height: CELL,
                        borderRadius: theme.radius.sm,
                        backgroundColor: isSelected
                          ? theme.colors.primary
                          : undefined,
                        color: isSelected
                          ? theme.colors.primaryForeground
                          : available
                            ? theme.colors.foreground
                            : theme.colors.mutedForeground,
                        borderWidth: isToday
                          ? theme.borderWidth.thin
                          : undefined,
                        borderColor: isToday ? theme.colors.primary : undefined,
                        cursor: available ? "pointer" : "not-allowed",
                        hover:
                          isSelected || !available
                            ? undefined
                            : { backgroundColor: theme.colors.hover },
                        ...(iso ===
                        formatIsoDay(Option.getOrElse(active, () => tabbable))
                          ? focusRing(theme)
                          : {}),
                      }}
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
      {clearable && Option.isSome(selectedDay) ? (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="ghost" size="sm" testId="date-clear" onClick={clear}>
            Clear
          </Button>
        </div>
      ) : null}
    </>
  );
};

/** Every part of DatePicker, so a misplaced sibling is named. */
const datePickerParts: ReadonlyArray<PartComponent> = [
  DatePicker,
  DatePickerTrigger,
  DatePickerContent,
  DatePickerCalendar,
];

const datePickerRoot: PartsContract = {
  parent: "DatePicker",
  family: datePickerParts,
  accepts: [DatePickerTrigger, DatePickerContent],
  hint: "Put DatePickerTrigger and DatePickerContent directly inside DatePicker.",
};

const datePickerContent: PartsContract = {
  parent: "DatePickerContent",
  family: datePickerParts,
  accepts: [DatePickerCalendar],
  hint: "Put DatePickerCalendar directly inside DatePickerContent.",
};

/** Inventory record, mirrored into `COMPONENTS.md` (plan 117 §2). */
export const datePickerMeta = {
  name: "Date pickers",
  tier: 2,
  status: "done",
  gpuixSupport: "partial",
  limitations: [
    "day and month labels are fixed English strings: the repo has no i18n layer",
    "the grid shows only the current month; adjacent-month days are blank",
    "time is a separate TimePicker: this control owns one day only",
    "0.10.0 has no aria-current, so today is marked by a border only",
    "0.10.0 has no aria-disabled: an unavailable day leaves the tab order and its accessible name ends in ', unavailable'",
    "a min after max makes no day selectable; the grid is visible and inert rather than throwing from render",
  ],
  docs: "docs/date-picker.mdx",
  example: "examples/date-picker.example.tsx",
  testFile: "src/behaviour/date-picker.test.tsx",
} as const;
