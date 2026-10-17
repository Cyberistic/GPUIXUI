/**
 * `Checkbox` — an independent yes/no.
 *
 * GPUix exposes **no `aria-checked`** (plan 020 §1.4), so the state is reported
 * through `aria-valuetext` (`"checked"` / `"unchecked"` / `"mixed"`), which is
 * the supported way to make a checkbox legible to assistive technology. The
 * same three states are one paint resolved by `core/selection.ts`.
 */

import type { ReactElement } from "react";
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { Icon } from "@gpuixui/icons";
import { decideActivation } from "../core/keyboard.js";
import {
  selectionBoxStyle,
  selectionMarkColor,
  type SelectionAccent,
  type SelectionSpec,
  type SelectionState,
} from "../core/selection.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import type { ValueState } from "../core/state.js";
import { mergeStyle, useControlState, useFocus, type FocusState } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface CheckboxProps {
  /** Controlled. Omit to let the checkbox hold its own state. */
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;
  readonly onChange?: (next: boolean) => void;
  /** A third state, drawn as a dash. Overrides `checked` when true. */
  readonly indeterminate?: boolean;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Defaults to `primary`. */
  readonly accent?: SelectionAccent;
  /** Accessible name. The visible name goes in a `Label` beside it. */
  readonly label?: string;
  readonly style?: StyleDesc;
  readonly testId?: string;
}

/** What a checkbox announces: there is no `aria-checked` to carry it. */
export const selectionValueText = (state: SelectionState): string =>
  state === "indeterminate" ? "mixed" : state;

/** The state a checkbox is in, from its props. */
export const checkboxState = (props: CheckboxProps): SelectionState =>
  props.indeterminate === true ? "indeterminate" : props.checked ? "checked" : "unchecked";

const markName = (state: SelectionState): "check" | "minus" =>
  state === "indeterminate" ? "minus" : "check";

export const renderCheckbox = (
  props: CheckboxProps,
  theme: PrimitiveTheme,
  state: ValueState<boolean>,
  focus: FocusState,
  onValueChange: (next: boolean) => void,
): ReactElement => {
  const current: SelectionState = props.indeterminate === true ? "indeterminate" : state.current ? "checked" : "unchecked";
  const spec: SelectionSpec = {
    state: current,
    size: props.size ?? "md",
    accent: props.accent ?? "primary",
    shape: "square",
    invalid: props.invalid,
    disabled: props.disabled,
  };
  const toggle = (): void => {
    if (props.disabled === true) return;
    onValueChange(!state.current);
  };
  const onKey = (phase: "down" | "up") => (event: EventPayload): void => {
    if (decideActivation(event.key ?? "", phase, event.isHeld === true)) toggle();
  };
  const box = mergeStyle(
    selectionBoxStyle(spec, theme),
    focus.focused ? { boxShadow: { offsetX: 0, offsetY: 0, blurRadius: 0, spreadRadius: theme.borderWidth.strong, color: theme.colors.ring } } : {},
  );
  return (
    <div
      role="checkbox"
      aria-label={props.label}
      aria-valuetext={selectionValueText(current)}
      tabIndex={props.disabled === true ? undefined : 0}
      testId={props.testId}
      onClick={toggle}
      onKeyDown={onKey("down")}
      onKeyUp={onKey("up")}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={mergeStyle(box, props.style)}
    >
      {current === "unchecked" ? null : (
        <Icon name={markName(current)} size={theme.iconSize.sm} color={selectionMarkColor(spec, theme)} />
      )}
    </div>
  );
};

/** A checkbox. */
export const Checkbox = (props: CheckboxProps): ReactElement => {
  const theme = useTheme();
  const focus = useFocus();
  const state = useControlState(props.checked, props.defaultChecked ?? false, props.onChange);
  return renderCheckbox(props, theme, state.value, focus, state.set);
};
