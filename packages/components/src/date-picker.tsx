/** @jsxImportSource @gpuix/react */
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

const useDatePicker = (): DatePickerContextValue => {
  const value = useContext(DatePickerContext);
  if (value === undefined) {
    throw new Error("DatePicker parts must be used inside DatePicker");
  }
  return value;
};

export interface DatePickerBaseProps {
  readonly weekStartsOn?: WeekStart;

  readonly min?: string;

  readonly max?: string;

  readonly clearable?: boolean;
  readonly disabled?: boolean;

  readonly today?: string;

  readonly numberOfMonths?: MonthCount;

  readonly showOutsideDays?: boolean;

  readonly captionLayout?: CaptionLayout;
  readonly fromYear?: number;
  readonly toYear?: number;
  readonly children?: PartChildren;
}

export interface SingleDatePickerProps extends DatePickerBaseProps {
  readonly mode?: "single";

  readonly value?: string | null;
  readonly defaultValue?: string | null;
  readonly onValueChange?: (value: string | null) => void;
}

export interface RangeDatePickerProps extends DatePickerBaseProps {
  readonly mode: "range";

  readonly value?: DayRange | null;
  readonly defaultValue?: DayRange | null;
  readonly onValueChange?: (value: DayRange | null) => void;
}

export type DatePickerProps = SingleDatePickerProps | RangeDatePickerProps;

interface PickerRootProps {
  readonly base: DatePickerBaseProps;
  readonly selection: Selection;

  readonly commit: (next: Selection) => boolean;
  readonly clear: () => void;
}

const todayOf = (value: string | undefined): DateTime.Utc =>
  Option.getOrElse(
    Option.flatMap(Option.fromNullishOr(value), parseIsoDay),
    () => todayUtc(DateTime.nowUnsafe()),
  );

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

  const closeToTrigger = useCallback((): void => {
    send(store.set(false));
    const instance = trigger.current;
    if (instance !== null) renderer?.focusElement?.(instance.id);
  }, [renderer, store]);

  useLayoutEffect(() => {
    if (disabled) send(store.set(false));
  }, [disabled, store]);

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

export const DatePicker = (props: DatePickerProps): ReactElement =>
  props.mode === "range" ? (
    <RangePicker {...props} />
  ) : (
    <SinglePicker {...props} />
  );

export interface DatePickerTriggerProps extends Omit<
  PrimitiveButtonProps,
  "children"
> {
  readonly placeholder?: string;

  readonly label?: string;

  readonly className?: string;

  readonly testId?: string;

  readonly onClick?: (event: EventPayload) => void;
}

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

export interface DatePickerContentProps extends FloatingContentProps {
  readonly side?: "top" | "right" | "bottom" | "left";

  readonly align?: "start" | "center" | "end";

  readonly sideOffset?: number;

  readonly className?: string;
  readonly children?: PartChildren;
}

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

export interface DatePickerCalendarProps {
  readonly label?: string;
}

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
