/** @jsxImportSource @gpuix/react */
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
import { isPlainKey } from "../core/keyboard.js";
import { primaryButton } from "../core/pointer.js";
import {
  clampNumeric,
  commitNumberDraft,
  decideNumberKey,
  initNumberDraft,
  normalizeNumberRange,
  numberDisplay,
  numberDraftText,
  parseNumberText,
  scrubNumber,
  SCRUB_PIXELS_PER_STEP,
  SHIFT_SCRUB_SCALE,
  stepNumber,
  syncNumberDraft,
  withNumberDraftText,
  withNumberDraftValue,
  type NumberRange,
  type ParseValue,
} from "../core/number.js";
import { accessibleName, fieldHelp } from "../core/a11y.js";
import { controlRing, keepContent } from "../core/focus.js";
import { nativeTextTheme } from "../core/style.js";
import type { ValueState } from "../core/state.js";
import { colorRole, controlSize } from "../core/theme.js";
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
  readonly value?: number;
  readonly defaultValue?: number;

  readonly min?: number;

  readonly max?: number;

  readonly step?: number;

  readonly precision?: number;

  readonly size?: ControlSize;
  readonly disabled?: boolean;
  readonly invalid?: boolean;

  readonly label?: string;
  readonly placeholder?: string;
  readonly autoFocus?: boolean;

  readonly onSubmit?: (event: EventPayload) => void;

  readonly onValueCommit?: (value: number) => void;

  readonly formatValue?: (value: number) => string;

  readonly parseValue?: ParseValue;

  readonly style?: StateStyle<FieldState>;

  readonly className?: string;

  readonly children?: ReactNode;
  readonly testId?: string;
}

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

export interface NumberFieldHandlers {
  readonly onTextChange: (text: string) => void;
  readonly onCommit: () => void;
  readonly onValue: (next: number) => void;
  readonly registerInput: (instance: PublicInstance | null) => void;
}

export interface NumberFieldScrub {
  readonly onMouseDown: (event: EventPayload) => void;
  readonly onMouseMove: (event: EventPayload) => void;
  readonly onMouseUp: () => void;

  readonly consumedClick: () => boolean;
}

interface ScrubOptions {
  readonly current: number;
  readonly range: NumberRange;
  readonly disabled: boolean;

  readonly axis: "x" | "y";
  readonly onValue: (next: number) => void;

  readonly onEnd: (value: number) => void;
}

const useNumberScrub = ({
  current,
  range,
  disabled,
  axis,
  onValue,
  onEnd,
}: ScrubOptions): NumberFieldScrub => {
  const at = (event: EventPayload): Option.Option<number> =>
    Option.fromNullishOr(axis === "y" ? event.y : event.x);

  const travel = (origin: number, now: number): number =>
    axis === "y" ? origin - now : now - origin;
  const press = useRef<
    Option.Option<{ readonly at: number; readonly value: number }>
  >(Option.none());
  const scrubbed = useRef(false);

  const last = useRef<Option.Option<number>>(Option.none());
  return {
    onMouseDown: (event) => {
      if (!primaryButton(event)) return;

      scrubbed.current = false;
      last.current = Option.some(current);
      press.current = Option.map(at(event), (at) => ({
        at,
        value: current,
      }));
    },
    onMouseMove: (event) => {
      if (disabled || event.pressedButton !== 0) {
        press.current = Option.none();
        return;
      }
      const held = event.modifiers?.shift === true ? SHIFT_SCRUB_SCALE : 1;
      Option.match(
        Option.all({
          origin: press.current,
          at: at(event),
        }),
        {
          onNone: () => {},
          onSome: ({ origin, at }) => {
            const next = scrubNumber(
              origin.value,
              travel(origin.at, at),
              range,
              SCRUB_PIXELS_PER_STEP,
              held,
            );
            if (next === current) return;
            scrubbed.current = true;
            last.current = Option.some(next);
            onValue(next);
          },
        },
      );
    },
    onMouseUp: () => {
      const moved = scrubbed.current;
      const ended = last.current;
      press.current = Option.none();
      last.current = Option.none();
      if (!moved) return;

      Option.match(ended, {
        onNone: () => {},
        onSome: onEnd,
      });
    },
    consumedClick: () => {
      const moved = scrubbed.current;
      scrubbed.current = false;
      return moved;
    },
  };
};

