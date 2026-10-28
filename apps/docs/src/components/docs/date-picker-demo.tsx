import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  addDays,
  addMonths,
  boundsOf,
  canBrowseMonth,
  clampToBounds,
  dayLabel,
  describeValue,
  formatRange,
  formatValue,
  isAvailable,
  monthGrid,
  monthLabel,
  MONTH_NAMES,
  monthNumber,
  monthOf,
  monthWindow,
  yearChoices,
  yearOfMonth,
  moveFocus,
  nextRange,
  rangePaint,
  weekdayLabels,
  windowMonth,
  type DayBounds,
  type GridKey,
  type IsoDay,
  type IsoMonth,
  type PreviewRange,
  type RangePaint,
  type WeekStart,
} from "./date-picker-preview";

/**
 * Browser previews for the Calendar and Date picker pages.
 *
 * The shipped grid is the `Calendar` component — its rules are the component's
 * own (`calendar/logic.ts`), and its value is an ISO day or a `{ from, to }`
 * span. GPUix has no calendar primitive, so the preview runs the same rules
 * through `date-picker-preview.ts`: six rows, adjacent-month days painted by
 * default, one roving tab stop, arrow/Home/End/PageUp/PageDown moves clamped to
 * inclusive bounds, and a selection painted from the theme's `primary` role.
 *
 * The runtime publishes no `aria-haspopup` in `@gpuix/native@0.11.0`, so the
 * trigger announces `aria-expanded` only, and the floating surface carries no
 * dialog role — the grid inside is the named region. The page says both rather
 * than promising a dialog the component does not open.
 */

