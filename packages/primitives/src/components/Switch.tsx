/**
 * `Switch` — an immediate on/off.
 *
 * A switch and a checkbox differ in intent, not in state model: both are the
 * three-state paint from `core/selection.ts`, and the switch draws it as a pill
 * and a thumb. The thumb is positioned by the track's `justifyContent`, so it
 * cannot drift out of the pill.
 */

import type { ReactElement } from "react";
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { decideActivation } from "../core/keyboard.js";
import {
  switchThumbStyle,
  switchTrackStyle,
  type SelectionAccent,
  type SelectionSpec,
} from "../core/selection.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  mergeStyle,
  useControlState,
  useFocus,
  type FocusState,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface SwitchProps {
  /** Controlled. Omit to let the switch hold its own state. */
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;
  readonly onChange?: (next: boolean) => void;
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

export const renderSwitch = (
  props: SwitchProps,
  theme: PrimitiveTheme,
  state: ValueState<boolean>,
  focus: FocusState,
  onValueChange: (next: boolean) => void,
): ReactElement => {
  const spec: SelectionSpec = {
    state: state.current ? "checked" : "unchecked",
    size: props.size ?? "md",
    accent: props.accent ?? "primary",
    invalid: props.invalid,
    disabled: props.disabled,
    focused: focus.focused,
  };
  const toggle = (): void => {
    if (props.disabled === true) return;
    onValueChange(!state.current);
  };
  const onKey =
    (phase: "down" | "up") =>
    (event: EventPayload): void => {
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        toggle();
    };
  return (
    <div
      role="switch"
      aria-label={props.label}
      aria-valuetext={state.current ? "checked" : "unchecked"}
      tabIndex={props.disabled === true ? undefined : 0}
      testId={props.testId}
      onClick={toggle}
      onKeyDown={onKey("down")}
      onKeyUp={onKey("up")}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={mergeStyle(switchTrackStyle(spec, theme), props.style)}
    >
      <div style={switchThumbStyle(spec, theme)} />
    </div>
  );
};

/** A switch that toggles immediately. */
export const Switch = (props: SwitchProps): ReactElement => {
  const theme = useTheme();
  const focus = useFocus();
  const state = useControlState(
    props.checked,
    props.defaultChecked ?? false,
    props.onChange,
  );
  return renderSwitch(props, theme, state.value, focus, state.set);
};
