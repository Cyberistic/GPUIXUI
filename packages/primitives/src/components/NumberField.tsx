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
 *
 * The parts (`NumberFieldInput`, `NumberFieldIncrement`, `NumberFieldDecrement`)
 * read one resolved state, so a caller can drop or restyle a stepper without a
 * second render path. The default composition calls the same paint functions
 * directly and stays the input plus its spin column.
 */

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import type { EventPayload, PublicInstance, StyleDesc } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { useGpuix } from "@gpuix/react";
import * as Option from "effect/Option";
import { cn } from "@gpuixui/tw";
import { Icon } from "@gpuixui/icons";
import {
  clampNumeric,
  decideNumberKey,
  formatNumber,
  parseNumericText,
  stepNumber,
  type NumberRange,
} from "../core/number.js";
import { accessibleName } from "../core/a11y.js";
import { keyboardRing } from "../core/focus.js";
import { nativeTextTheme } from "../core/style.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  numberFieldClass,
  numberInputClass,
  numberStepperClass,
  numberStepperColumnClass,
} from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import type { FieldState } from "./Input.js";
import {
  mergeStyle,
  suppressFeedback,
  useControlState,
  useFocus,
  type FocusState,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface NumberFieldProps {
  /** Controlled value. Omit to let the field hold its own. */
  readonly value?: number;
  readonly defaultValue?: number;
  /** Called with the clamped value after a valid edit or a step. */
  readonly onChange?: (value: number) => void;
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
  /** Extra style, resolved against the field's live state and merged last. */
  readonly style?: StateStyle<FieldState>;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  /** The parts to draw. Omit for the input and its two steppers. */
  readonly children?: ReactNode;
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

/** What every part reads from the number field that owns it. */
export interface NumberFieldPart {
  readonly theme: PrimitiveTheme;
  readonly size: ControlSize;
  readonly invalid: boolean;
  readonly disabled: boolean;
  readonly text: string;
  readonly placeholder: string | undefined;
  readonly label: string | undefined;
  readonly autoFocus: boolean | undefined;
  /** The committed value, which the arrow keys step from. */
  readonly current: number;
  readonly range: NumberRange;
  readonly focus: FocusState;
  readonly handlers: NumberFieldHandlers;
  readonly atMin: boolean;
  readonly atMax: boolean;
}

/** Resolve a field's shared state once, for its root and every part. */
export const numberFieldPart = (
  props: NumberFieldProps,
  theme: PrimitiveTheme,
  state: ValueState<number>,
  text: string,
  focus: FocusState,
  handlers: NumberFieldHandlers,
): NumberFieldPart => {
  const disabled = props.disabled === true;
  return {
    theme,
    size: props.size ?? "md",
    invalid: props.invalid === true,
    disabled,
    text,
    placeholder: props.placeholder,
    label: accessibleName(props.label),
    autoFocus: disabled ? undefined : props.autoFocus,
    current: state.current,
    range: numberRange(props),
    focus,
    handlers,
    atMin: props.min !== undefined && state.current <= props.min,
    atMax: props.max !== undefined && state.current >= props.max,
  };
};

const NumberFieldPartContext = createContext<NumberFieldPart | null>(null);

const useNumberFieldPart = (name: string): NumberFieldPart => {
  const part = useContext(NumberFieldPartContext);
  if (part === null) {
    throw new Error(`${name} must be used inside NumberField`);
  }
  return part;
};

/** {@link NumberFieldInput} props. */
export interface NumberFieldInputProps {
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/** The field's text box. */
export const renderNumberFieldInput = (
  { className, style, testId }: NumberFieldInputProps,
  part: NumberFieldPart,
): ReactElement => {
  const { disabled, focus, handlers } = part;
  return (
    <input
      ref={handlers.registerInput}
      testId={testId}
      value={part.text}
      placeholder={part.placeholder}
      readOnly={disabled}
      autoFocus={part.autoFocus}
      tabIndex={disabled ? -1 : undefined}
      theme={nativeTextTheme(part.theme)}
      aria-label={part.label}
      style={mergeStyle(
        mergeStyle(
          recipeTw.classesToStyle(numberInputClass, part.theme).style,
          recipeTw.classesToStyle(className, part.theme).style,
        ),
        style,
      )}
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
        Option.match(decideNumberKey(part.current, part.range, key), {
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
  );
};

/** The field's text box, inside a number field. */
export const NumberFieldInput = (props: NumberFieldInputProps): ReactElement =>
  renderNumberFieldInput(props, useNumberFieldPart("NumberFieldInput"));

/** {@link NumberFieldIncrement} and {@link NumberFieldDecrement} props. */
export interface NumberFieldStepperProps {
  /** A custom glyph, drawn instead of the chevron. */
  readonly children?: ReactNode;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

const renderStepper = (
  { children, className, style, testId }: NumberFieldStepperProps,
  part: NumberFieldPart,
  direction: 1 | -1,
): ReactElement => {
  const blocked = direction === 1 ? part.atMax : part.atMin;
  const inert = part.disabled || blocked;
  return (
    <div
      role="presentation"
      testId={testId}
      onClick={() => {
        if (inert) return;
        part.handlers.onValue(stepNumber(part.current, part.range, direction));
      }}
      style={mergeStyle(
        mergeStyle(
          recipeTw.classesToStyle(numberStepperClass(inert), part.theme).style,
          recipeTw.classesToStyle(className, part.theme).style,
        ),
        style,
      )}
    >
      {children ?? (
        <Icon
          name={direction === 1 ? "chevron-up" : "chevron-down"}
          size="xs"
          color={
            inert
              ? part.theme.colors.placeholder
              : part.theme.colors.mutedForeground
          }
        />
      )}
    </div>
  );
};

/** The step-up affordance. */
export const NumberFieldIncrement = (
  props: NumberFieldStepperProps,
): ReactElement =>
  renderStepper(props, useNumberFieldPart("NumberFieldIncrement"), 1);

/** The step-down affordance. */
export const NumberFieldDecrement = (
  props: NumberFieldStepperProps,
): ReactElement =>
  renderStepper(props, useNumberFieldPart("NumberFieldDecrement"), -1);

/** The element a number field renders. Pure in its arguments. */
export const renderNumberField = (
  props: NumberFieldProps,
  theme: PrimitiveTheme,
  state: ValueState<number>,
  text: string,
  focus: FocusState,
  handlers: NumberFieldHandlers,
): ReactElement => {
  const part = numberFieldPart(props, theme, state, text, focus, handlers);
  const resolved = recipeTw.classesToStyle(
    cn(
      numberFieldClass({ size: part.size, invalid: part.invalid }),
      props.className,
    ),
    theme,
  );
  let chrome = resolved.style;
  if (part.invalid) chrome = mergeStyle(chrome, resolved.invalid);
  if (part.disabled)
    chrome = suppressFeedback(mergeStyle(chrome, resolved.disabled));
  chrome = mergeStyle(
    chrome,
    part.disabled ? {} : keyboardRing(theme, part.invalid),
  );
  chrome = mergeStyle(
    chrome,
    resolveStyle(props.style, {
      disabled: part.disabled,
      focused: focus.focused,
      invalid: part.invalid,
    }),
  );
  return (
    <div testId={props.testId} style={chrome}>
      <NumberFieldPartContext.Provider value={part}>
        {props.children ?? (
          <>
            {renderNumberFieldInput({}, part)}
            <div
              style={
                recipeTw.classesToStyle(numberStepperColumnClass, theme).style
              }
            >
              {renderStepper({}, part, 1)}
              {renderStepper({}, part, -1)}
            </div>
          </>
        )}
      </NumberFieldPartContext.Provider>
    </div>
  );
};

/** A number with steps and optional bounds. */
export const NumberField = (props: NumberFieldProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const focus = useFocus();
  const range = numberRange(props);
  const inputId = useRef<number | null>(null);
  const [draft, setDraft] = useState<Option.Option<string>>(Option.none());
  const [touched, setTouched] = useState(
    props.value !== undefined || props.defaultValue !== undefined,
  );
  const state = useControlState(
    props.value,
    clampNumeric(props.defaultValue ?? 0, range),
    props.onChange,
  );
  const display = (value: number): string =>
    props.formatValue?.(value) ?? formatNumber(value, props.precision ?? 0);
  // An untouched field with no value is empty, like a native number field; it is
  // not a field that starts with a zero the user has to delete.
  const text =
    !touched && Option.isNone(draft)
      ? ""
      : Option.getOrElse(draft, () => display(state.value.current));
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
      setDraft(Option.some(next));
      Option.match(parseNumericText(next), {
        onNone: () => {},
        onSome: (parsed) => state.set(clampNumeric(parsed, range)),
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
