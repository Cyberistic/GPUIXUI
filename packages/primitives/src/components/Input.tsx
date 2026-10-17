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
  useControlState,
  useFocus,
  type FocusState,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** Props shared by `Input` and `TextArea`. */
export interface FieldProps {
  /** Controlled text. Omit it to let the field hold its own draft. */
  readonly value?: string;
  /** Initial text when uncontrolled. */
  readonly defaultValue?: string;
  /** Called with the text after every edit, only when it actually changed. */
  readonly onChange?: (value: string) => void;
  /** Enter in an `<input>`, or Enter in a `<textarea>` when this is set. */
  readonly onSubmit?: (event: EventPayload) => void;
  readonly placeholder?: string;
  readonly readOnly?: boolean;
  /** Take keyboard focus on mount. Required for a field to receive key events. */
  readonly autoFocus?: boolean;
  /** Validation failed: the border takes the destructive role. */
  readonly invalid?: boolean;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  readonly fullWidth?: boolean;
  /** Accessible name. The visible name goes in a `Label` beside it. */
  readonly label?: string;
  readonly style?: StyleDesc;
  readonly testId?: string;
}

/** The chrome a field element draws, shared by the input and the textarea. */
export const fieldChrome = (
  { size = "md", invalid, fullWidth, style }: FieldProps,
  theme: PrimitiveTheme,
  focused: boolean,
): StyleDesc => {
  const spec = { variant: fieldVariant, size, invalid, fullWidth };
  const base = mergeStyle(controlStyle(spec, theme), fieldTextStyle(theme));
  const ring = focused ? controlFocusStyle(spec, theme) : {};
  return mergeStyle(mergeStyle(base, ring), style);
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
  readOnly: props.readOnly,
  autoFocus: props.autoFocus,
  theme: nativeTextTheme(theme),
  testId: props.testId,
  "aria-label": props.label,
  style: fieldChrome(props, theme, focus.focused),
  onChange: (event: EventPayload) => onValueChange(event.value ?? ""),
  onSubmit: props.onSubmit,
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
  const focus = useFocus();
  const field = useControlState(
    props.value,
    props.defaultValue ?? "",
    props.onChange,
  );
  return renderInput(props, theme, field.value, focus, field.set);
};
