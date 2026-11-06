/** @jsxImportSource @gpuix/react */
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useGpuix } from "@gpuix/react";
import type {
  EventPayload,
  KeyEvent,
  PublicInstance,
  StyleDesc,
} from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { cn } from "@gpuixui/tw";
import { isPlainKey } from "../core/keyboard.js";
import {
  applyOtpInput,
  decideOtpKey,
  normalizeOtp,
  otpCellCount,
  otpCells,
  otpEmptiedCell,
  type OtpEdit,
} from "../core/otp.js";
import { accessibleName, spokenSentence } from "../core/a11y.js";
import { controlRing, keepContent } from "../core/focus.js";
import { defaultMessages, type PrimitiveMessages } from "../core/messages.js";
import { nativeTextTheme } from "../core/style.js";
import type { ValueState } from "../core/state.js";
import { controlSize } from "../core/theme.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { fieldSquareClass, otpGroupClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import type { FieldState } from "./Input.js";
import {
  composeEvent,
  mergeRefs,
  mergeStyle,
  suppressFeedback,
  useControlState,
  valueChange,
  type FieldHostProps,
  type HelpProps,
  type InteractionProps,
  type ValueChangeProps,
} from "./internal.js";
import { useMessages } from "./MessagesProvider.js";
import { useTheme } from "./ThemeProvider.js";

export interface OTPFieldProps
  extends
    ValueChangeProps<string>,
    InteractionProps,
    FieldHostProps,
    HelpProps {
  readonly length?: number;

  readonly value?: string;
  readonly defaultValue?: string;

  readonly onComplete?: (value: string) => void;

  readonly onSubmit?: (event: EventPayload) => void;

  readonly size?: ControlSize;

  readonly disabled?: boolean;

  readonly invalid?: boolean;

  readonly label?: string;

  readonly autoFocus?: boolean;

  readonly style?: StateStyle<FieldState>;

  readonly className?: string;

  readonly children?: ReactNode;
  readonly testId?: string;
}

export interface OTPFieldFocus {
  readonly focusedIndex: Option.Option<number>;
  readonly onFocus: (index: number) => void;

  readonly onBlur: (index: number) => void;
}

export interface OTPFieldHandlers {
  readonly onEdit: (index: number, text: string) => void;
  readonly onKey: (index: number, key: string) => void;

  readonly onPick: (index: number) => void;
  readonly registerCell: (
    index: number,
  ) => (instance: PublicInstance | null) => void;
}

export const otpCellLabel = (
  label: string | undefined,
  index: number,
  messages: PrimitiveMessages = defaultMessages,
): string => {
  const name = accessibleName(label);
  return spokenSentence(
    messages.codeDigit(index, name),
    defaultMessages.codeDigit(index, name),
  );
};

export interface OTPFieldPart {
  readonly theme: PrimitiveTheme;
  readonly disabled: boolean;
  readonly label: string | undefined;

  readonly description: string | undefined;

  readonly address: FieldHostProps;
  readonly testId: string | undefined;
  readonly autoFocus: boolean | undefined;

  readonly cells: ReadonlyArray<string>;

  readonly focused: boolean;

  readonly rovingIndex: number;

  readonly onSubmit: ((event: EventPayload) => void) | undefined;
  readonly cellStyle: StyleDesc;
  readonly focus: OTPFieldFocus;
  readonly handlers: OTPFieldHandlers;

  readonly interaction: InteractionProps;
}

export const otpFieldPart = (
  props: OTPFieldProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  focus: OTPFieldFocus,
  handlers: OTPFieldHandlers,
): OTPFieldPart => {
  const limit = otpCellCount(props.length);
  const disabled = props.disabled === true;
  const resolved = recipeTw.classesToStyle(
    fieldSquareClass({ size: controlSize(props.size), invalid: props.invalid }),
    theme,
  );
  let cellStyle = mergeStyle(resolved.style, keepContent);
  if (props.invalid === true)
    cellStyle = mergeStyle(cellStyle, resolved.invalid);
  if (disabled) {
    cellStyle = suppressFeedback(mergeStyle(cellStyle, resolved.disabled));
  } else {
    cellStyle = mergeStyle(
      cellStyle,
      controlRing(theme, { disabled, invalid: props.invalid }),
    );
  }
  const code = normalizeOtp(state.current, limit);

  const focused = Option.filter(
    focus.focusedIndex,
    (index) => Number.isInteger(index) && index >= 0 && index < limit,
  );
  return {
    theme,
    disabled,
    label: accessibleName(props.label),
    description: accessibleName(props.description),
    address: props,
    testId: props.testId,
    autoFocus: disabled ? undefined : props.autoFocus,
    cells: otpCells(code, limit),
    focused: Option.isSome(focused),
    rovingIndex: Option.getOrElse(focused, () =>
      Math.min(code.length, Math.max(0, limit - 1)),
    ),
    onSubmit: disabled ? undefined : props.onSubmit,
    cellStyle,
    focus,
    handlers,
    interaction: props,
  };
};

const OtpFieldPartContext = createContext<OTPFieldPart | null>(null);

const useOtpFieldPart = (name: string): OTPFieldPart => {
  const part = useContext(OtpFieldPartContext);
  if (part === null) {
    throw new Error(`${name} must be used inside OTPField`);
  }
  return part;
};

export interface OTPFieldInputProps {
  readonly index: number;
  readonly style?: StyleDesc;

  readonly className?: string;
  readonly testId?: string;
}