export interface NumberFieldPart {
  readonly theme: PrimitiveTheme;
  readonly size: ControlSize;
  readonly invalid: boolean;
  readonly disabled: boolean;
  readonly text: string;
  readonly placeholder: string | undefined;
  readonly label: string | undefined;
  readonly autoFocus: boolean | undefined;

  readonly address: FieldHostProps;

  readonly testId: string | undefined;

  readonly description: string | undefined;

  readonly onSubmit: ((event: EventPayload) => void) | undefined;

  readonly current: number;
  readonly range: NumberRange;
  readonly focus: FocusState;
  readonly handlers: NumberFieldHandlers;

  readonly scrub: Option.Option<NumberFieldScrub>;

  readonly interaction: InteractionProps;
  readonly atMin: boolean;
  readonly atMax: boolean;
}

export const numberFieldPart = (
  props: NumberFieldProps,
  theme: PrimitiveTheme,
  state: ValueState<number>,
  text: string,
  focus: FocusState,
  handlers: NumberFieldHandlers,
  scrub: Option.Option<NumberFieldScrub> = Option.none(),
): NumberFieldPart => {
  const disabled = props.disabled === true;
  const range = numberRange(props);

  const current = clampNumeric(state.current, range);
  return {
    theme,
    size: controlSize(props.size),
    invalid: props.invalid === true,
    disabled,
    text,
    placeholder: props.placeholder,
    label: accessibleName(props.label),
    autoFocus: disabled ? undefined : props.autoFocus,
    address: props,
    testId: props.testId,

    description: fieldHelp(props, text),
    onSubmit: disabled ? undefined : props.onSubmit,
    current,
    range,
    focus,
    handlers,
    scrub,
    interaction: props,
    atMin: range.min !== undefined && current <= range.min,
    atMax: range.max !== undefined && current >= range.max,
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

export interface NumberFieldInputProps {
  readonly style?: StyleDesc;

  readonly className?: string;
  readonly testId?: string;
}

const NUMBER_INPUT_FRAME: StyleDesc = {
  position: "relative",
  flexGrow: 1,
  flexShrink: 1,
  minWidth: 0,
  height: "100%",
};

export const renderNumberFieldInput = (
  { className, style, testId }: NumberFieldInputProps,
  part: NumberFieldPart,
): ReactElement => {
  const { disabled, focus, handlers } = part;

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
            if (disabled || !isPlainKey(event.modifiers)) return;
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

export const NumberFieldInput = (props: NumberFieldInputProps): ReactElement =>
  renderNumberFieldInput(props, useNumberFieldPart("NumberFieldInput"));

export interface NumberFieldScrubHandleProps {
  readonly value: number;

  readonly min?: number;

  readonly max?: number;

  readonly step?: number;
  readonly disabled?: boolean;

  readonly onValueChange: (next: number) => void;

  readonly onValueCommit?: (value: number) => void;

  readonly children?: ReactNode;

  readonly style?: StyleDesc;
  readonly className?: string;
  readonly testId?: string;
}

export const NumberFieldScrubHandle = ({
  value,
  min,
  max,
  step,
  disabled,
  onValueChange,
  onValueCommit,
  children,
  style,
  className,
  testId,
}: NumberFieldScrubHandleProps): ReactElement => {
  const theme = useTheme();
  const range = numberRange({ min, max, step });
  const gesture = useNumberScrub({
    current: clampNumeric(value, range),
    range,
    disabled: disabled === true,
    axis: "x",
    onValue: onValueChange,
    onEnd: (next) => onValueCommit?.(next),
  });
  const inert = disabled === true;
  const wash = inert ? undefined : colorRole(theme, "hover");
  return (
    <div
      role="presentation"
      testId={testId}
      onMouseDown={inert ? undefined : gesture.onMouseDown}
      onMouseMove={inert ? undefined : gesture.onMouseMove}
      onMouseUp={inert ? undefined : gesture.onMouseUp}
      style={mergeStyle(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          minWidth: 0,
          cursor: inert ? "default" : "col-resize",

          ...(wash === undefined
            ? {}
            : {
                hover: {
                  backgroundColor: wash,
                  borderRadius: theme.radius.sm,
                },
              }),
        },
        mergeStyle(recipeTw.classesToStyle(className, theme).style, style),
      )}
    >
      {children}
    </div>
  );
};

export interface NumberFieldStepperProps {
  readonly children?: ReactNode;
  readonly style?: StyleDesc;

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

  const scrub = part.disabled ? Option.none<NumberFieldScrub>() : part.scrub;
  const consumedClick = (): boolean =>
    Option.match(scrub, {
      onNone: () => false,
      onSome: (gesture) => gesture.consumedClick(),
    });

  const glyphColor = inert
    ? colorRole(part.theme, "placeholder")
    : colorRole(part.theme, "mutedForeground");
  return (
    <div
      role="presentation"
      testId={testId}
      onMouseDown={Option.getOrUndefined(
        Option.map(scrub, (gesture) => gesture.onMouseDown),
      )}
      onMouseMove={Option.getOrUndefined(
        Option.map(scrub, (gesture) => gesture.onMouseMove),
      )}
      onMouseUp={Option.getOrUndefined(
        Option.map(scrub, (gesture) => gesture.onMouseUp),
      )}
      onClick={composeEvent<EventPayload>(part.interaction.onClick, () => {
        if (consumedClick() || inert) return;
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
      {children ??
        (glyphColor === undefined ? null : (
          <Icon
            name={direction === 1 ? "chevron-up" : "chevron-down"}
            size="xs"
            color={glyphColor}
          />
        ))}
    </div>
  );
};

export const NumberFieldIncrement = (
  props: NumberFieldStepperProps,
): ReactElement =>
  renderStepper(props, useNumberFieldPart("NumberFieldIncrement"), 1);

export const NumberFieldDecrement = (
  props: NumberFieldStepperProps,
): ReactElement =>
  renderStepper(props, useNumberFieldPart("NumberFieldDecrement"), -1);

export const renderNumberField = (
  props: NumberFieldProps,
  theme: PrimitiveTheme,
  state: ValueState<number>,
  text: string,
  focus: FocusState,
  handlers: NumberFieldHandlers,
  scrub?: NumberFieldScrub,
): ReactElement => {
  const part = numberFieldPart(
    props,
    theme,
    state,
    text,
    focus,
    handlers,
    Option.fromNullishOr(scrub),
  );
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
    numberDisplay(value, props.precision, props.formatValue);

  const read = (text: string): Option.Option<number> =>
    parseNumberText(text, props.parseValue);

  const folded = syncNumberDraft(draft, incoming, range, props.parseValue);
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

  const dirty = useRef(false);

  const apply = (next: number): number => {
    const clamped = clampNumeric(next, range);
    state.set(clamped);
    setDraft((current) => withNumberDraftValue(commitNumberDraft(current)));
    dirty.current = false;
    return clamped;
  };

  const scrub = useNumberScrub({
    current: clampNumeric(state.value.current, range),
    range,
    disabled: props.disabled === true,
    axis: "y",
    onValue: (next) => {
      apply(next);
    },
    onEnd: (value) => {
      focusInput();
      props.onValueCommit?.(value);
    },
  });
  return renderNumberField(
    props,
    theme,
    state.value,
    text,
    focus,
    {
      registerInput: (instance) => {
        inputId.current = instance?.id ?? null;
      },
      onTextChange: (next) => {
        const parsed = read(next);

        dirty.current = Option.isSome(parsed);
        setDraft((current) => {
          const typed = withNumberDraftText(current, next);
          return Option.isSome(parsed) ? withNumberDraftValue(typed) : typed;
        });
        Option.match(parsed, {
          onNone: () => {},
          onSome: (parsed) => state.set(clampNumeric(parsed, range)),
        });
      },
      onCommit: () => {
        const parsed = read(text);
        const edited = dirty.current;
        dirty.current = false;
        Option.match(parsed, {
          onNone: () => setDraft((current) => commitNumberDraft(current)),
          onSome: (parsed) => {
            const next = clampNumeric(parsed, range);
            state.set(next);
            setDraft((current) =>
              withNumberDraftValue(commitNumberDraft(current)),
            );
            if (edited) props.onValueCommit?.(next);
          },
        });
      },
      onValue: (next) => {
        const before = clampNumeric(state.value.current, range);
        const value = apply(next);
        focusInput();
        if (value !== before) props.onValueCommit?.(value);
      },
    },
    scrub,
  );
};
