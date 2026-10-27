/** @jsxImportSource @gpuix/react */
/**
 * DatePicker: a day, or a span of days, chosen from a `Calendar` in a popover.
 *
 * The grid is the package's `Calendar` (`calendar.tsx`); the surface is the
 * package's **Popover**, which brings the anchored layer, the dismiss stack and
 * Escape focus-return with it. This file owns the value, the open state, the
 * field-shaped trigger and the Clear row — nothing about the month maths.
 *
 * The public value is an ISO day (`YYYY-MM-DD`) in `"single"` mode and
 * `{ from, to }` of ISO days in `"range"`: never a `DateTime` and never a
 * locale-formatted string, because a stored value must not depend on the
 * display. `min`/`max` bound selection inclusively and `clearable` adds the
 * reset to `null`; neither rewrites a controlled value.
 *
 * The trigger prints shadcn's labels: `"Pick a date"`, `"Jan 20, 2026"`, and
 * `"Jan 20 – Feb 4, 2026"` for a span inside one year.
 *
 * Known scope, recorded in the docs: fixed English labels (no i18n layer), no
 * time (a time of day is the separate TimePicker), and the runtime's closed
 * `aria-*` set (no `aria-current`, no live region).
 */

import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import {
  mergeStyles,
  resolveStyle,
  type FloatingContentProps,
} from "@gpuix/react/floating";
import { Icon } from "@gpuixui/icons";
import type { ButtonProps as PrimitiveButtonProps } from "@gpuixui/primitives/button";
import {
  cn,
  DATE_PICKER_CARET,
  DATE_PICKER_CONTENT,
  DATE_PICKER_TRIGGER,
  DATE_PICKER_TRIGGER_TEXT,
} from "@gpuixui/tw";
import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  type ReactElement,
} from "react";
import { Calendar } from "./calendar.js";
import {
  boundsOf,
  formatIsoDay,
  formatSelectionLabel,
  hasSelection,
  parseIsoDay,
  rangeOf,
  rangeSelection,
  singleSelection,
  todayUtc,
  type CaptionLayout,
  type DayBounds,
  type DayMatchers,
  type DayRange,
  type MonthCount,
  type Selection,
  type WeekStart,
} from "./calendar/logic.js";
import { makePickerOpen } from "./date-picker/store.js";
import { Button } from "./internal/button.js";
import { useControllableState } from "./internal/controllable.js";
import { send, useLocalState, useLocalStore } from "./internal/local-state.js";
import {
  assertParts,
  type PartChildren,
  type PartComponent,
  type PartsContract,
} from "./internal/parts.js";
import { recipeStyle } from "./internal/recipe.js";
import { useMergedRef } from "./internal/ref.js";
import { controlHeight, useTheme } from "./internal/theme.js";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.js";

