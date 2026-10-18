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
 * tab order to one stop per field.
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
  parseNumericText,
  stepNumber,
  type NumberDraft,
  type NumberRange,
} from "../core/number.js";
import {
  controlFocusStyle,
  controlStyle,
  fieldTextStyle,
  nativeTextTheme,
  numberInputStyle,
  numberStepperColumnStyle,
  numberStepperStyle,
} from "../core/style.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { fieldVariant } from "../core/variants.js";
import type { FieldState } from "./Input.js";
import {
  mergeStyle,
  resolvePartStyle,
  useControlState,
  useFocus,
  type FocusState,
  type StateStyle,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface NumberFieldProps {
  /** Controlled value. Omit to let the field hold its own. */
  readonly value?: number;
  readonly defaultValue?: number;
  /** Called with the clamped value after a valid edit or a step. */
  readonly onValueChange?: (value: number) => void;
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
  readonly placeholder?: string;
  readonly autoFocus?: boolean;
  /** Overrides the display text; the value still parses with `core/number.ts`. */
  readonly formatValue?: (value: number) => string;
  /** An object, or a callback over this field's public state. */
  readonly style?: StateStyle<FieldState>;
  readonly testId?: string;
}

/** The range a field was configured with. */
export const numberRange = (props: {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}): NumberRange => ({
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
  const spec = {
    variant: fieldVariant,
    size: props.size ?? "md",
    invalid: props.invalid,
    disabled: props.disabled,
  };
  const chrome = resolvePartStyle(
    mergeStyle(
      mergeStyle(mergeStyle(controlStyle(spec, theme), fieldTextStyle(theme)), {
        paddingRight: 0,
      }),
      focus.focused && !disabled ? controlFocusStyle(spec, theme) : {},
    ),
    props.style,
    {
      disabled,
      focused: focus.focused,
      invalid: props.invalid === true,
    },
  );
  const atMin = props.min !== undefined && state.current <= props.min;
  const atMax = props.max !== undefined && state.current >= props.max;
  const stepButton = (
    direction: 1 | -1,
    name: "chevron-up" | "chevron-down",
    blocked: boolean,
  ): ReactElement => (
    <div
      role="presentation"
      onClick={() => {
        if (disabled || blocked) return;
        handlers.onValue(stepNumber(state.current, range, direction));
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
        ref={handlers.registerInput}
        value={text}
        placeholder={props.placeholder}
        readOnly={disabled}
        autoFocus={disabled ? undefined : props.autoFocus}
        tabIndex={disabled ? -1 : undefined}
        theme={nativeTextTheme(theme)}
        aria-label={props.label}
        style={numberInputStyle()}
        onChange={(event: EventPayload) => {
          if (disabled) return;
          handlers.onTextChange(event.value ?? "");
        }}
        onKeyDown={(event: EventPayload) => {
          if (disabled) return;
          const key = event.key ?? "";
          if (key === "enter") {
            handlers.onCommit();
            return;
          }
          Option.match(decideNumberKey(state.current, range, key), {
            onNone: () => {},
            onSome: handlers.onValue,
          });
        }}
        onFocus={focus.onFocus}
        onBlur={() => {
          focus.onBlur();
          handlers.onCommit();
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
  const focus = useFocus(props.autoFocus === true && props.disabled !== true);
  const range = numberRange(props);
  const inputId = useRef<number | null>(null);
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
  const current = state.value.current;
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
          state.set(clampNumeric(parsed, range));
          setDraft(Option.none());
        },
      }),
    onValue: (next) => {
      setTouched(true);
      state.set(clampNumeric(next, range));
      setDraft(Option.none());
      focusInput();
    },
  });
};
