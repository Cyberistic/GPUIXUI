/**
 * `Input` — a single-line text field.
 *
 * GPUix's `<input>` holds its text natively and reports every edit through
 * `onChange`'s `event.value`; `value` is the external value pushed back in. The
 * controlled/uncontrolled decision is `core/state.ts`'s, so a field and a
 * checkbox cannot disagree about which value wins.
 */

import type { ReactElement } from "react";
import type { EventPayload, StyleDesc } from "@gpuix/react";
import type { ValueState } from "../core/state.js";
import {
  controlFocusStyle,
  controlStyle,
  fieldTextStyle,
  nativeTextTheme,
} from "../core/style.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { fieldVariant } from "../core/variants.js";
import {
  mergeStyle,
  resolvePartStyle,
  useControlState,
  useFocus,
  type FocusState,
  type StateStyle,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** The public state a field's style callback receives. */
export interface FieldState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}

/** Props shared by `Input` and `TextArea`. */
export interface FieldProps {
  /** Controlled text. Omit it to let the field hold its own draft. */
  readonly value?: string;
  /** Initial text when uncontrolled. */
  readonly defaultValue?: string;
  /** Called with the text after every edit, only when it actually changed. */
  readonly onChange?: (value: string) => void;
  /**
   * Enter in an `<input>`. A `TextArea` does not take this: the runtime would
   * turn Enter into a submit and take the newline away (plan 046).
   */
  readonly onSubmit?: (event: EventPayload) => void;
  readonly placeholder?: string;
  readonly readOnly?: boolean;
  /**
   * Not editable, out of the tab order, and painted with the disabled chrome.
   * The host has no `disabled` prop, so this is read-only plus the guards below
   * — assistive technology sees a read-only field (plan 025).
   */
  readonly disabled?: boolean;
  /** Take keyboard focus on mount. Required for a field to receive key events. */
  readonly autoFocus?: boolean;
  /** Validation failed: the border takes the destructive role. */
  readonly invalid?: boolean;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  readonly fullWidth?: boolean;
  /** Accessible name. The visible name goes in a `Label` beside it. */
  readonly label?: string;
  /** An object, or a callback over this field's public state. */
  readonly style?: StateStyle<FieldState>;
  readonly testId?: string;
}

/** The chrome a field element draws, shared by the input and the textarea. */
export const fieldChrome = (
  { size = "md", invalid, disabled, fullWidth, style }: FieldProps,
  theme: PrimitiveTheme,
  focused: boolean,
): StyleDesc => {
  const spec = { variant: fieldVariant, size, invalid, disabled, fullWidth };
  const base = mergeStyle(
    mergeStyle(controlStyle(spec, theme), fieldTextStyle(theme)),
    disabled === true ? { cursor: "not-allowed" } : undefined,
  );
  const ring =
    focused && disabled !== true ? controlFocusStyle(spec, theme) : {};
  return resolvePartStyle(mergeStyle(base, ring), style, {
    disabled: disabled === true,
    focused,
    invalid: invalid === true,
  });
};

/** The props an `<input>`/`<textarea>` shares, from the spec and its state. */
export const fieldHostProps = (
  props: FieldProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  focus: FocusState,
  onValueChange: (value: string) => void,
) => ({
  value: state.current,
  placeholder: props.placeholder,
  readOnly: props.readOnly === true || props.disabled === true,
  autoFocus: props.disabled === true ? undefined : props.autoFocus,
  tabIndex: props.disabled === true ? -1 : undefined,
  theme: nativeTextTheme(theme),
  testId: props.testId,
  "aria-label": props.label,
  style: fieldChrome(props, theme, focus.focused),
  onChange: (event: EventPayload) => {
    if (props.disabled !== true) onValueChange(event.value ?? "");
  },
  onSubmit: props.disabled === true ? undefined : props.onSubmit,
  onFocus: focus.onFocus,
  onBlur: focus.onBlur,
});

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

/** A single-line text field. */
export const Input = (props: InputProps): ReactElement => {
  const theme = useTheme();
  const focus = useFocus(props.autoFocus === true && props.disabled !== true);
  const field = useControlState(
    props.value,
    props.defaultValue ?? "",
    props.onChange,
  );
  return renderInput(props, theme, field.value, focus, field.set);
};
