import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  clearTime,
  composeValue,
  describeValue,
  editSegment,
  padOnBlur,
  stepSegment,
  timeText,
  type Segment,
  type TimeState,
  type TimeText,
} from "./time-picker-preview";

/**
 * Browser previews for the Time picker page.
 *
 * The shipped field is two real `<input>` segments inside a labelled group — a
 * field, not a trigger with a popup, because `@gpuix/native`@0.11.0 has
 * `aria-valuetext` but no `aria-valuenow` for a spinbutton to announce. The
 * preview takes the field's geometry from the theme bridge (the density's `md`
 * control height, the recipe's fixed 6px corner, the 26px segment) and mirrors
 * the decisions a drawing cannot show: typed digits clamp in the text *and* the
 * value, one typed segment completes a value with the other read as zero,
 * emptying a segment clears the whole time, blur pads both, arrows carry through
 * one clock that wraps at midnight, and Clear is a 24px target that returns the
 * focus to the hours segment. A disabled field is read-only, dimmed, and leaves
 * the tab order — with no clear control at all.
 */

/** The clear control's glyph, at the size the shipped `sm` icon step paints. */
const ClearGlyph = () => (
  <svg
    aria-hidden="true"
    fill="none"
    height={14}
    viewBox="0 0 24 24"
    width={14}
  >
    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" />
  </svg>
);

interface PreviewTimeFieldProps {
  /** The group's accessible name, the way a caller names the field. */
  readonly label: string;
  readonly value: string | null;
  readonly onChange: (value: string | null) => void;
  /** Minutes per arrow step; typed minutes are never restricted. */
  readonly minuteStep?: number;
  readonly clearable?: boolean;
  readonly disabled?: boolean;
}

/**
 * One time field: a labelled group, two segments and the conditional clear.
 *
 * The text is local because the native field keeps raw digits while it reports
 * the canonical value; it adopts a value its caller changes only when the text
 * no longer composes to it, which is the component's own rule.
 */
const PreviewTimeField = ({
  label,
  value,
  onChange,
  minuteStep = 1,
  clearable = false,
  disabled = false,
}: PreviewTimeFieldProps) => {
  const [text, setText] = useState<TimeText>(() => timeText(value));
  const hoursInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (composeValue(text.hours, text.minutes) === value) return;
    setText(timeText(value));
  }, [value, text.hours, text.minutes]);

  const state: TimeState = {
    ...text,
    value: composeValue(text.hours, text.minutes),
  };

  const report = (next: TimeState): void => {
    setText({ hours: next.hours, minutes: next.minutes });
    onChange(next.value);
  };

  const edit = (segment: Segment, raw: string): void => {
    if (disabled) return;
    report(editSegment(state, segment, raw));
  };

  const step = (segment: Segment, direction: -1 | 1): void => {
    if (disabled) return;
    report(stepSegment(state, segment, direction, minuteStep));
  };

  const blur = (): void => {
    if (disabled) return;
    const padded = padOnBlur(state);
    setText({ hours: padded.hours, minutes: padded.minutes });
  };

  const clear = (): void => {
    if (disabled) return;
    report(clearTime());
    hoursInput.current?.focus();
  };

  const keyDown =
    (segment: Segment) =>
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      step(segment, event.key === "ArrowUp" ? 1 : -1);
    };

  return (
    <div className="gx-time-row">
      <span className="gx-time-label">{label}</span>
      <div
        aria-label={label}
        className="gx-time-field"
        data-disabled={disabled ? "" : undefined}
        role="group"
      >
        <input
          aria-label={`${label} hours`}
          className="gx-time-segment"
          disabled={disabled}
          inputMode="numeric"
          onBlur={blur}
          onChange={(event) => edit("hours", event.target.value)}
          onKeyDown={keyDown("hours")}
          placeholder="HH"
          ref={hoursInput}
          tabIndex={disabled ? -1 : 0}
          value={text.hours}
        />
        <span aria-hidden="true" className="gx-time-separator">
          :
        </span>
        <input
          aria-label={`${label} minutes`}
          className="gx-time-segment"
          disabled={disabled}
          inputMode="numeric"
          onBlur={blur}
          onChange={(event) => edit("minutes", event.target.value)}
          onKeyDown={keyDown("minutes")}
          placeholder="MM"
          tabIndex={disabled ? -1 : 0}
          value={text.minutes}
        />
        {clearable && state.value !== null && !disabled ? (
          <button
            aria-label="Clear time"
            className="gx-time-clear"
            onClick={clear}
            type="button"
          >
            <ClearGlyph />
          </button>
        ) : null}
      </div>
    </div>
  );
};

/** A deployment window a reviewer schedules: the value gates the save. */
const TimePickerWorkflow = () => {
  const [opens, setOpens] = useState<string | null>("09:30");
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <div className="gx-demo gx-time">
      <div className="gx-time-card">
        <div>
          <p className="gx-time-title">Deployment window</p>
          <p className="gx-time-meta" role="status">
            {describeValue(opens)}
            {saved === null ? "" : ` · saved ${saved}`}
          </p>
        </div>
        <PreviewTimeField
          clearable
          label="Opens at"
          minuteStep={15}
          onChange={(next) => {
            setOpens(next);
            setSaved(null);
          }}
          value={opens}
        />
        <div className="gx-time-actions">
          <button
            className="gx-btn gx-btn-primary gx-btn-sm"
            disabled={opens === null}
            onClick={() => setSaved(opens)}
            type="button"
          >
            Save window
          </button>
          <span className="gx-time-note">
            ArrowUp/Down move 15 minutes · typing clamps · blur pads · Clear
            reports null
          </span>
        </div>
      </div>
    </div>
  );
};