/** The rules a date-picker part follows; throws outside a {@link DatePicker}. */
interface DatePickerContextValue {
  readonly selection: Selection;
  readonly bounds: DayBounds;
  readonly matchers: DayMatchers | undefined;
  readonly weekStartsOn: WeekStart;
  readonly todayDay: DateTime.Utc;
  readonly clearable: boolean;
  readonly disabled: boolean;
  readonly open: boolean;
  readonly numberOfMonths: MonthCount;
  readonly showOutsideDays: boolean;
  readonly captionLayout: CaptionLayout;
  readonly fromYear: number | undefined;
  readonly toYear: number | undefined;
  readonly chooseSingle: (day: string | null) => void;
  readonly chooseRange: (range: DayRange | null) => void;
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

/** The props both modes share. */
export interface DatePickerBaseProps {
  /** Default `1` (Monday). */
  readonly weekStartsOn?: WeekStart;
  /**
   * The first selectable ISO day, inclusive. Absent or malformed means no lower
   * bound. Bounds constrain choosing; they never rewrite a controlled `value`.
   */
  readonly min?: string;
  /** The last selectable ISO day, inclusive. Absent or malformed is unbounded. */
  readonly max?: string;
  /** Show a `Clear` action in the surface while a value is set. Default `false`. */
  readonly clearable?: boolean;
  readonly disabled?: boolean;
  /**
   * The ISO day the picker treats as today. Defaults to the runtime clock; pass
   * it when a test or a server boundary needs a fixed day.
   */
  readonly today?: string;
  /** Months painted side by side. Default `1`, or `2` in range mode. */
  readonly numberOfMonths?: MonthCount;
  /** Paint adjacent-month days. Default `true`. */
  readonly showOutsideDays?: boolean;
  /** Default `"label"`: a caption, or month and year dropdowns. */
  readonly captionLayout?: CaptionLayout;
  readonly fromYear?: number;
  readonly toYear?: number;
  readonly children?: PartChildren;
}

/** One day at a time; the ISO day, or `null` for none. */
export interface SingleDatePickerProps extends DatePickerBaseProps {
  readonly mode?: "single";
  /** The controlled ISO day, or `null` for none. `undefined` means uncontrolled. */
  readonly value?: string | null;
  readonly defaultValue?: string | null;
  readonly onValueChange?: (value: string | null) => void;
}

/** A span of days; `to` is absent until the second day is chosen. */
export interface RangeDatePickerProps extends DatePickerBaseProps {
  readonly mode: "range";
  /** The controlled span, or `null` for none. `undefined` means uncontrolled. */
  readonly value?: DayRange | null;
  readonly defaultValue?: DayRange | null;
  readonly onValueChange?: (value: DayRange | null) => void;
}

/** {@link DatePicker} props, one variant per mode. */
export type DatePickerProps = SingleDatePickerProps | RangeDatePickerProps;

/** What the root needs from the mode: its selection and how to change it. */
interface PickerRootProps {
  readonly base: DatePickerBaseProps;
  readonly selection: Selection;
  /** Store the next selection; the returned flag closes the surface. */
  readonly commit: (next: Selection) => boolean;
  readonly clear: () => void;
}

/** The day the picker calls today, at UTC midnight. */
const todayOf = (value: string | undefined): DateTime.Utc =>
  Option.getOrElse(
    Option.flatMap(Option.fromNullishOr(value), parseIsoDay),
    () => todayUtc(DateTime.nowUnsafe()),
  );

/**
 * The bounds as matchers: `react-day-picker` disables the days *before* a
 * `before` matcher, while `min` is itself selectable, so the edge moves by a day.
 */
const matchersOf = (
  bounds: DayBounds,
  disabled: boolean,
): DayMatchers | undefined => {
  const before = Option.map(bounds.min, (min) =>
    formatIsoDay(DateTime.add({ days: -1 })(min)),
  );
  const after = Option.map(bounds.max, (max) =>
    formatIsoDay(DateTime.add({ days: 1 })(max)),
  );
  const edges: DayMatchers = {
    ...Option.match(before, {
      onNone: () => ({}),
      onSome: (day) => ({ before: day }),
    }),
    ...Option.match(after, {
      onNone: () => ({}),
      onSome: (day) => ({ after: day }),
    }),
  };
  if (disabled) return { ...edges, filter: () => true };
  return Option.isNone(before) && Option.isNone(after) ? undefined : edges;
};

/** The picker's state, shared by both modes. */
const PickerRoot = ({
  base,
  selection,
  commit,
  clear,
}: PickerRootProps): ReactElement => {
  const renderer = useGpuix().renderer;
  const store = useLocalStore(makePickerOpen);
  const open = useLocalState(store.local);
  const trigger = useRef<PublicInstance | null>(null);
  const bounds = boundsOf(base.min, base.max);
  const todayDay = todayOf(base.today);
  const clearable = base.clearable === true;
  const disabled = base.disabled === true;

  /** Close the surface and hand focus back to the trigger. */
  const closeToTrigger = useCallback((): void => {
    send(store.set(false));
    const instance = trigger.current;
    if (instance !== null) renderer?.focusElement?.(instance.id);
  }, [renderer, store]);

  // A surface already open when the caller disables the picker closes with it:
  // a calendar no day can be chosen from is not an affordance, and the stored
  // request is dropped so re-enabling does not resurrect it. A layout effect
  // retires it before the frame paints.
  useLayoutEffect(() => {
    if (disabled) send(store.set(false));
  }, [disabled, store]);

  // A choice is a selection the calendar already refused an unavailable day
  // for, and the picker's own `disabled` turns every day unavailable; the
  // root's job is to report it and decide whether the surface closes.
  const report = (next: Selection): void => {
    if (commit(next)) closeToTrigger();
  };

  assertParts(datePickerRoot, base.children);

  return (
    <DatePickerContext.Provider
      value={{
        selection,
        bounds,
        matchers: matchersOf(bounds, disabled),
        weekStartsOn: base.weekStartsOn ?? 1,
        todayDay,
        clearable,
        disabled,
        open,
        numberOfMonths:
          base.numberOfMonths ?? (selection.mode === "range" ? 2 : 1),
        showOutsideDays: base.showOutsideDays ?? true,
        captionLayout: base.captionLayout ?? "label",
        fromYear: base.fromYear,
        toYear: base.toYear,
        chooseSingle: (day) => report(singleSelection(day)),
        chooseRange: (range) => report(rangeSelection(range)),
        clear: () => {
          clear();
          closeToTrigger();
        },
        closeToTrigger,
        registerTrigger: (instance) => {
          trigger.current = instance;
        },
      }}
    >
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (disabled && next) return;
          send(store.set(next));
        }}
      >
        {base.children}
      </Popover>
    </DatePickerContext.Provider>
  );
};

