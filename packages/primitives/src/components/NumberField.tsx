/**
 * `NumberField` — a number in a text field, with steps and bounds.
 *
 * GPUix's `<input>` has no `type="number"`: it is a text field, so the whole
 * numeric contract is this package's. `core/number.ts` owns parsing and
 * stepping; this file keeps the one piece of state a numeric *text* field needs
 * — the draft string, so typing `1.` does not become `1` under the caret — and
 * the focus ring.
 *
 * The steppers are pointer affordances, not tab stops: a keyboard user presses
 * Up/Down on the field itself, which is what a native spinner does and keeps the
 * tab order to one stop per field. PageUp/PageDown page. The caret keys are the
 * native editor's: GPUix consumes Left/Right/Home/End on key down before a
 * component handler sees them (measured, plan 338), so the field neither steps
 * on them nor offers a bound jump. Enter arrives as the host's `submit`
 * (measured, plan 339): the draft commits there, then the caller's `onSubmit`.
 *
 * **The bound is the field's, not the edit's.** A supplied `value` goes through
 * the same `clampNumeric` as typed text, so a record loaded with `150` under
 * `max={100}` paints `100` and steps from it (plan `362`). The two spin buttons
 * read the same normalised range as the keys, so a swapped pair leaves the
 * stepper live at the end that can move (plan `378`). A **disabled** field is
 * inert on every path, including the blur commit, and a caller's `onKeyUp`
 * reaches the input like every sibling's.
 */

