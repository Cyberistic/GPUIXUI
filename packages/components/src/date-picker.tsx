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
 * calendar keeps its own view month, focused day and whether it shows the day
 * grid or the month chooser — those reset on open and are not the component's
 * value.
 *
 * Known scope, recorded in the docs: display labels default to English and are
 * the caller's (`labels`), never a locale lookup; the month chooser shows one
 * year at a time; no time of day is in this control — that is the separate
 * TimePicker.
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
  canBrowseYear,
  clampToBounds,
  dayInMonth,
  formatDayLabel,
  formatIsoDay,
  formatMonthLabel,
  formatYearLabel,
  isAvailable,
  isMonthAvailable,
  isSameDay,
  lastDayOfMonth,
  monthGrid,
  nearestAvailableMonth,
  parseIsoDay,
  resolveCalendarLabels,
  startOfMonth,
  startOfYear,
  stepMonth,
  tabStopOf,
  weekdayLabels,
  type CalendarLabels,
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
import { stateDescription } from "./internal/state-description.js";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.js";

/** The rules a date-picker part follows; throws outside a {@link DatePicker}. */
interface DatePickerContextValue {
  readonly selectedDay: Option.Option<DateTime.Utc>;
  readonly selectedIso: Option.Option<string>;
  readonly bounds: DayBounds;
  readonly weekStartsOn: WeekStart;
  readonly labels: CalendarLabels;
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
  /** The controlled open state. `undefined` means uncontrolled. */
  readonly open?: boolean;
  /** The uncontrolled starting state. Default `false`. */
  readonly defaultOpen?: boolean;
  /** Called with every open or close request, in both modes. */
  readonly onOpenChange?: (open: boolean) => void;
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
  /**
   * Display strings the calendar paints: month names, weekday headings, the
   * unavailable suffix and the three control names. The defaults are English.
   * This is not a locale — the component performs no lookup — so pass the
   * entries from your own catalogue. Partial: every omitted field keeps its
   * default.
   */
  readonly labels?: Partial<CalendarLabels>;
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
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  weekStartsOn = 1,
  min,
  max,
  clearable = false,
  disabled = false,
  today,
  labels,
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
  const calendarLabels = resolveCalendarLabels(labels);
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const trigger = useRef<PublicInstance | null>(null);
  const restoreFocus = useRef(false);
  const wasOpen = useRef(open);

  // A controlled close the caller refuses must not yank focus out of a surface
  // that is still painted, so the trigger is focused when the close is accepted.
  useLayoutEffect(() => {
    if (wasOpen.current && !open && restoreFocus.current) {
      const instance = trigger.current;
      if (instance !== null) renderer?.focusElement?.(instance.id);
    }
    if (!open) restoreFocus.current = false;
    wasOpen.current = open;
  }, [open, renderer]);

  /** Request a close; focus returns to the trigger when it is accepted. */
  const closeToTrigger = useCallback((): void => {
    restoreFocus.current = true;
    setOpen(false);
  }, [setOpen]);

  const choose = useCallback(
    (day: DateTime.Utc): void => {
      // A disabled control never changes its value, however it was opened.
      if (disabled || !isAvailable(day, bounds)) return;
      setSelected(formatIsoDay(day));
      closeToTrigger();
    },
    [bounds, closeToTrigger, disabled, setSelected],
  );

  /** Drop the selection and close; the next open anchors on today. */
  const clear = useCallback((): void => {
    if (disabled) return;
    setSelected(null);
    closeToTrigger();
  }, [closeToTrigger, disabled, setSelected]);

  assertParts(datePickerRoot, children);

