/** @jsxImportSource @gpuix/react */
import type { ReactElement } from "react";
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import * as Option from "effect/Option";
import { accessibleName, fieldHelp } from "../core/a11y.js";
import type { ValueState } from "../core/state.js";
import { nativeTextTheme } from "../core/style.js";
import { controlSize } from "../core/theme.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { controlRing, keepContent } from "../core/focus.js";
import { fieldClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { fieldHint, renderFieldHint } from "./hint.js";
import {
  composeEvent,
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

export interface FieldState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}

export interface FieldProps
  extends
    ValueChangeProps<string>,
    InteractionProps,
    FieldHostProps,
    HelpProps {
  readonly value?: string;

  readonly defaultValue?: string;

  readonly onSubmit?: (event: EventPayload) => void;
  readonly placeholder?: string;
  readonly readOnly?: boolean;

  readonly disabled?: boolean;

  readonly autoFocus?: boolean;

  readonly invalid?: boolean;

  readonly size?: ControlSize;
  readonly fullWidth?: boolean;

  readonly label?: string;

  readonly tabIndex?: number;

  readonly style?: StateStyle<FieldState>;

  readonly className?: string;
  readonly testId?: string;
}

export const fieldChrome = (
  { invalid, disabled, fullWidth, style, className, size }: FieldProps,
  theme: PrimitiveTheme,
  focused: boolean,
): StyleDesc => {
  const resolved = recipeTw.classesToStyle(
    cn(fieldClass({ size: controlSize(size), invalid, fullWidth }), className),
    theme,
  );
  let base = resolved.style;
  if (invalid === true) base = mergeStyle(base, resolved.invalid);
  if (disabled === true) {
    base = mergeStyle(base, resolved.disabled);
    base = suppressFeedback(base);
  }
  const ring = controlRing(theme, { disabled, invalid });
  return mergeStyle(
    mergeStyle(mergeStyle(base, keepContent), ring),
    resolveStyle(style, {
      disabled: disabled === true,
      focused,
      invalid: invalid === true,
    }),
  );
};

export const fieldFrame: StyleDesc = { position: "relative" };

export const fieldHostProps = (
  props: FieldProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  focus: FocusState,
  onValueChange: (value: string) => void,
) => {
  const { ref, "aria-id": controlId, onLayout, tabIndex } = props;
  return {
    ref,
    "aria-id": controlId,
    onLayout,
    value: state.current,

    readOnly: props.readOnly === true || props.disabled === true,
    autoFocus: props.disabled === true ? undefined : props.autoFocus,

    tabIndex: props.disabled === true ? -1 : tabIndex,
    theme: nativeTextTheme(theme),
    testId: props.testId,
    "aria-label": accessibleName(props.label),
    "aria-description": fieldHelp(props, state.current),
    style: fieldChrome(props, theme, focus.focused),
    onChange: (event: EventPayload) => {
      if (props.disabled !== true) onValueChange(event.value ?? "");
    },
    onSubmit: props.disabled === true ? undefined : props.onSubmit,
    onClick: props.onClick,
    onKeyDown: props.onKeyDown,
    onKeyUp: props.onKeyUp,
    onFocus: composeEvent<EventPayload>(props.onFocus, focus.onFocus),
    onBlur: composeEvent<EventPayload>(props.onBlur, focus.onBlur),
  };
};

export const renderInput = (
  props: FieldProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  focus: FocusState,
  onValueChange: (value: string) => void,
): ReactElement => (
  <input {...fieldHostProps(props, theme, state, focus, onValueChange)} />
);

export type InputProps = FieldProps;

export const Input = (props: InputProps): ReactElement => {
  const theme = useTheme();
  const focus = useFocus();
  const field = useControlState(
    props.value,
    props.defaultValue ?? "",
    valueChange(props),
  );
  const hint = fieldHint(props, theme, field.value.current, {
    size: controlSize(props.size),
    align: "center",
    origin: "field",
  });
  return (
    <div style={fieldFrame}>
      {renderInput(props, theme, field.value, focus, field.set)}
      {Option.match(hint, {
        onNone: () => null,
        onSome: (hint) => renderFieldHint(hint, props.testId),
      })}
    </div>
  );
};