import { useRef, useState, type ReactElement } from "react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import { useGpuix } from "@gpuix/react";
import * as Option from "effect/Option";
import { Icon } from "@gpuixui/icons";
import {
  clampNumeric,
  decideNumberKey,
  draftApplies,
  formatNumber,
  normalizeNumberRange,
  parseNumericText,
  stepNumber,
  type NumberDraft,
  type NumberRange,
} from "../core/number.js";
import { fieldRecipeStyle, fieldRowStyle } from "../core/recipes.js";
import {
  nativeTextTheme,
  numberInputStyle,
  numberStepperColumnStyle,
  numberStepperStyle,
} from "../core/style.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import type { FieldState } from "./Input.js";
import {
  ariaName,
  composeHandler,
  mergeStyle,
  passiveTriggerHandlers,
  resolvePartStyle,
  useControlState,
  useFocus,
  type FocusState,
  type StateStyle,
  type TriggerHandlers,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface NumberFieldProps extends TriggerHandlers {
  /** Controlled value. Omit to let the field hold its own. */
  readonly value?: number;
  readonly defaultValue?: number;
  /** Called with the clamped value after a valid edit or a step. */
  readonly onValueChange?: (value: number) => void;
  /**
   * Enter: the draft is committed and reformatted before this is called. The
   * host reports Enter as a `submit` on a single-line field (plan 339).
   */
  readonly onSubmit?: (event: EventPayload) => void;
  /** No lower bound when omitted. */
  readonly min?: number;
  /** No upper bound when omitted. */
  readonly max?: number;
  /** Defaults to 1. */
  readonly step?: number;
  /** Decimals shown on commit. Defaults to 0. */
  readonly precision?: number;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  /** Accessible name. The visible name goes in a `Label` beside it. */
  readonly label?: string;
  /**
   * Extra description announced after the name. A slot (a `Tooltip`) writes the
   * tip here. The inner text host receives no `onMouseEnter` in 0.10.0, so the
   * tip opens on keyboard focus only (plan `345`).
   */
  readonly "aria-description"?: string;
  readonly placeholder?: string;
  readonly autoFocus?: boolean;
  /** Overrides the display text; the value still parses with `core/number.ts`. */
  readonly formatValue?: (value: number) => string;
  /** An object, or a callback over this field's public state. */
  readonly style?: StateStyle<FieldState>;
  readonly testId?: string;
}

/** The range a field was configured with, made total. */
export const numberRange = (props: {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}): NumberRange =>
  normalizeNumberRange({
    min: props.min,
    max: props.max,
    step: props.step ?? 1,
  });

/** What the rendered field needs from the component that owns its state. */
export interface NumberFieldHandlers {
  readonly onTextChange: (text: string) => void;
  readonly onCommit: () => void;
  readonly onValue: (next: number) => void;
  readonly registerInput: (instance: PublicInstance | null) => void;
}

/** The element a number field renders. Pure in its arguments. */
export const renderNumberField = (
  props: NumberFieldProps,
  theme: PrimitiveTheme,
  state: ValueState<number>,
  text: string,
  focus: FocusState,
  handlers: NumberFieldHandlers,
): ReactElement => {
  const range = numberRange(props);
  const disabled = props.disabled === true;
  /**
   * The value the field *acts* on is the bounded one, whether it was typed or
   * supplied: a controlled `value={150}` under `max={100}` must step from
   * `100`. Reading the raw value disabled the up stepper while `ArrowUp`
   * reported a *smaller* `100` (measured, plan `362`).
   */
  const current = clampNumeric(state.current, range);
  const chrome = resolvePartStyle(
    mergeStyle(
      mergeStyle(
        fieldRecipeStyle(
          {
            focused: focus.focused,
            invalid: props.invalid === true,
            disabled,
          },
          theme,
        ),
        fieldRowStyle,
      ),
      // The stepper column owns the field's right edge.
      { paddingRight: 0 },
    ),
    props.style,
    {
      disabled,
      focused: focus.focused,
      invalid: props.invalid === true,
    },
  );
  // The spin buttons belong to the range the field acts on, so they read the
  // normalised bounds — the same rule the keys follow (plan `378`).
  const atMin = range.min !== undefined && current <= range.min;
  const atMax = range.max !== undefined && current >= range.max;
  const stepButton = (
    direction: 1 | -1,
    name: "chevron-up" | "chevron-down",
    blocked: boolean,
  ): ReactElement => (
    <div
      role="presentation"
      onClick={() => {
        if (disabled || blocked) return;
        handlers.onValue(stepNumber(current, range, direction));
      }}
      style={numberStepperStyle({ disabled: disabled || blocked }, theme)}
    >
      <Icon
        name={name}
        size="xs"
        color={
          disabled || blocked
            ? theme.colors.placeholder
            : theme.colors.mutedForeground
        }
      />
    </div>
  );
  return (
    <div testId={props.testId} style={chrome}>
      <input
        {...passiveTriggerHandlers(props)}
        ref={handlers.registerInput}
        testId={
          props.testId === undefined ? undefined : `${props.testId}-input`
        }
        value={text}
        placeholder={props.placeholder}
        readOnly={disabled}
        autoFocus={disabled ? undefined : props.autoFocus}
        tabIndex={disabled ? -1 : undefined}
        theme={nativeTextTheme(theme)}
        aria-label={ariaName(props.label)}
        aria-description={ariaName(props["aria-description"])}
        style={numberInputStyle()}
        onChange={(event: EventPayload) => {
          if (disabled) return;
          handlers.onTextChange(event.value ?? "");
        }}
        onKeyDown={(event: EventPayload) => {
          if (disabled) {
            props.onKeyDown?.(event);
            return;
          }
          Option.match(decideNumberKey(current, range, event.key ?? ""), {
            onNone: () => {},
            onSome: handlers.onValue,
          });
          props.onKeyDown?.(event);
        }}
        onKeyUp={props.onKeyUp}
        onSubmit={(event: EventPayload) => {
          if (disabled) return;
          handlers.onCommit();
          props.onSubmit?.(event);
        }}
        onFocus={composeHandler(focus.onFocus, props.onFocus)}
        onBlur={(event: EventPayload) => {
          focus.onBlur();
          // A disabled field is inert on every path (plan 362): the draft is
          // committed by a commit, not by losing a caret a disabled field no
          // longer owns.
          if (!disabled) handlers.onCommit();
          props.onBlur?.(event);
        }}
      />
      <div style={numberStepperColumnStyle(theme)}>
        {stepButton(1, "chevron-up", atMax)}
        {stepButton(-1, "chevron-down", atMin)}
      </div>
    </div>
  );
};

/** A number with steps and optional bounds. */
export const NumberField = (props: NumberFieldProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const inputId = useRef<number | null>(null);
  const focus = useFocus(
    props.autoFocus === true && props.disabled !== true,
    () => inputId.current ?? undefined,
  );
  const range = numberRange(props);
  const [draft, setDraft] = useState<Option.Option<NumberDraft>>(Option.none());
  const [touched, setTouched] = useState(
    props.value !== undefined || props.defaultValue !== undefined,
  );
  const state = useControlState(
    props.value,
    clampNumeric(props.defaultValue ?? 0, range),
    props.onValueChange,
  );
  const display = (value: number): string =>
    props.formatValue?.(value) ?? formatNumber(value, props.precision ?? 0);
  // An untouched field with no value is empty, like a native number field; it is
  // not a field that starts with a zero the user has to delete. A draft paints
  // only while the value is still the one it belongs to, so an external change
  // (a reset, a reloaded record) is not hidden behind stale text — and a value
  // supplied after mount shows even though the field mounted untouched.
  //
  // The displayed (and stepped) value is the bounded one: a record loaded with
  // `value={150}` under `max={100}` paints `100`, because a field must not show
  // a number it would refuse to accept (plan `362`).
  const current = clampNumeric(state.value.current, range);
  const showValue = touched || state.value.mode === "controlled";
  const text = Option.match(
    Option.filter(draft, (candidate) => draftApplies(candidate, current)),
    {
      onNone: () => (showValue ? display(current) : ""),
      onSome: (candidate) => candidate.text,
    },
  );
  const focusInput = (): void =>
    Option.match(Option.fromNullishOr(inputId.current), {
      onNone: () => {},
      onSome: (id) => renderer?.focusElement?.(id),
    });
  return renderNumberField(props, theme, state.value, text, focus, {
    registerInput: (instance) => {
      inputId.current = instance?.id ?? null;
    },
    onTextChange: (next) => {
      setTouched(true);
      const parsed = Option.map(parseNumericText(next), (value) =>
        clampNumeric(value, range),
      );
      setDraft(Option.some({ text: next, base: current, reported: parsed }));
      Option.match(parsed, {
        onNone: () => {},
        onSome: state.set,
      });
    },
    onCommit: () =>
      Option.match(parseNumericText(text), {
        onNone: () => setDraft(Option.none()),
        onSome: (parsed) => {
          const value = clampNumeric(parsed, range);
          // Report against the value the field paints, not the parent's raw
          // one: an out-of-range supplied value has already been normalised on
          // screen, so committing it must not wake the parent (plan 362).
          if (!Object.is(value, current)) state.set(value);
          setDraft(Option.none());
        },
      }),
    onValue: (next) => {
      setTouched(true);
      const value = clampNumeric(next, range);
      // Stepping past a bound is a no-op on the painted value; it must not
      // report the bound as a change from the raw supplied value (plan 362).
      if (!Object.is(value, current)) state.set(value);
      setDraft(Option.none());
      focusInput();
    },
  });
};
