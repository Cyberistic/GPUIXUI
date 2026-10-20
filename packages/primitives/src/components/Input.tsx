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
import { fieldRecipeStyle } from "../core/recipes.js";
import { nativeTextTheme } from "../core/style.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  ariaName,
  composeHandler,
  composeRef,
  passiveTriggerHandlers,
  resolvePartStyle,
  useControlState,
  useFocus,
  type FocusState,
  type StateStyle,
  type TriggerHandlers,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** The public state a field's style callback receives. */
export interface FieldState {
  readonly disabled: boolean;
  /**
   * The field refuses edits but stays focusable, so its value can be read,
   * selected and copied (plan `786`). `disabled` is the stronger state: it also
   * leaves the tab order.
   */
  readonly readOnly: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}

/** A field the user cannot edit: read-only or disabled. */
export const fieldInert = (props: {
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
}): boolean => props.disabled === true || props.readOnly === true;

/** Props shared by `Input` and `TextArea`. */
export interface FieldProps extends TriggerHandlers {
  /** Controlled text. Omit it to let the field hold its own draft. */
  readonly value?: string;
  /** Initial text when uncontrolled. */
  readonly defaultValue?: string;
  /** Called with the text after every edit, only when it actually changed. */
  readonly onValueChange?: (value: string) => void;
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
  /**
   * A host click. A `Tooltip` trigger's dismissal writes here: 0.10.0's
   * `<input>`/`<textarea>` receive **no** `onMouseDown` or `onMouseEnter`, so
   * click is the only pointer edge a text field can forward (plan `605`).
   */
  readonly onClick?: (event: EventPayload) => void;
  /**
   * Extra description announced after the name. A slot (a `Tooltip`) writes the
   * tip here. A text host receives no `onMouseEnter` in 0.10.0, so a field's
   * tooltip opens on keyboard focus only (plan `345`).
   */
  readonly "aria-description"?: string;
  /** An object, or a callback over this field's public state. */
  readonly style?: StateStyle<FieldState>;
  readonly testId?: string;
}

/**
 * The chrome a field element draws, shared by the input and the textarea.
 *
 * The new-york-v4 recipe (plan `370`) supplies the geometry, radius and type;
 * the theme supplies the fill, text colour and the hover/press boundary. The
 * recipe's focus/invalid/disabled buckets are applied here because 0.10.0 has no
 * `focusVisible` style property (plan `524`).
 */
export const fieldChrome = (
  { invalid, disabled, readOnly, style }: FieldProps,
  theme: PrimitiveTheme,
  focused: boolean,
): StyleDesc =>
  resolvePartStyle(
    fieldRecipeStyle(
      {
        focused,
        invalid: invalid === true,
        disabled: disabled === true,
      },
      theme,
    ),
    style,
    {
      disabled: disabled === true,
      readOnly: readOnly === true,
      focused,
      invalid: invalid === true,
    },
  );

/**
 * The props an `<input>`/`<textarea>` shares, from the spec and its state.
 *
 * `style` is not among them: each renderer resolves the chrome itself so a
 * caller's style is merged exactly once, last (`TextArea` re-bases the row
 * height first — plan `097`).
 */
export const fieldHostProps = (
  props: FieldProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  focus: FocusState,
  onValueChange: (value: string) => void,
) => ({
  ...passiveTriggerHandlers(props),
  ref: composeRef(props.ref, focus.ref),
  value: state.current,
  placeholder: props.placeholder,
  readOnly: fieldInert(props),
  autoFocus: props.disabled === true ? undefined : props.autoFocus,
  tabIndex: props.disabled === true ? -1 : undefined,
  theme: nativeTextTheme(theme),
  testId: props.testId,
  "aria-label": ariaName(props.label),
  "aria-description": ariaName(props["aria-description"]),
  onChange: (event: EventPayload) => {
    if (!fieldInert(props)) onValueChange(event.value ?? "");
  },
  onSubmit: props.disabled === true ? undefined : props.onSubmit,
  onClick: props.onClick,
  onFocus: composeHandler(focus.onFocus, props.onFocus),
  onBlur: composeHandler(focus.onBlur, props.onBlur),
  onKeyDown: props.onKeyDown,
  onKeyUp: props.onKeyUp,
});

/** The element tree `Input` renders from its props and field state. */
export const renderInput = (
  props: FieldProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  focus: FocusState,
  onValueChange: (value: string) => void,
): ReactElement => (
  <input
    {...fieldHostProps(props, theme, state, focus, onValueChange)}
    style={fieldChrome(props, theme, focus.focused)}
  />
);

export type InputProps = FieldProps;

/** A single-line text field. */
export const Input = (props: InputProps): ReactElement => {
  const theme = useTheme();
  const focus = useFocus(props.autoFocus === true && props.disabled !== true);
  const field = useControlState(
    props.value,
    props.defaultValue ?? "",
    props.onValueChange,
  );
  return renderInput(props, theme, field.value, focus, field.set);
};