  return (
    <DatePickerContext.Provider
      value={{
        selectedDay,
        selectedIso,
        bounds,
        weekStartsOn,
        labels: calendarLabels,
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
  const { selectedDay, disabled, labels, registerTrigger } = useDatePicker();
  const setTrigger = useMergedRef<PublicInstance | null>(
    registerTrigger,
    rest.ref,
  );
  const labelText = Option.match(selectedDay, {
    onNone: () => placeholder,
    onSome: (day) => formatDayLabel(day, labels),
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
    labels,
    todayDay,
    clearable,
    disabled,
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
  const [mode, setMode] = useState<"days" | "months">("days");
  const [monthFocus, setMonthFocus] = useState(0);
  const cellIds = useRef<Record<string, number>>({});
  const monthIds = useRef<Record<number, number>>({});
  const pendingFocus = useRef(false);
  const pendingMonthFocus = useRef(false);
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
    // An inert surface takes no focus: a caller-forced open of a disabled
    // picker must not pull the keyboard into a calendar it cannot operate.
    if (disabled) return;
    setViewMonth(startOfMonth(anchor));
    setActive(Option.some(anchor));
    setMode("days");
    pendingFocus.current = true;
    // `open` is the trigger; the anchor is stable while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    disabled,
    Option.getOrNull(selectedIso),
    DateTime.formatIsoDateUtc(todayDay),
  ]);

  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    // A day that cannot be chosen must not take focus: with an empty range the
    // open leaves the keyboard where the user left it (plan 773).
    const day = Option.filter(
      Option.orElse(active, () => tabbable),
      (value) => isAvailable(value, bounds),
    );
    if (Option.isNone(day)) {
      pendingFocus.current = false;
      return;
    }
    const id = cellIds.current[formatIsoDay(day.value)];
    if (id === undefined) return;
    pendingFocus.current = false;
    renderer?.focusElement?.(id);
  });

  useLayoutEffect(() => {
    if (!pendingMonthFocus.current) return;
    // The chooser cannot offer a month the range excludes.
    if (availableMonths[monthFocus] !== true) {
      pendingMonthFocus.current = false;
      return;
    }
    const id = monthIds.current[monthFocus];
    if (id === undefined) return;
    pendingMonthFocus.current = false;
    renderer?.focusElement?.(id);
  });

  const attachCell = (iso: string) => (instance: PublicInstance | null) => {
    if (instance === null) {
      delete cellIds.current[iso];
      return;
    }
    cellIds.current[iso] = instance.id;
  };

  const attachMonth = (index: number) => (instance: PublicInstance | null) => {
    if (instance === null) {
      delete monthIds.current[index];
      return;
    }
    monthIds.current[index] = instance.id;
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

  /** The month at a chooser index; the range is always 0–11. */
  const monthAt = (index: number): DateTime.Utc =>
    addMonths(startOfYear(viewMonth), index);
  const availableMonths = Arr.map(Arr.range(0, 11), (index) =>
    isMonthAvailable(monthAt(index), bounds),
  );
  /** A reversed range leaves no month to choose, so the chooser is unreachable. */
  const hasAvailableMonth = Arr.some(availableMonths, (value) => value);
  const viewMonthIndex = DateTime.toPartsUtc(viewMonth).month - 1;

  /** Point the chooser at the viewed month and focus it once it has rendered. */
  const openMonths = (): void => {
    if (disabled) return;
    setMonthFocus(nearestAvailableMonth(viewMonthIndex, availableMonths));
    pendingMonthFocus.current = true;
    setMode("months");
  };

  /** A chooser choice moves the view and the focused day, never the value. */
  const chooseMonth = (index: number): void => {
    if (availableMonths[index] !== true) return;
    const from = Option.getOrElse(active, () => startOfMonth(viewMonth));
    focusActive(dayInMonth(from, monthAt(index), bounds));
    setMode("days");
  };

  const stepYear = (direction: -1 | 1): void => {
    const next = addMonths(viewMonth, direction * 12);
    const nextAvailable = Arr.map(Arr.range(0, 11), (index) =>
      isMonthAvailable(addMonths(startOfYear(next), index), bounds),
    );
    setViewMonth(next);
    setMonthFocus(nearestAvailableMonth(monthFocus, nextAvailable));
    pendingMonthFocus.current = true;
  };

  const moveMonthFocus = (index: number): void => {
    setMonthFocus(index);
    const id = monthIds.current[index];
    if (id !== undefined) renderer?.focusElement?.(id);
  };

  /** Leave the chooser with focus back on the day grid. */
  const backToDays = (): void => {
    pendingFocus.current = true;
    setMode("days");
  };

  const handleMonthKeyDown = (event: EventPayload): void => {
    if (disabled) return;
    Match.value(event).pipe(
      Match.when(isLeft, () =>
        moveMonthFocus(stepMonth(monthFocus, -1, availableMonths)),
      ),
      Match.when(isRight, () =>
        moveMonthFocus(stepMonth(monthFocus, 1, availableMonths)),
      ),
      Match.when(isUp, () =>
        moveMonthFocus(stepMonth(monthFocus, -3, availableMonths)),
      ),
      Match.when(isDown, () =>
        moveMonthFocus(stepMonth(monthFocus, 3, availableMonths)),
      ),
      Match.when(isFirst, () =>
        moveMonthFocus(nearestAvailableMonth(0, availableMonths)),
      ),
      Match.when(isLast, () =>
        moveMonthFocus(nearestAvailableMonth(11, availableMonths)),
      ),
      Match.when(isActivation, () => chooseMonth(monthFocus)),
      Match.orElse(() => undefined),
    );
  };

  const handleKeyDown = (event: EventPayload): void => {
    if (disabled) return;
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
  // Three cells span the seven-column day grid so the chooser keeps its width.
  const monthCell = (CELL * 7 - theme.spacing["2xs"] * 2) / 3;
  /** The grid has a day the user can choose; a reversed range has none. */
  const hasAvailableDay = Arr.some(Arr.flatten(grid), ({ day }) =>
    isAvailable(day, bounds),
  );
  const tabbable = tabStopOf(
    Option.getOrElse(
      Option.filter(active, (day) => isSameDay(startOfMonth(day), viewMonth)),
      () => startOfMonth(viewMonth),
    ),
    bounds,
  );
  const highlighted = Option.orElse(active, () => tabbable);

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
        {mode === "months" ? (
          <IconButton
            label={labels.previousYear}
            size="sm"
            testId="date-prev-year"
            disabled={disabled || !canBrowseYear(viewMonth, -1, bounds)}
            onClick={() => stepYear(-1)}
          >
            <Icon
              name="chevron-left"
              color={theme.colors.mutedForeground}
              size="sm"
            />
          </IconButton>
        ) : (
          <IconButton
            label={labels.previousMonth}
            size="sm"
            testId="date-prev"
            disabled={disabled || !canBrowseMonth(viewMonth, -1, bounds)}
            onClick={() => setViewMonth(addMonths(viewMonth, -1))}
          >
            <Icon
              name="chevron-left"
              color={theme.colors.mutedForeground}
              size="sm"
            />
          </IconButton>
        )}
        <Button
          variant="ghost"
          size="sm"
          testId="date-month"
          disabled={disabled || !hasAvailableMonth}
          aria-label={mode === "months" ? labels.showDays : labels.chooseMonth}
          onClick={() => (mode === "months" ? backToDays() : openMonths())}
        >
          {mode === "months"
            ? formatYearLabel(viewMonth)
            : formatMonthLabel(viewMonth, labels)}
        </Button>
        {mode === "months" ? (
          <IconButton
            label={labels.nextYear}
            size="sm"
            testId="date-next-year"
            disabled={disabled || !canBrowseYear(viewMonth, 1, bounds)}
            onClick={() => stepYear(1)}
          >
            <Icon
              name="chevron-right"
              color={theme.colors.mutedForeground}
              size="sm"
            />
          </IconButton>
        ) : (
          <IconButton
            label={labels.nextMonth}
            size="sm"
            testId="date-next"
            disabled={disabled || !canBrowseMonth(viewMonth, 1, bounds)}
            onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          >
            <Icon
              name="chevron-right"
              color={theme.colors.mutedForeground}
              size="sm"
            />
          </IconButton>
        )}
      </div>
      {mode === "months" ? (
        <div
          role="grid"
          aria-label={labels.chooseMonth}
          {...stateDescription(disabled)}
          onKeyDown={handleMonthKeyDown}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing["2xs"],
          }}
        >
          {Arr.map(Arr.range(0, 3), (row) => (
            <div
              key={row}
              role="row"
              style={{
                display: "flex",
                flexDirection: "row",
                gap: theme.spacing["2xs"],
              }}
            >
              {Arr.map(Arr.range(0, 2), (column) => {
                const index = row * 3 + column;
                const month = monthAt(index);
                const available = availableMonths[index] === true;
                const interactive = available && !disabled;
                const isSelected = index === viewMonthIndex;
                const name = Option.getOrElse(
                  Arr.get(labels.months, index),
                  () => String(index + 1),
                );
                return (
                  <div
                    key={index}
                    role="gridcell"
                    aria-label={
                      available
                        ? formatMonthLabel(month, labels)
                        : `${formatMonthLabel(month, labels)}, ${labels.unavailable}`
                    }
                    aria-selected={isSelected}
                    tabIndex={
                      !disabled && available && index === monthFocus ? 0 : -1
                    }
                    ref={attachMonth(index)}
                    testId={`date-month-${index}`}
                    onClick={interactive ? () => chooseMonth(index) : undefined}
                    onFocus={() => setMonthFocus(index)}
                    style={{
                      ...textStyle(theme, "caption"),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: monthCell,
                      height: CELL,
                      borderRadius: theme.radius.sm,
                      backgroundColor: isSelected
                        ? theme.colors.primary
                        : undefined,
                      color: isSelected
                        ? theme.colors.primaryForeground
                        : interactive
                          ? theme.colors.foreground
                          : theme.colors.mutedForeground,
                      cursor: interactive ? "pointer" : "not-allowed",
                      hover:
                        isSelected || !interactive
                          ? undefined
                          : { backgroundColor: theme.colors.hover },
                      ...(interactive && index === monthFocus
                        ? focusRing(theme)
                        : {}),
                    }}
                  >
                    {name}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div
          role="grid"
          aria-label={label}
          {...stateDescription(
            disabled,
            hasAvailableDay ? undefined : labels.noAvailableDays,
          )}
          onKeyDown={handleKeyDown}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: theme.spacing["2xs"],
          }}
        >
          <div role="row" style={{ display: "flex", flexDirection: "row" }}>
            {Arr.map(weekdayLabels(weekStartsOn, labels), (name, index) => (
              <text
                key={index}
                role="columnheader"
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
              {Arr.map(week, ({ day, inMonth }) => {
                const iso = formatIsoDay(day);
                const available = isAvailable(day, bounds);
                const interactive = available && !disabled;
                const isSelected = Option.contains(selectedIso, iso);
                const isToday = isSameDay(day, todayDay);
                return (
                  <div
                    key={iso}
                    role="gridcell"
                    aria-label={
                      available
                        ? formatDayLabel(day, labels)
                        : `${formatDayLabel(day, labels)}, ${labels.unavailable}`
                    }
                    aria-selected={isSelected}
                    tabIndex={
                      !disabled &&
                      Option.exists(
                        tabbable,
                        (stop) => iso === formatIsoDay(stop),
                      )
                        ? 0
                        : -1
                    }
                    ref={attachCell(iso)}
                    testId={`date-day-${iso}`}
                    onClick={interactive ? () => choose(day) : undefined}
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
                      // The adjacent days are real choices, painted muted rather
                      // than disabled: the grid has no dead cells.
                      color: isSelected
                        ? theme.colors.primaryForeground
                        : interactive && inMonth
                          ? theme.colors.foreground
                          : theme.colors.mutedForeground,
                      borderWidth: isToday ? theme.borderWidth.thin : undefined,
                      borderColor: isToday ? theme.colors.primary : undefined,
                      cursor: interactive ? "pointer" : "not-allowed",
                      hover:
                        isSelected || !interactive
                          ? undefined
                          : { backgroundColor: theme.colors.hover },
                      ...(interactive &&
                      Option.exists(
                        highlighted,
                        (day) => iso === formatIsoDay(day),
                      )
                        ? focusRing(theme)
                        : {}),
                    }}
                  >
                    {DateTime.toPartsUtc(day).day}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {clearable && !disabled && Option.isSome(selectedDay) ? (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="ghost" size="sm" testId="date-clear" onClick={clear}>
            {labels.clear}
          </Button>
        </div>
      ) : null}
    </>
  );
};

export type { CalendarLabels } from "./date-picker/calendar.js";

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
  focusable: true,
  limitations: [
    "display labels default to English: pass `labels` from your own catalogue; there is no locale lookup, and the shape (Month YYYY / D Month YYYY) is fixed",
    "time is a separate TimePicker: this control owns one day only",
    "0.10.0 has no aria-current, so today is marked by a border only",
    "0.10.0 has no aria-disabled: an unavailable day leaves the tab order and its accessible name ends in ', unavailable'",
    "a min after max makes no day selectable; the grid is visible and inert rather than throwing from render",
    "the month chooser shows one year at a time: there is no decade list, so a distant year costs one press per year",
  ],
  docs: "docs/date-picker.mdx",
  example: "examples/date-picker.example.tsx",
  testFile: "src/behaviour/date-picker.test.tsx",
} as const;