export const renderOtpFieldInput = (
  { index, className, style, testId }: OTPFieldInputProps,
  part: OTPFieldPart,
  messages: PrimitiveMessages = defaultMessages,
): ReactElement => {
  const { disabled, focus, handlers } = part;

  const address: FieldHostProps = index === 0 ? part.address : {};
  return (
    <input
      key={`cell-${index}`}
      ref={mergeRefs(handlers.registerCell(index), address.ref)}
      testId={
        testId ??
        (part.testId === undefined
          ? undefined
          : `${part.testId}-cell-${index + 1}`)
      }
      value={part.cells[index] ?? ""}
      readOnly={disabled}
      autoFocus={index === 0 ? part.autoFocus : undefined}
      tabIndex={disabled ? -1 : index === part.rovingIndex ? 0 : -1}
      theme={nativeTextTheme(part.theme)}
      aria-label={otpCellLabel(part.label, index, messages)}
      aria-description={part.description}
      aria-id={address["aria-id"]}
      onLayout={address.onLayout}
      style={mergeStyle(
        mergeStyle(
          part.cellStyle,
          recipeTw.classesToStyle(className, part.theme).style,
        ),
        style,
      )}
      onChange={(event: EventPayload) => {
        if (disabled) return;
        handlers.onEdit(index, event.value ?? "");
      }}
      onSubmit={part.onSubmit}
      onKeyUp={composeEvent<KeyEvent>(part.interaction.onKeyUp, (event) => {
        if (disabled || !isPlainKey(event.modifiers)) return;
        handlers.onKey(index, event.key ?? "");
      })}
      onClick={composeEvent<EventPayload>(part.interaction.onClick, () => {
        if (disabled) return;
        handlers.onPick(index);
      })}
      onKeyDown={part.interaction.onKeyDown}
      onFocus={composeEvent<EventPayload>(part.interaction.onFocus, () =>
        focus.onFocus(index),
      )}
      onBlur={composeEvent<EventPayload>(part.interaction.onBlur, () =>
        focus.onBlur(index),
      )}
    />
  );
};

export const OTPFieldInput = (props: OTPFieldInputProps): ReactElement => {
  const part = useOtpFieldPart("OTPFieldInput");
  return renderOtpFieldInput(props, part, useMessages());
};

export const renderOtpField = (
  props: OTPFieldProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  focus: OTPFieldFocus,
  handlers: OTPFieldHandlers,
  messages: PrimitiveMessages = defaultMessages,
): ReactElement => {
  const part = otpFieldPart(props, theme, state, focus, handlers);
  const disabled = part.disabled;
  const group = recipeTw.classesToStyle(
    cn(otpGroupClass, props.className),
    theme,
  ).style;
  return (
    <div
      role="group"
      aria-label={accessibleName(props.label)}
      testId={props.testId}
      style={mergeStyle(
        group,
        resolveStyle(props.style, {
          disabled,
          focused: !disabled && part.focused,
          invalid: props.invalid === true,
        }),
      )}
    >
      <OtpFieldPartContext.Provider value={part}>
        {props.children ??
          Arr.map(part.cells, (_cell, index) =>
            renderOtpFieldInput({ index }, part, messages),
          )}
      </OtpFieldPartContext.Provider>
    </div>
  );
};

export const OTPField = (props: OTPFieldProps): ReactElement => {
  const theme = useTheme();
  const messages = useMessages();
  const { renderer } = useGpuix();
  const limit = otpCellCount(props.length);
  const cellIds = useRef<Map<number, number>>(new Map());

  const emptiedByEdit = useRef(false);
  const [focusedIndex, setFocusedIndex] = useState<Option.Option<number>>(
    Option.none(),
  );
  const state = useControlState(
    props.value,
    normalizeOtp(props.defaultValue, limit),
    valueChange(props),
  );
  const focusCell = (index: number): void => {
    setFocusedIndex(Option.some(index));
    Option.match(
      Option.all({
        id: Option.fromNullishOr(cellIds.current.get(index)),
        target: Option.fromNullishOr(renderer),
      }),
      {
        onNone: () => {},
        onSome: ({ id, target }) => target.focusElement?.(id),
      },
    );
  };
  const apply = (edit: OtpEdit): void => {
    const previous = normalizeOtp(state.value.current, limit);
    if (edit.value !== previous) {
      state.set(edit.value);

      if (previous.length < limit && edit.value.length === limit)
        props.onComplete?.(edit.value);
    }
    focusCell(edit.focus);
  };
  const focus: OTPFieldFocus = {
    focusedIndex,
    onFocus: (index) => setFocusedIndex(Option.some(index)),
    onBlur: (index) =>
      setFocusedIndex((current) =>
        Option.filter(current, (focused) => focused !== index),
      ),
  };
  const handlers: OTPFieldHandlers = {
    onEdit: (index, text) => {
      const current = state.value.current;
      const edit = applyOtpInput(current, index, text, limit);
      emptiedByEdit.current = otpEmptiedCell(current, edit.value, index, limit);
      apply(edit);
    },
    onKey: (index, key) => {
      const alreadyEmptied = emptiedByEdit.current;
      emptiedByEdit.current = false;
      if (key === "backspace" && alreadyEmptied) return;
      Option.match(decideOtpKey(state.value.current, index, key, limit), {
        onNone: () => {},
        onSome: apply,
      });
    },
    onPick: (index) =>
      focusCell(
        Math.min(index, normalizeOtp(state.value.current, limit).length),
      ),
    registerCell: (index) => (instance) => {
      if (instance === null) cellIds.current.delete(index);
      else cellIds.current.set(index, instance.id);
    },
  };
  return renderOtpField(props, theme, state.value, focus, handlers, messages);
};
