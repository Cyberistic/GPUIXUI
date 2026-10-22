import { useEffect, useRef, useState } from "react";
import {
  addMonths,
  boundsOf,
  canBrowseMonth,
  clampToBounds,
  dayLabel,
  describeValue,
  firstOfMonth,
  formatValue,
  isAvailable,
  monthGrid,
  monthLabel,
  monthOf,
  moveFocus,
  weekdayLabels,
  type DayBounds,
  type GridKey,
  type IsoDay,
  type IsoMonth,
  type WeekStart,
} from "./date-picker-preview";

/**
 * Browser previews for the Date picker page.
 *
 * The shipped picker is a field-shaped trigger and a month grid in a Popover;
 * GPUix has no calendar primitive, so the grid's rules are the component's own.
 * The preview runs the same rules through `date-picker-preview.ts` — six rows,
 * no adjacent-month days, one roving tab stop, arrow/Home/End/PageUp/PageDown
 * moves clamped to inclusive bounds, and a selection that closes the surface
 * and hands focus back to the trigger.
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

interface SurfaceProps {
  readonly label: string;
  readonly month: IsoMonth;
  readonly active: IsoDay;
  readonly value: IsoDay | null;
  readonly today: IsoDay;
  readonly bounds: DayBounds;
  readonly weekStartsOn: WeekStart;
  readonly clearable: boolean;
  /** Take focus on the first render: an opened picker, not a gallery tile. */
  readonly autoFocus?: boolean;
  /** Lay the surface in flow instead of anchoring it under the trigger. */
  readonly inline?: boolean;
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
 * focused day, so the workflow preview and the gallery tiles share one paint.
 */
const DateSurface = ({
  label,
  month,
  active,
  value,
  today,
  bounds,
  weekStartsOn,
  clearable,
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
        event.preventDefault();
        onActive(moveFocus(active, event.key, weekStartsOn, bounds));
      }}
      onKeyUp={(event) => {
        // Space activates on the release, like the button contract it follows.
        if (event.key !== " ") return;
        event.preventDefault();
        onChoose(active);
      }}
    >
      <div className="gx-date-nav">
        <button
          aria-label="Previous month"
          className="gx-date-navbtn"
          disabled={!canBrowseMonth(month, -1, bounds)}
          onClick={() => onMonth(addMonths(month, -1))}
          type="button"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <span className="gx-date-month" role="status">
          {monthLabel(month)}
        </span>
        <button
          aria-label="Next month"
          className="gx-date-navbtn"
          disabled={!canBrowseMonth(month, 1, bounds)}
          onClick={() => onMonth(addMonths(month, 1))}
          type="button"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <div aria-label={label} className="gx-date-grid" role="grid">
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
        {monthGrid(month, weekStartsOn).map((week, index) => (
          <div className="gx-date-row" key={`${month}-${index}`} role="row">
            {week.map((day, column) =>
              day === null ? (
                <span className="gx-date-cell" data-blank="" key={column} />
              ) : (
                <div
                  aria-label={
                    isAvailable(day, bounds)
                      ? dayLabel(day)
                      : `${dayLabel(day)}, unavailable`
                  }
                  aria-selected={day === value}
                  className="gx-date-cell"
                  data-active={day === active ? "" : undefined}
                  data-selected={day === value ? "" : undefined}
                  data-today={day === today ? "" : undefined}
                  data-unavailable={isAvailable(day, bounds) ? undefined : ""}
                  key={day}
                  onClick={
                    isAvailable(day, bounds) ? () => onChoose(day) : undefined
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
      {clearable && value !== null ? (
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
  readonly today: IsoDay;
  readonly initial: IsoDay | null;
  readonly min?: string;
  readonly max?: string;
  readonly clearable?: boolean;
  readonly weekStartsOn?: WeekStart;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly defaultOpen?: boolean;
  /** Lay the surface in flow: the states gallery's presentation. */
  readonly inline?: boolean;
}

/**
 * One picker: the trigger, the surface while it is open, and the readout.
 *
 * Opening anchors the view on the chosen day, or on today when none is set; a
 * choice closes the surface and returns focus to the trigger; `Escape` and a
 * press outside do the same without changing the value.
 */
const DatePickerPreview = ({
  label,
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
}: PickerProps) => {
  const [value, setValue] = useState<IsoDay | null>(initial);
  const [open, setOpen] = useState(defaultOpen);
  const [focusOnOpen, setFocusOnOpen] = useState(false);
  const [month, setMonth] = useState<IsoMonth>(() => monthOf(initial ?? today));
  const [active, setActive] = useState<IsoDay>(() =>
    clampToBounds(initial ?? today, boundsOf(min, max)),
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
    setValue(day);
    close();
  };

  const clear = (): void => {
    setValue(null);
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

  return (
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
          const anchor = clampToBounds(value ?? today, bounds);
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
          data-placeholder={value === null ? "" : undefined}
        >
          {formatValue(value, placeholder)}
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
          inline={inline}
          label={label}
          month={month}
          onActive={(day) => {
            setActive(day);
            setMonth(monthOf(day));
          }}
          onChoose={choose}
          onClear={clear}
          onEscape={close}
          onMonth={(next) => {
            setMonth(next);
            setActive(clampToBounds(firstOfMonth(`${next}-01`), bounds));
          }}
          today={today}
          value={value}
          weekStartsOn={weekStartsOn}
        />
      ) : null}
      <p className="gx-date-readout" role="status">
        {describeValue(value)}
      </p>
    </div>
  );
};

/** The page's opening preview: a schedule field a reader can really use. */
export const DatePickerWorkflow = () => (
  <div className="gx-demo gx-date-scene">
    <div className="gx-date-column">
      <p className="gx-demo-label">Deployment window</p>
      <DatePickerPreview
        clearable
        initial="2026-10-30"
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
          initial={null}
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
          initial="2026-10-17"
          inline
          label="Review date"
          today="2026-10-22"
        />
      </div>
      <div className="gx-date-group">
        <p className="gx-demo-label">Bounded, Sunday start</p>
        <DatePickerPreview
          defaultOpen
          initial="2026-10-14"
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
          initial="2026-10-30"
          label="Locked date"
          today="2026-10-22"
        />
      </div>
    </div>
  </div>
);

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

export {
  statesSource as datePickerStatesSource,
  workflowSource as datePickerWorkflowSource,
};