/** A one-day picker: the ISO day in, the ISO day out. */
const SinglePicker = (props: SingleDatePickerProps): ReactElement => {
  const [value, setValue] = useControllableState<string | null>({
    value: props.value,
    defaultValue: props.defaultValue ?? null,
    onChange: props.onValueChange,
  });
  const selection: Selection = { mode: "single", day: value };

  return (
    <PickerRoot
      base={props}
      selection={selection}
      commit={(next) => {
        if (next.mode === "single") setValue(next.day);
        return true;
      }}
      clear={() => setValue(null)}
    />
  );
};

/** A span picker: two presses make a range, and the second closes it. */
const RangePicker = (props: RangeDatePickerProps): ReactElement => {
  const [value, setValue] = useControllableState<DayRange | null>({
    value: props.value,
    defaultValue: props.defaultValue ?? null,
    onChange: props.onValueChange,
  });
  const selection: Selection = { mode: "range", range: rangeOf(value) };

  return (
    <PickerRoot
      base={props}
      selection={selection}
      commit={(next) => {
        if (next.mode !== "range") return false;
        setValue(next.range);
        return next.range?.to != null;
      }}
      clear={() => setValue(null)}
    />
  );
};

/** The picker's state. Compose the trigger and the content inside it. */
export const DatePicker = (props: DatePickerProps): ReactElement =>
  props.mode === "range" ? <RangePicker {...props} /> : <SinglePicker {...props} />;

/** {@link DatePickerTrigger} props. */
export interface DatePickerTriggerProps extends Omit<
  PrimitiveButtonProps,
  "children"
> {
  /** Default `"Pick a date"`. */
  readonly placeholder?: string;
  /** The trigger's accessible name. */
  readonly label?: string;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** Default `"date-picker-trigger"`. */
  readonly testId?: string;
  /**
   * Called for a click or an activating key, opening the picker afterwards.
   * @deprecated use `onActivate`; removed in the next release.
   */
  readonly onClick?: (event: EventPayload) => void;
}