/** The keys the grid handles; anything else belongs to the page. */
const GRID_KEYS: ReadonlySet<string> = new Set<GridKey>([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

const isGridKey = (key: string): key is GridKey => GRID_KEYS.has(key);

/** A surface's selection: one day, or a span. */
type PreviewValue =
  | { readonly mode: "single"; readonly day: IsoDay | null }
  | { readonly mode: "range"; readonly range: PreviewRange | null };

/** How a cell is painted for the surface's mode. */
const paintOf = (value: PreviewValue, day: IsoDay): RangePaint | "selected" =>
  value.mode === "single"
    ? value.day === day
      ? "selected"
      : null
    : rangePaint(value.range, day);

interface SurfaceProps {
  readonly label: string;
  readonly months: 1 | 2;
  readonly month: IsoMonth;
  readonly active: IsoDay;
  readonly value: PreviewValue;
  readonly today: IsoDay;
  readonly bounds: DayBounds;
  readonly weekStartsOn: WeekStart;
  readonly clearable: boolean;
  /** Take focus on the first render: an opened picker, not a gallery tile. */
  readonly autoFocus?: boolean;
  /** Lay the surface in flow instead of anchoring it under the trigger. */
  readonly inline?: boolean;
  /** Whether a value exists, so the Clear row only appears with something to clear. */
  readonly hasValue: boolean;
  /** `"label"` (default) paints the month name; `"dropdown"` paints two selects. */
  readonly captionLayout?: "label" | "dropdown";
  /** The earliest year the year select offers. Default 1900, the calendar's own. */
  readonly fromYear?: number;
  /** The latest year the year select offers. Default the current year. */
  readonly toYear?: number;
  readonly onMonth: (month: IsoMonth) => void;
  readonly onActive: (day: IsoDay) => void;
  readonly onChoose: (day: IsoDay) => void;
  readonly onClear: () => void;
  readonly onEscape: () => void;
}

/**
 * The month navigation, the weekday header, the grid and the Clear row.
 *
 * It is presentational: the parent owns the value, the view month and the
 * focused day, so every preview and every gallery tile shares one paint.
 */
const DateSurface = ({
  label,
  months,
  month,
  active,
  value,
  today,
  bounds,
  weekStartsOn,
  clearable,
  hasValue,
  captionLayout = "label",
  fromYear = 1900,
  toYear = 2026,
  autoFocus = false,
  inline = false,
  onMonth,
  onActive,
  onChoose,
  onClear,
  onEscape,
}: SurfaceProps) => {
  const cells = useRef(new Map<IsoDay, HTMLDivElement>());
  const mounted = useRef(false);

  useEffect(() => {
    const first = !mounted.current;
    mounted.current = true;
    if (first && !autoFocus) return;
    cells.current.get(active)?.focus();
  }, [active, month, autoFocus]);

  const move = (event: ReactKeyboardEvent, key: GridKey): void => {
    event.preventDefault();
    const next = moveFocus(active, key, weekStartsOn, bounds);
    onActive(next);
    onMonth(windowMonth(month, months, next));
  };

  return (
    <div
      className="gx-date-surface"
      data-inline={inline ? "" : undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onEscape();
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          onChoose(active);
          return;
        }
        if (!isGridKey(event.key)) return;
        move(event, event.key);
      }}
      onKeyUp={(event) => {
        // Space activates on the release, like the button contract it follows.
        if (event.key !== " ") return;
        event.preventDefault();
        onChoose(active);
      }}
    >
      <div className="gx-date-months">
        {monthWindow(month, months).map((panel) => (
          <div className="gx-date-panel" key={panel}>
            <div className="gx-date-nav">
              {/* One nav pair for the window, as the shipped Calendar paints
                  it: previous beside the first month, next after the last. */}
              {panel === month ? (
                <button
                  aria-label="Previous month"
                  className="gx-date-navbtn"
                  disabled={!canBrowseMonth(panel, -1, bounds)}
                  onClick={() => onMonth(addMonths(month, -1))}
                  type="button"
                >
                  <span aria-hidden="true">‹</span>
                </button>
              ) : (
                <span aria-hidden="true" className="gx-date-navbtn" />
              )}
              {captionLayout === "dropdown" ? (
                <span className="gx-date-caption">
                  <select
                    aria-label="Month"
                    className="gx-date-select"
                    onChange={(event) =>
                      onMonth(
                        addMonths(
                          panel,
                          Number(event.currentTarget.value) -
                            monthNumber(panel),
                        ),
                      )
                    }
                    value={monthNumber(panel)}
                  >
                    {MONTH_NAMES.map((name, index) => (
                      <option key={name} value={index + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Year"
                    className="gx-date-select"
                    onChange={(event) =>
                      onMonth(
                        addMonths(
                          panel,
                          (Number(event.currentTarget.value) -
                            yearOfMonth(panel)) *
                            12,
                        ),
                      )
                    }
                    value={yearOfMonth(panel)}
                  >
                    {yearChoices(fromYear, toYear).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </span>
              ) : (
                <span className="gx-date-month" role="status">
                  {monthLabel(panel)}
                </span>
              )}
              {panel === addMonths(month, months - 1) ? (
                <button
                  aria-label="Next month"
                  className="gx-date-navbtn"
                  disabled={!canBrowseMonth(panel, 1, bounds)}
                  onClick={() => onMonth(addMonths(month, 1))}
                  type="button"
                >
                  <span aria-hidden="true">›</span>
                </button>
              ) : (
                <span aria-hidden="true" className="gx-date-navbtn" />
              )}
            </div>
            <div
              aria-label={`${label}, ${monthLabel(panel)}`}
              className="gx-date-grid"
              role="grid"
            >
              <div className="gx-date-row" role="row">
                {weekdayLabels(weekStartsOn).map((weekday) => (
                  <span
                    aria-label={weekday}
                    className="gx-date-weekday"
                    key={weekday}
                    role="columnheader"
                  >
                    {weekday.slice(0, 1)}
                  </span>
                ))}
              </div>
              {monthGrid(panel, weekStartsOn).map((week, index) => (
                <div
                  className="gx-date-row"
                  key={`${panel}-${index}`}
                  role="row"
                >
                  {week.map((day, column) =>
                    day === null ? (
                      <span
                        className="gx-date-cell"
                        data-blank=""
                        key={column}
                      />
                    ) : (
                      <div
                        aria-label={
                          isAvailable(day, bounds)
                            ? dayLabel(day)
                            : `${dayLabel(day)}, unavailable`
                        }
                        aria-selected={paintOf(value, day) !== null}
                        className="gx-date-cell"
                        data-active={day === active ? "" : undefined}
                        data-outside={monthOf(day) === panel ? undefined : ""}
                        data-paint={paintOf(value, day) ?? undefined}
                        data-today={day === today ? "" : undefined}
                        data-unavailable={
                          isAvailable(day, bounds) ? undefined : ""
                        }
                        key={day}
                        onClick={
                          isAvailable(day, bounds)
                            ? () => onChoose(day)
                            : undefined
                        }
                        onFocus={() => onActive(day)}
                        ref={(node) => {
                          if (node === null) cells.current.delete(day);
                          else cells.current.set(day, node);
                        }}
                        role="gridcell"
                        tabIndex={day === active ? 0 : -1}
                      >
                        {Number(day.slice(8, 10))}
                      </div>
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {clearable && hasValue ? (
        <div className="gx-date-footer">
          <button className="gx-date-clear" onClick={onClear} type="button">
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
};

interface PickerProps {
  readonly label: string;
  readonly months?: 1 | 2;
  readonly today: IsoDay;
  readonly initial: PreviewValue;
  readonly min?: string;
  readonly max?: string;
  readonly clearable?: boolean;
  readonly weekStartsOn?: WeekStart;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly defaultOpen?: boolean;
  /** Lay the surface in flow: the states gallery's presentation. */
  readonly inline?: boolean;
  /** Close the surface as soon as a span is complete. Default `true`. */
  readonly closeOnSpan?: boolean;
}

/**
 * One picker: the trigger, the surface while it is open, and the readout.
 *
 * Opening anchors the view on the chosen day, or on today when none is set; a
 * one-day choice closes the surface and returns focus to the trigger, and a span
 * closes when its second day completes it. `Escape` and a press outside do the
 * same without changing the value.
 */
const DatePickerPreview = ({
  label,
  months = 1,
  today,
  initial,
  min,
  max,
  clearable = false,
  weekStartsOn = 1,
  placeholder = "Pick a date",
  disabled = false,
  defaultOpen = false,
  inline = false,
  closeOnSpan = true,
}: PickerProps) => {
  const [value, setValue] = useState<PreviewValue>(initial);
  const [open, setOpen] = useState(defaultOpen);
  const [focusOnOpen, setFocusOnOpen] = useState(false);
  const anchorOf = (): IsoDay =>
    value.mode === "single"
      ? (value.day ?? today)
      : (value.range?.from ?? today);
  const [month, setMonth] = useState<IsoMonth>(() => monthOf(anchorOf()));
  const [active, setActive] = useState<IsoDay>(() =>
    clampToBounds(anchorOf(), boundsOf(min, max)),
  );
  const trigger = useRef<HTMLButtonElement | null>(null);
  const frame = useRef<HTMLDivElement | null>(null);
  const bounds = boundsOf(min, max);

  const close = (): void => {
    setOpen(false);
    trigger.current?.focus();
  };

  const choose = (day: IsoDay): void => {
    if (!isAvailable(day, bounds)) return;
    if (value.mode === "single") {
      setValue({ mode: "single", day });
      close();
      return;
    }
    const next = nextRange(value.range, day);
    setValue({ mode: "range", range: next });
    if (next.to !== null && closeOnSpan) close();
  };

  const clear = (): void => {
    setValue(
      value.mode === "single"
        ? { mode: "single", day: null }
        : { mode: "range", range: null },
    );
    close();
  };

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent): void => {
      if (
        event.target instanceof Node &&
        frame.current !== null &&
        !frame.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  const triggerLabel =
    value.mode === "single"
      ? formatValue(value.day, placeholder)
      : formatRange(value.range, placeholder);
  const hasValue =
    value.mode === "single" ? value.day !== null : value.range !== null;

  return (
    <>
      <div className="gx-date-frame" ref={frame}>
        <button
          aria-expanded={open}
          aria-label={label}
          className="gx-date-trigger"
          disabled={disabled}
          onClick={() => {
            if (open) {
              setOpen(false);
              return;
            }
            const anchor = clampToBounds(anchorOf(), bounds);
            setMonth(monthOf(anchor));
            setActive(anchor);
            setFocusOnOpen(true);
            setOpen(true);
          }}
          ref={trigger}
          type="button"
        >
          <span
            className="gx-date-value"
            data-placeholder={hasValue ? undefined : ""}
          >
            {triggerLabel}
          </span>
          <svg aria-hidden="true" className="gx-date-caret" viewBox="0 0 12 12">
            <path
              d="M2.5 4.5 6 8l3.5-3.5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.5"
            />
          </svg>
        </button>
        {open ? (
          <DateSurface
            active={active}
            autoFocus={focusOnOpen}
            bounds={bounds}
            clearable={clearable}
            hasValue={hasValue}
            inline={inline}
            label={label}
            month={month}
            months={months}
            onActive={(day) => {
              setActive(day);
              setMonth(windowMonth(month, months, day));
            }}
            onChoose={choose}
            onClear={clear}
            onEscape={close}
            onMonth={(next) => {
              setMonth(next);
              setActive(clampToBounds(`${next}-01`, bounds));
            }}
            today={today}
            value={value}
            weekStartsOn={weekStartsOn}
          />
        ) : null}
      </div>
      {/* The readout is the field's, not the anchor's: inside the frame it
          pushed the popup 14px further down and left it under the status line. */}
      <p className="gx-date-readout" role="status">
        {value.mode === "single"
          ? describeValue(value.day)
          : `Value: ${value.range === null ? "none" : `${value.range.from} → ${value.range.to ?? "…"}`}`}
      </p>
    </>
  );
};

/** The page's opening preview: a schedule field a reader can really use. */
export const DatePickerWorkflow = () => (
  <div className="gx-demo gx-date-scene gx-date-popup">
    <div className="gx-date-column">
      <p className="gx-demo-label">Deployment window</p>
      <DatePickerPreview
        clearable
        initial={{ mode: "single", day: "2026-10-30" }}
        label="Deployment date"
        max="2026-12-18"
        min="2026-10-26"
        today="2026-10-22"
      />
    </div>
  </div>
);

/** The gallery: empty, chosen, bounded and disabled fields. */
export const DatePickerStates = () => (
  <div className="gx-demo gx-demo-column gx-date-scene">
    <div className="gx-date-gallery">
      <div className="gx-date-group">
        <p className="gx-demo-label">Empty field</p>
        <DatePickerPreview
          defaultOpen
          initial={{ mode: "single", day: null }}
          inline
          label="Start date"
          today="2026-10-22"
        />
      </div>
      <div className="gx-date-group">
        <p className="gx-demo-label">Chosen day, clearable</p>
        <DatePickerPreview
          clearable
          defaultOpen
          initial={{ mode: "single", day: "2026-10-17" }}
          inline
          label="Review date"
          today="2026-10-22"
        />
      </div>
      <div className="gx-date-group">
        <p className="gx-demo-label">Bounded, Sunday start</p>
        <DatePickerPreview
          defaultOpen
          initial={{ mode: "single", day: "2026-10-14" }}
          inline
          label="Sprint review"
          max="2026-11-13"
          min="2026-10-12"
          today="2026-10-22"
          weekStartsOn={0}
        />
      </div>
      <div className="gx-date-group">
        <p className="gx-demo-label">Disabled field</p>
        <DatePickerPreview
          disabled
          initial={{ mode: "single", day: "2026-10-30" }}
          label="Locked date"
          today="2026-10-22"
        />
      </div>
    </div>
  </div>
);

/** A span field: two months, and the surface closes when the span completes. */
export const DatePickerRange = () => (
  <div className="gx-demo gx-date-scene gx-date-popup">
    <div className="gx-date-column gx-date-wide">
      <p className="gx-demo-label">Booking window</p>
      <DatePickerPreview
        clearable
        initial={{
          mode: "range",
          range: { from: "2026-01-20", to: "2026-02-04" },
        }}
        label="Booking window"
        months={2}
        today="2026-10-22"
      />
    </div>
  </div>
);

/** The modal presets, as shadcn ships them: a Select that writes the span. */
export const DatePickerPresets = () => {
  const today = "2026-10-22";
  const [value, setValue] = useState<PreviewRange | null>(null);
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState<IsoDay>(today);
  const [month, setMonth] = useState<IsoMonth>(monthOf(today));
  const bounds = boundsOf();

  const preset = (days: number): PreviewRange => ({
    from: days === 0 ? today : addDays(today, -(days - 1)),
    to: today,
  });
  const thisMonth = (): PreviewRange => ({
    from: `${today.slice(0, 7)}-01`,
    to: today,
  });

  return (
    <div className="gx-demo gx-demo-column gx-date-scene gx-date-popup">
      <div className="gx-date-presets">
        <label className="gx-demo-label" htmlFor="date-preset">
          Quick range
        </label>
        <select
          className="gx-date-select"
          id="date-preset"
          defaultValue=""
          onChange={(event) => {
            const choice = event.target.value;
            const next =
              choice === "month"
                ? thisMonth()
                : choice === ""
                  ? null
                  : preset(Number(choice));
            setValue(next);
            if (next !== null) {
              setActive(next.from);
              setMonth(monthOf(next.from));
            }
          }}
        >
          <option value="">Custom</option>
          <option value="0">Today</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="month">This month</option>
        </select>
        <DateSurface
          active={active}
          bounds={bounds}
          clearable
          hasValue={value !== null}
          label="Quick range"
          month={month}
          months={2}
          onActive={(day) => {
            setActive(day);
            setMonth(windowMonth(month, 2, day));
          }}
          onChoose={(day) => setValue(nextRange(value, day))}
          onClear={() => {
            setValue(null);
            setOpen(false);
          }}
          onEscape={() => setOpen(false)}
          onMonth={setMonth}
          today={today}
          value={{ mode: "range", range: value }}
          weekStartsOn={1}
        />
      </div>
      <p className="gx-date-readout" role="status">
        {open
          ? value === null
            ? "Value: none"
            : `Value: ${value.from} → ${value.to ?? "…"}`
          : "Value: none"}
      </p>
    </div>
  );
};

/** A calendar on its own: one day, no popover. */
export const CalendarSingle = () => {
  const [day, setDay] = useState<IsoDay | null>("2026-10-17");
  const [month, setMonth] = useState<IsoMonth>("2026-10");
  const [active, setActive] = useState<IsoDay>("2026-10-17");

  return (
    <div className="gx-demo gx-demo-column gx-date-scene">
      <DateSurface
        active={active}
        bounds={boundsOf()}
        clearable={false}
        hasValue={day !== null}
        inline
        label="Review date"
        month={month}
        months={1}
        onActive={(next) => {
          setActive(next);
          setMonth(monthOf(next));
        }}
        onChoose={setDay}
        onClear={() => setDay(null)}
        onEscape={() => undefined}
        onMonth={setMonth}
        today="2026-10-17"
        value={{ mode: "single", day }}
        weekStartsOn={1}
      />
      <p className="gx-date-readout" role="status">
        {describeValue(day)}
      </p>
    </div>
  );
};

/**
 * A calendar whose caption is two dropdowns, for a date that is not near today.
 *
 * The window opens on 1979 with the year list reaching back to 1970: a calendar
 * that only offers the decade around today cannot name a birthday, and the
 * dropdowns are how a reader gets to one without paging eleven months at a time.
 */
export const CalendarDropdowns = () => {
  const [day, setDay] = useState<IsoDay | null>("1979-06-14");
  const [month, setMonth] = useState<IsoMonth>("1979-06");
  const [active, setActive] = useState<IsoDay>("1979-06-14");

  return (
    <div className="gx-demo gx-demo-column gx-date-scene">
      <DateSurface
        active={active}
        bounds={boundsOf()}
        captionLayout="dropdown"
        clearable={false}
        fromYear={1970}
        hasValue={day !== null}
        inline
        label="Date of birth"
        month={month}
        months={1}
        onActive={(next) => {
          setActive(next);
          setMonth(monthOf(next));
        }}
        onChoose={setDay}
        onClear={() => setDay(null)}
        onEscape={() => undefined}
        onMonth={setMonth}
        toYear={2026}
        today="2026-10-17"
        value={{ mode: "single", day }}
        weekStartsOn={1}
      />
      <p className="gx-date-readout" role="status">
        {describeValue(day)}
      </p>
    </div>
  );
};

/** A calendar showing two months and a span, with the ends painted apart. */
export const CalendarRange = () => {
  const [range, setRange] = useState<PreviewRange | null>({
    from: "2026-10-19",
    to: "2026-10-23",
  });
  const [month, setMonth] = useState<IsoMonth>("2026-10");
  const [active, setActive] = useState<IsoDay>("2026-10-19");

  return (
    <div className="gx-demo gx-demo-column gx-date-scene">
      <DateSurface
        active={active}
        bounds={boundsOf()}
        clearable
        hasValue={range !== null}
        inline
        label="Release window"
        month={month}
        months={2}
        onActive={(next) => {
          setActive(next);
          setMonth(windowMonth(month, 2, next));
        }}
        onChoose={(day) => setRange(nextRange(range, day))}
        onClear={() => setRange(null)}
        onEscape={() => undefined}
        onMonth={setMonth}
        today="2026-10-17"
        value={{ mode: "range", range }}
        weekStartsOn={1}
      />
      <p className="gx-date-readout" role="status">
        {range === null
          ? "Value: none"
          : `Value: ${range.from} → ${range.to ?? "…"}`}
      </p>
    </div>
  );
};

const workflowSource = `import {
  DatePicker,
  DatePickerCalendar,
  DatePickerContent,
  DatePickerTrigger,
} from "@gpuixui/components/date-picker";
import { useState } from "react";

/** The value is an ISO day, never a locale string or a DateTime. */
export const DeploymentWindow = () => {
  const [due, setDue] = useState<string | null>("2026-10-30");

  return (
    <DatePicker
      clearable
      max="2026-12-18"
      min="2026-10-26"
      onValueChange={setDue}
      today="2026-10-22"
      value={due}
    >
      <DatePickerTrigger label="Deployment date" />
      <DatePickerContent>
        <DatePickerCalendar />
      </DatePickerContent>
    </DatePicker>
  );
};`;

const statesSource = `import {
  DatePicker,
  DatePickerCalendar,
  DatePickerContent,
  DatePickerTrigger,
} from "@gpuixui/components/date-picker";

// Empty: the trigger shows the placeholder and reports null on a clear.
<DatePicker onValueChange={setStart} value={start}>
  <DatePickerTrigger label="Start date" />
  <DatePickerContent>
    <DatePickerCalendar />
  </DatePickerContent>
</DatePicker>

// Chosen and clearable: the surface gains one Clear row while a day is set.
<DatePicker clearable onValueChange={setReview} value={review}>
  <DatePickerTrigger label="Review date" />
  <DatePickerContent>
    <DatePickerCalendar />
  </DatePickerContent>
</DatePicker>

// Bounded, Sunday start: outside days are muted and leave the tab order.
<DatePicker
  max="2026-11-13"
  min="2026-10-12"
  onValueChange={setSprint}
  value={sprint}
  weekStartsOn={0}
>
  <DatePickerTrigger label="Sprint review" />
  <DatePickerContent>
    <DatePickerCalendar />
  </DatePickerContent>
</DatePicker>

// Disabled: the trigger leaves the tab order and paints the disabled pair.
<DatePicker disabled value="2026-10-30">
  <DatePickerTrigger label="Locked date" />
  <DatePickerContent>
    <DatePickerCalendar />
  </DatePickerContent>
</DatePicker>;`;

const rangeSource = `import {
  DatePicker,
  DatePickerCalendar,
  DatePickerContent,
  DatePickerTrigger,
} from "@gpuixui/components/date-picker";
import { useState } from "react";

/** A span is { from, to } of ISO days; to is null until the second press. */
export const BookingWindow = () => {
  const [window, setWindow] = useState<{
    from: string;
    to: string | null;
  } | null>({ from: "2026-01-20", to: "2026-02-04" });

  return (
    <DatePicker
      mode="range"
      clearable
      onValueChange={setWindow}
      today="2026-10-22"
      value={window}
    >
      <DatePickerTrigger label="Booking window" />
      <DatePickerContent>
        <DatePickerCalendar label="Booking calendar" />
      </DatePickerContent>
    </DatePicker>
  );
};`;

const presetsSource = `import { Calendar } from "@gpuixui/components/calendar";
import { addDays } from "@gpuixui/components/calendar/logic";
import { useState } from "react";

/** One Select writes the span; the calendar still adjusts it afterwards. */
export const QuickRange = () => {
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const today = "2026-10-22";
  const preset = (days: number) => ({
    from: days === 0 ? today : addDays(today, -(days - 1)),
    to: today,
  });

  return (
    <>
      <Select
        label="Quick range"
        options={[
          { value: "0", label: "Today" },
          { value: "7", label: "Last 7 days" },
          { value: "30", label: "Last 30 days" },
          { value: "1", label: "This month" },
        ]}
        onValueChange={(days) => setRange(preset(Number(days)))}
      />
      <Calendar
        mode="range"
        numberOfMonths={2}
        selected={range}
        onSelect={setRange}
        today={today}
      />
    </>
  );
};`;

const calendarSingleSource = `import { Calendar } from "@gpuixui/components/calendar";
import { useState } from "react";

export const ReviewDate = () => {
  const [day, setDay] = useState<string | null>("2026-10-17");

  return (
    <Calendar
      selected={day}
      onSelect={setDay}
      today="2026-10-17"
      label="Review date"
    />
  );
};`;

const calendarRangeSource = `import { Calendar } from "@gpuixui/components/calendar";
import { useState } from "react";

export const ReleaseWindow = () => {
  const [range, setRange] = useState<{
    from: string;
    to: string | null;
  } | null>({ from: "2026-10-19", to: "2026-10-23" });

  return (
    <Calendar
      mode="range"
      numberOfMonths={2}
      disabled={{ weekdays: [0, 6] }}
      selected={range}
      onSelect={setRange}
      today="2026-10-17"
    />
  );
};`;

const calendarDropdownsSource = `import { Calendar } from "@gpuixui/components/calendar";
import { useState } from "react";

const [birthday, setBirthday] = useState("1979-06-14");

<Calendar
  mode="single"
  captionLayout="dropdown"
  fromYear={1970}
  toYear={2026}
  selected={birthday}
  onSelect={setBirthday}
  defaultMonth="1979-06-14"
/>;`;

export {
  calendarDropdownsSource,
  calendarRangeSource,
  calendarSingleSource,
  presetsSource,
  rangeSource,
  statesSource as datePickerStatesSource,
  workflowSource as datePickerWorkflowSource,
  rangeSource as datePickerRangeSource,
  presetsSource as datePickerPresetsSource,
};
