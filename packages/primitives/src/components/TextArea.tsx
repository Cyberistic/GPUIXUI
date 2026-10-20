/**
 * `TextArea` — a multi-line text field.
 *
 * The same field contract as `Input`, on the runtime's `textarea` element.
 * `minRows`/`maxRows` are the runtime's own height controls; a textarea does
 * not scroll until its content exceeds `maxRows`, so a set `maxRows` is also
 * the point at which it becomes a scroll container.
 */

import type { ReactElement } from "react";
import type { StyleDesc } from "@gpuix/react";
import type { ValueState } from "../core/state.js";
import type { PrimitiveTheme } from "../core/theme.js";
import {
  fieldChrome,
  fieldHostProps,
  type FieldProps,
  type FieldState,
} from "./Input.js";
import {
  resolvePartStyle,
  useControlState,
  useFocus,
  type FocusState,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/**
 * Drift a textarea cannot take: with `onSubmit` set, the runtime turns Enter
 * into a submit and the newline never arrives (plan 046). A caller who wants
 * submit-on-Enter wants an `Input`.
 */
export type TextAreaProps = Omit<FieldProps, "onSubmit"> & {
  /** Minimum visible rows. The runtime grows the field to fit. */
  readonly minRows?: number;
  /** Rows after which the field scrolls instead of growing. */
  readonly maxRows?: number;
};

/**
 * A textarea's height is rows, not a control height: the shared recipe supplies
 * the single-line `h-9`, so the one deviation from the class string is dropping
 * its height and letting `minRows`/`maxRows` own the box (plan `370`).
 */
export const renderTextArea = (
  props: TextAreaProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  focus: FocusState,
  onValueChange: (value: string) => void,
): ReactElement => {
  const host = fieldHostProps(props, theme, state, focus, onValueChange);
  const chrome = fieldChrome(
    { ...props, style: undefined },
    theme,
    focus.focused,
  );
  const base: StyleDesc = { ...chrome, height: undefined };
  const fieldState: FieldState = {
    disabled: props.disabled === true,
    readOnly: props.readOnly === true,
    focused: focus.focused,
    invalid: props.invalid === true,
  };
  return (
    <textarea
      {...host}
      style={resolvePartStyle(base, props.style, fieldState)}
      minRows={props.minRows}
      maxRows={props.maxRows}
    />
  );
};

/** A multi-line text field. */
export const TextArea = (props: TextAreaProps): ReactElement => {
  const theme = useTheme();
  const focus = useFocus(props.autoFocus === true && props.disabled !== true);
  const field = useControlState(
    props.value,
    props.defaultValue ?? "",
    props.onValueChange,
  );
  return renderTextArea(props, theme, field.value, focus, field.set);
};
