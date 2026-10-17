/**
 * `Toggle` — a button that stays on.
 *
 * A toggle is not a Switch: a switch changes a setting immediately ("dark
 * mode"), a toggle sets a *mode* for the next action ("bold", "grid view",
 * "snap"), and it lives in a toolbar beside other actions.
 *
 * **The accessibility limitation:** GPUix 0.10.0 has no `aria-pressed`, so the
 * state reaches assistive technology through `aria-valuetext` (`"pressed"` /
 * `"not pressed"`), the same channel Checkbox and Switch use. A screen reader
 * hears a button with a value, not a pressed button; the docs page says so.
 *
 * The paint is the shared control resolver with `core/variants.ts`'
 * `toggleVariants`, and the activation/keyboard contract is `Button`'s —
 * Enter on key down, Space on key up, a held key ignored.
 */

import type { ReactElement, ReactNode } from "react";
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { decideActivation } from "../core/keyboard.js";
import { controlFocusStyle, controlStyle } from "../core/style.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { toggleVariants, type ToggleVariant } from "../core/variants.js";
import type { ValueState } from "../core/state.js";
import {
  mergeStyle,
  useControlState,
  useFocus,
  type FocusState,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface ToggleProps {
  /** Controlled pressed state. Omit to let the toggle own it. */
  readonly pressed?: boolean;
  readonly defaultPressed?: boolean;
  readonly onPressedChange?: (pressed: boolean) => void;
  /** Defaults to `default`. */
  readonly variant?: ToggleVariant;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Equal width and height, for an icon-only toggle. */
  readonly square?: boolean;
  readonly disabled?: boolean;
  readonly leading?: ReactNode;
  readonly trailing?: ReactNode;
  /** Accessible name. Required when the toggle has only an icon. */
  readonly label?: string;
  readonly style?: StyleDesc;
  readonly children?: ReactNode;
  readonly testId?: string;
}

/** The state a toggle announces: there is no `aria-pressed` to carry it. */
export const pressedValueText = (pressed: boolean): string =>
  pressed ? "pressed" : "not pressed";

/** The element a toggle renders. Pure in its arguments. */
export const renderToggle = (
  props: ToggleProps,
  theme: PrimitiveTheme,
  state: ValueState<boolean>,
  focus: FocusState,
  onPressedChange: (pressed: boolean) => void,
): ReactElement => {
  const { size = "md", variant = "default" } = props;
  const paint = toggleVariants[variant];
  const spec = {
    variant: state.current ? paint.pressed : paint.rest,
    size,
    square: props.square,
    disabled: props.disabled,
  };
  const toggle = (): void => {
    if (props.disabled === true) return;
    onPressedChange(!state.current);
  };
  const onKey =
    (phase: "down" | "up") =>
    (event: EventPayload): void => {
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        toggle();
    };
  return (
    <div
      role="button"
      aria-label={props.label}
      aria-valuetext={pressedValueText(state.current)}
      tabIndex={props.disabled === true ? undefined : 0}
      testId={props.testId}
      onClick={toggle}
      onKeyDown={onKey("down")}
      onKeyUp={onKey("up")}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={mergeStyle(
        focus.focused
          ? mergeStyle(
              controlStyle(spec, theme),
              controlFocusStyle(spec, theme),
            )
          : controlStyle(spec, theme),
        props.style,
      )}
    >
      {props.leading}
      {props.children}
      {props.trailing}
    </div>
  );
};

/** A button whose action has a persistent on/off state. */
export const Toggle = (props: ToggleProps): ReactElement => {
  const theme = useTheme();
  const focus = useFocus();
  const state = useControlState(
    props.pressed,
    props.defaultPressed ?? false,
    props.onPressedChange,
  );
  return renderToggle(props, theme, state.value, focus, state.set);
};