/** The states a drawing of one field cannot show side by side. */
const TimePickerStates = () => {
  const [empty, setEmpty] = useState<string | null>(null);
  const [filled, setFilled] = useState<string | null>("09:30");
  const [quarter, setQuarter] = useState<string | null>("09:30");
  const [midnight, setMidnight] = useState<string | null>("23:59");
  const archived: string | null = "07:00";

  return (
    <div className="gx-demo gx-time gx-time-states">
      <div className="gx-time-state">
        <span className="gx-time-state-label">
          Empty — the HH/MM hints, and no clear control
        </span>
        <PreviewTimeField
          label="Empty time"
          onChange={setEmpty}
          value={empty}
        />
        <span className="gx-time-state-note" role="status">
          {describeValue(empty)}
        </span>
      </div>
      <div className="gx-time-state">
        <span className="gx-time-state-label">
          Set — Clear is a 24px target that returns the focus
        </span>
        <PreviewTimeField
          clearable
          label="Set time"
          onChange={setFilled}
          value={filled}
        />
        <span className="gx-time-state-note" role="status">
          {describeValue(filled)}
        </span>
      </div>
      <div className="gx-time-state">
        <span className="gx-time-state-label">
          Quarter-hour step — arrows only; typed minutes still take 00..59
        </span>
        <PreviewTimeField
          label="Quarter-hour time"
          minuteStep={15}
          onChange={setQuarter}
          value={quarter}
        />
        <span className="gx-time-state-note" role="status">
          {describeValue(quarter)}
        </span>
      </div>
      <div className="gx-time-state">
        <span className="gx-time-state-label">
          Midnight — one clock carries and wraps
        </span>
        <PreviewTimeField
          label="Midnight time"
          onChange={setMidnight}
          value={midnight}
        />
        <span className="gx-time-state-note" role="status">
          {describeValue(midnight)}
        </span>
      </div>
      <div className="gx-time-state">
        <span className="gx-time-state-label">
          Disabled — read-only, dimmed, out of the tab order, and no clear
        </span>
        <PreviewTimeField
          clearable
          disabled
          label="Disabled time"
          onChange={() => undefined}
          value={archived}
        />
        <span className="gx-time-state-note">
          The value stays painted; no edit path exists.
        </span>
      </div>
    </div>
  );
};

const workflowSource = `import {
  TimePicker,
  TimePickerClear,
  TimePickerSegment,
  TimePickerSeparator,
} from "@gpuixui/components/time-picker";
import { Button } from "@gpuixui/primitives";
import { useState } from "react";

export const DeploymentWindow = () => {
  const [opens, setOpens] = useState<string | null>("09:30");
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <>
      <TimePicker
        clearable
        label="Opens at"
        minuteStep={15}
        onValueChange={(next) => {
          setOpens(next);
          setSaved(null);
        }}
        value={opens}
      >
        <TimePickerSegment segment="hours" />
        <TimePickerSeparator />
        <TimePickerSegment segment="minutes" />
        <TimePickerClear />
      </TimePicker>
      {/* \`opens\` is \`HH:mm\` or \`null\`; the app decides what "not set" means. */}
      <Button disabled={opens === null} onClick={() => setSaved(opens)}>
        {saved === null ? "Save window" : \`Saved \${saved}\`}
      </Button>
    </>
  );
};`;

const statesSource = `import {
  TimePicker,
  TimePickerClear,
  TimePickerSegment,
  TimePickerSeparator,
} from "@gpuixui/components/time-picker";

const Field = (props: {
  label: string;
  value?: string | null;
  minuteStep?: number;
  clearable?: boolean;
  disabled?: boolean;
}) => (
  <TimePicker
    label={props.label}
    value={props.value}
    minuteStep={props.minuteStep}
    clearable={props.clearable}
    disabled={props.disabled}
  >
    <TimePickerSegment segment="hours" />
    <TimePickerSeparator />
    <TimePickerSegment segment="minutes" />
    <TimePickerClear />
  </TimePicker>
);

<>
  {/* Empty: the painted HH/MM hints, no clear control. */}
  <Field label="Empty time" />

  {/* Set: \`clearable\` adds the 24px reset while a time exists. */}
  <Field label="Set time" value="09:30" clearable />

  {/* Arrows move 15 minutes; typed minutes still accept 00..59. */}
  <Field label="Quarter-hour time" value="09:30" minuteStep={15} />

  {/* 23:59 ArrowUp is 00:00 — one clock, wrapping across midnight. */}
  <Field label="Midnight time" value="23:59" />

  {/* Disabled is readOnly + dimmed; the clear control is not rendered. */}
  <Field label="Disabled time" value="07:00" clearable disabled />
</>;`;

/** One exported example per preview, with the usage its Code tab shows. */
export {
  TimePickerStates,
  TimePickerWorkflow,
  statesSource as timePickerStatesSource,
  workflowSource as timePickerWorkflowSource,
};
