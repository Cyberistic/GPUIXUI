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
import type {
  EventPayload,
  KeyEvent,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { useGpuix } from "@gpuix/react";
import * as Option from "effect/Option";
import { cn } from "@gpuixui/tw";
import { Icon } from "@gpuixui/icons";
import {
  clampNumeric,
  commitNumberDraft,
  decideNumberKey,
  formatNumber,
  initNumberDraft,
  numberDraftText,
  parseNumericText,
  stepNumber,
  syncNumberDraft,
  withNumberDraftText,
  type NumberRange,
} from "../core/number.js";
import { accessibleName } from "../core/a11y.js";
import { controlRing, keepContent } from "../core/focus.js";
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
import { fieldHint, renderFieldHint } from "./hint.js";
import {
  composeEvent,
  mergeRefs,
  mergeStyle,
  suppressFeedback,
  useControlState,
  useFocus,
  valueChange,
  type FieldHostProps,
  type FocusState,
  type HelpProps,
  type InteractionProps,
  type ValueChangeProps,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface NumberFieldProps
  extends
    ValueChangeProps<number>,
    InteractionProps,
    FieldHostProps,
    HelpProps {
  /** Controlled value. Omit to let the field hold its own. */
  readonly value?: number;
  readonly defaultValue?: number;
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
  /**
   * Enter in the input. A single-line GPUix `<input>` binds Enter to the
   * runtime's own Submit action, so it never reaches `onKeyDown`: the field
   * commits its draft first (reformatting it to `precision`) and then reports
   * here. No listener is installed while `disabled`.
   */
  readonly onSubmit?: (event: EventPayload) => void;
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
  /** The address the caller gave the field; it lands on the input, not the chrome. */
  readonly address: FieldHostProps;
  /** The field's stable locator, which its hint derives from. */
  readonly testId: string | undefined;
  /** The announced help, already blank-filtered. */
  readonly description: string | undefined;
  /** The caller's Enter report; the field's commit runs before it. */
  readonly onSubmit: ((event: EventPayload) => void) | undefined;
  /** The committed value, which the arrow keys step from. */
  readonly current: number;
  readonly range: NumberRange;
  readonly focus: FocusState;
  readonly handlers: NumberFieldHandlers;
  /** The caller's host handlers, installed on the input and the steppers. */
  readonly interaction: InteractionProps;
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
  const range = numberRange(props);
  // What the field paints is also what it steps from: a value it cannot lay out
  // (a non-finite one) reads as a bound instead of reaching the text.
  const current = clampNumeric(state.current, range);
  return {
    theme,
    size: props.size ?? "md",
    invalid: props.invalid === true,
    disabled,
    text,
    placeholder: props.placeholder,
    label: accessibleName(props.label),
    autoFocus: disabled ? undefined : props.autoFocus,
    address: props,
    testId: props.testId,
    description: accessibleName(props.description),
    onSubmit: disabled ? undefined : props.onSubmit,
    current,
    range,
    focus,
    handlers,
    interaction: props,
    atMin: props.min !== undefined && current <= props.min,
    atMax: props.max !== undefined && current >= props.max,
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

/** The input's positioning frame, so its hint can sit over the empty host. */
const NUMBER_INPUT_FRAME: StyleDesc = {
  position: "relative",
  flexGrow: 1,
  flexShrink: 1,
  minWidth: 0,
  height: "100%",
};

/** The field's text box. */
export const renderNumberFieldInput = (
  { className, style, testId }: NumberFieldInputProps,
  part: NumberFieldPart,
): ReactElement => {
  const { disabled, focus, handlers } = part;
  /**
   * The chrome holds the ring and the dim opt-out, not the wrapper: the runtime
   * paints `focusVisible` only on the element that holds the focus, which is
   * this `<input>`.
   */
  const chrome = mergeStyle(
    mergeStyle(
      mergeStyle(
        recipeTw.classesToStyle(numberInputClass, part.theme).style,
        recipeTw.classesToStyle(className, part.theme).style,
      ),
      keepContent,
    ),
    controlRing(part.theme, {
      disabled: part.disabled,
      invalid: part.invalid,
    }),
  );
  const addressed = testId ?? part.testId;
  const hint = fieldHint(part, part.theme, part.text, {
    size: part.size,
    align: "center",
    origin: "content",
  });
  return (
    <div style={NUMBER_INPUT_FRAME}>
      <input
        ref={mergeRefs(handlers.registerInput, part.address.ref)}
        testId={testId}
        value={part.text}
        readOnly={disabled}
        autoFocus={part.autoFocus}
        tabIndex={disabled ? -1 : undefined}
        theme={nativeTextTheme(part.theme)}
        aria-label={part.label}
        aria-description={part.description}
        aria-id={part.address["aria-id"]}
        onLayout={part.address.onLayout}
        style={mergeStyle({ width: "100%" }, mergeStyle(chrome, style))}
        onChange={(event: EventPayload) => {
          if (disabled) return;
          handlers.onTextChange(event.value ?? "");
        }}
        onSubmit={
          part.disabled
            ? undefined
            : (event: EventPayload) => {
                handlers.onCommit();
                part.onSubmit?.(event);
              }
        }
        onClick={part.interaction.onClick}
        onKeyDown={composeEvent<KeyEvent>(
          part.interaction.onKeyDown,
          (event) => {
            if (disabled) return;
            Option.match(
              decideNumberKey(part.current, part.range, event.key ?? ""),
              {
                onNone: () => {},
                onSome: handlers.onValue,
              },
            );
          },
        )}
        onKeyUp={part.interaction.onKeyUp}
        onFocus={composeEvent<EventPayload>(
          part.interaction.onFocus,
          focus.onFocus,
        )}
        onBlur={composeEvent<EventPayload>(part.interaction.onBlur, () => {
          focus.onBlur();
          handlers.onCommit();
        })}
      />
      {Option.match(hint, {
        onNone: () => null,
        onSome: (hint) => renderFieldHint(hint, addressed),
      })}
    </div>
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
      onClick={composeEvent<EventPayload>(part.interaction.onClick, () => {
        if (inert) return;
        part.handlers.onValue(stepNumber(part.current, part.range, direction));
      })}
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
  const incoming = Option.fromNullishOr(props.value);
  const [draft, setDraft] = useState(() =>
    initNumberDraft(
      incoming,
      Option.isSome(Option.fromNullishOr(props.defaultValue)),
    ),
  );
  const state = useControlState(
    props.value,
    clampNumeric(props.defaultValue ?? 0, range),
    valueChange(props),
  );
  const display = (value: number): string =>
    props.formatValue?.(value) ?? formatNumber(value, props.precision ?? 0);
  // The owner's value moved: fold it into the draft, so a controlled field
  // shows what its owner says — a value that arrives after mount included —
  // while the text being typed survives only while it still means that value.
  const folded = syncNumberDraft(draft, incoming, range);
  if (Option.isSome(folded)) setDraft(folded.value);
  const effective = Option.getOrElse(folded, () => draft);
  const text = numberDraftText(
    effective,
    clampNumeric(state.value.current, range),
    display,
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
      setDraft((current) => withNumberDraftText(current, next));
      Option.match(parseNumericText(next), {
        onNone: () => {},
        onSome: (parsed) => state.set(clampNumeric(parsed, range)),
      });
    },
    onCommit: () =>
      Option.match(parseNumericText(text), {
        onNone: () => setDraft((current) => commitNumberDraft(current)),
        onSome: (parsed) => {
          state.set(clampNumeric(parsed, range));
          setDraft((current) => commitNumberDraft(current));
        },
      }),
    onValue: (next) => {
      state.set(clampNumeric(next, range));
      setDraft((current) => commitNumberDraft(current));
      focusInput();
    },
  });
};