/** The field-shaped trigger: the selected day or span, plus a caret. */
export const DatePickerTrigger = ({
  placeholder = "Pick a date",
  className,
  testId = "date-picker-trigger",
  style,
  ...rest
}: DatePickerTriggerProps) => {
  const theme = useTheme();
  const { selection, disabled, registerTrigger } = useDatePicker();
  const setTrigger = useMergedRef<PublicInstance | null>(
    registerTrigger,
    rest.ref,
  );
  const labelText = formatSelectionLabel(selection, placeholder);
  const isPlaceholder = !hasSelection(selection);
  const fieldStyle = mergeStyles(
    recipeStyle(cn(DATE_PICKER_TRIGGER, className), theme),
    {
      height: controlHeight(theme, "md"),
      color: isPlaceholder
        ? theme.colors.mutedForeground
        : theme.colors.foreground,
    },
  );

  return (
    <PopoverTrigger
      {...rest}
      ref={setTrigger}
      testId={testId}
      disabled={disabled}
      style={(state) =>
        mergeStyles(fieldStyle, resolveStyle(style, state)) ?? {}
      }
    >
      <text
        style={mergeStyles(recipeStyle(DATE_PICKER_TRIGGER_TEXT, theme), {
          color: isPlaceholder
            ? theme.colors.mutedForeground
            : theme.colors.foreground,
        })}
      >
        {labelText}
      </text>
      <div style={recipeStyle(DATE_PICKER_CARET, theme)}>
        <Icon
          name="chevron-down"
          size="xs"
          color={theme.colors.mutedForeground}
        />
      </div>
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
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: PartChildren;
}

/** The popup. Focus stays on the grid's day cell rather than the surface. */
export const DatePickerContent = ({
  side = "bottom",
  align = "start",
  sideOffset = 6,
  className,
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
        recipeStyle(cn(DATE_PICKER_CONTENT, className), theme),
        style,
      )}
    >
      {children}
    </PopoverContent>
  );
};

/** {@link DatePickerCalendar} props. */
export interface DatePickerCalendarProps {
  /** The grid's accessible name. Default `"Calendar"`. */
  readonly label?: string;
}

/**
 * The picker's `Calendar`, plus the Clear row.
 *
 * The calendar is the standalone component in every respect — the picker only
 * supplies the mode, the value, the bounds and the press handler, so the
 * keyboard, the roving focus and the paint are the calendar's own.
 */
export const DatePickerCalendar = ({
  label = "Calendar",
}: DatePickerCalendarProps): ReactElement => {
  const {
    selection,
    matchers,
    weekStartsOn,
    todayDay,
    clearable,
    open,
    numberOfMonths,
    showOutsideDays,
    captionLayout,
    fromYear,
    toYear,
    chooseSingle,
    chooseRange,
    clear,
    closeToTrigger,
  } = useDatePicker();
  const shared = {
    weekStartsOn,
    today: formatIsoDay(todayDay),
    numberOfMonths,
    showOutsideDays,
    captionLayout,
    fromYear,
    toYear,
    disabled: matchers,
    label,
    autoFocus: open,
    onDismiss: closeToTrigger,
  } as const;

  return (
    <>
      {selection.mode === "range" ? (
        <Calendar
          {...shared}
          mode="range"
          selected={selection.range}
          onSelect={chooseRange}
        />
      ) : (
        <Calendar
          {...shared}
          mode="single"
          selected={selection.mode === "single" ? selection.day : null}
          onSelect={chooseSingle}
        />
      )}
      {clearable && hasSelection(selection) ? (
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
    "day, month and weekday labels are fixed English strings: the repo has no i18n layer",
    "no adjacent-month selection rule is hidden: outside days are painted and selectable by default",
    "time is a separate TimePicker: this control owns days only",
    "0.11.0 has no aria-current, so today is marked by a border only",
    "0.11.0 has no aria-disabled: an unavailable day leaves the tab order and its accessible name ends in ', unavailable'",
    "a min after max makes no day selectable; the grid is visible and inert rather than throwing from render",
    "a picker disabled while its calendar is open closes with it, and no day or Clear writes the value",
  ],
  docs: "docs/date-picker.mdx",
  example: "examples/date-picker.example.tsx",
  testFile: "src/behaviour/date-picker.test.tsx",
} as const;
