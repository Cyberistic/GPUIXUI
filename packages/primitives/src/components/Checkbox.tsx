/**
 * `Checkbox` — an independent yes/no.
 *
 * GPUix exposes **no `aria-checked`** (plan 020 §1.4), so the state is reported
 * through `aria-valuetext` (`"checked"` / `"unchecked"` / `"mixed"`), which is
 * the supported way to make a checkbox legible to assistive technology. The
 * same three states are one paint resolved by `core/selection.ts`.
 */

import type { ReactElement } from "react";
import type { EventPayload } from "@gpuix/react";
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
import {
  composeHandler,
  passiveTriggerHandlers,
  resolvePartStyle,
  useControlState,
  useFocus,
  type FocusState,
  type StateStyle,
  type TriggerHandlers,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** The public state a `Checkbox` style callback receives. */
export interface CheckboxState {
  readonly checked: boolean;
  /** A third state: the check is a dash. Never true together with `checked`. */
  readonly indeterminate: boolean;
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}

export interface CheckboxProps extends TriggerHandlers {
  /** Controlled. Omit to let the checkbox hold its own state. */
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;
  readonly onValueChange?: (next: boolean) => void;
  /** A third state, drawn as a dash. Overrides `checked` when true. */
  readonly indeterminate?: boolean;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Defaults to `primary`. */
  readonly accent?: SelectionAccent;
  /**
   * Accessible name. A visible `Label` beside the box is painted text — not a
   * hit area and not associated (no `aria-labelledby`); `CheckboxGroup` renders
   * a labelled row.
   */
  readonly label?: string;
  /** Extra description announced after the name. A slot (a `Tooltip`) writes the tip here. */
  readonly "aria-description"?: string;
  /** An object, or a callback over this checkbox's public state. */
  readonly style?: StateStyle<CheckboxState>;
  readonly testId?: string;
}

/** What a checkbox announces: there is no `aria-checked` to carry it. */
export const selectionValueText = (state: SelectionState): string =>
  state === "indeterminate" ? "mixed" : state;

/** The state a checkbox is in, from its props. */
export const checkboxState = (props: CheckboxProps): SelectionState =>
  props.indeterminate === true
    ? "indeterminate"
    : props.checked
      ? "checked"
      : "unchecked";

const markName = (state: SelectionState): "check" | "minus" =>
  state === "indeterminate" ? "minus" : "check";

export const renderCheckbox = (
  props: CheckboxProps,
  theme: PrimitiveTheme,
  state: ValueState<boolean>,
  focus: FocusState,
  onValueChange: (next: boolean) => void,
): ReactElement => {
  const current: SelectionState =
    props.indeterminate === true
      ? "indeterminate"
      : state.current
        ? "checked"
        : "unchecked";
  const spec: SelectionSpec = {
    state: current,
    size: props.size ?? "md",
    accent: props.accent ?? "primary",
    shape: "square",
    invalid: props.invalid,
    disabled: props.disabled,
    focused: focus.focused,
  };
  const toggle = (): void => {
    if (props.disabled === true) return;
    onValueChange(!state.current);
  };
  const onKey =
    (phase: "down" | "up", handler?: (event: EventPayload) => void) =>
    (event: EventPayload): void => {
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        toggle();
      handler?.(event);
    };
  const box = selectionBoxStyle(spec, theme);
  const partState: CheckboxState = {
    checked: current === "checked",
    indeterminate: current === "indeterminate",
    disabled: props.disabled === true,
    focused: focus.focused,
    invalid: props.invalid === true,
  };
  return (
    <div
      {...passiveTriggerHandlers(props)}
      role="checkbox"
      aria-label={props.label}
      aria-description={props["aria-description"]}
      aria-valuetext={selectionValueText(current)}
      tabIndex={props.disabled === true ? undefined : 0}
      testId={props.testId}
      onClick={toggle}
      onKeyDown={onKey("down", props.onKeyDown)}
      onKeyUp={onKey("up", props.onKeyUp)}
      onFocus={composeHandler(focus.onFocus, props.onFocus)}
      onBlur={composeHandler(focus.onBlur, props.onBlur)}
      style={resolvePartStyle(box, props.style, partState)}
    >
      {current === "unchecked" ? null : (
        <Icon
          name={markName(current)}
          size={theme.iconSize.sm}
          color={selectionMarkColor(spec, theme)}
        />
      )}
    </div>
  );
};

/** A checkbox. */
export const Checkbox = (props: CheckboxProps): ReactElement => {
  const theme = useTheme();
  const focus = useFocus();
  const state = useControlState(
    props.checked,
    props.defaultChecked ?? false,
    props.onValueChange,
  );
  return renderCheckbox(props, theme, state.value, focus, state.set);
};
