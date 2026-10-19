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
 * Enter on key down, Space on key up, a held key ignored. The label is one
 * shrinkable item for the same measured reason as `Button` (plan `368`).
 */

import type { ReactElement, ReactNode } from "react";
import type { EventPayload } from "@gpuix/react";
import * as Option from "effect/Option";
import { decideActivation } from "../core/keyboard.js";
import {
  controlFocusStyle,
  controlLabelStyle,
  controlStyle,
} from "../core/style.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { toggleVariants, type ToggleVariant } from "../core/variants.js";
import type { ValueState } from "../core/state.js";
import {
  ariaName,
  composeHandler,
  controlName,
  mergeStyle,
  passiveTriggerHandlers,
  resolvePartStyle,
  useControlState,
  useFocus,
  type FocusState,
  type StateStyle,
  type TriggerHandlers,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** The public state a `Toggle` style callback receives. */
export interface ToggleState {
  /** The toggle's pressed state — the contract's word for it is `checked`. */
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly focused: boolean;
}

export interface ToggleProps extends TriggerHandlers {
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
  /**
   * Extra description announced after the name. A slot (a `Tooltip` trigger)
   * writes the tip here.
   */
  readonly "aria-description"?: string;
  /** An object, or a callback over this toggle's public state. */
  readonly style?: StateStyle<ToggleState>;
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
  const partState: ToggleState = {
    checked: state.current,
    disabled: props.disabled === true,
    focused: focus.focused,
  };
  const onKey =
    (phase: "down" | "up", handler?: (event: EventPayload) => void) =>
    (event: EventPayload): void => {
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        toggle();
      handler?.(event);
    };
  return (
    <div
      {...passiveTriggerHandlers(props)}
      ref={focus.ref}
      role="button"
      aria-label={Option.getOrUndefined(
        controlName(props.label, props.children),
      )}
      aria-description={ariaName(props["aria-description"])}
      aria-valuetext={pressedValueText(state.current)}
      tabIndex={props.disabled === true ? undefined : 0}
      testId={props.testId}
      onClick={toggle}
      onKeyDown={onKey("down", props.onKeyDown)}
      onKeyUp={onKey("up", props.onKeyUp)}
      onFocus={composeHandler(focus.onFocus, props.onFocus)}
      onBlur={composeHandler(focus.onBlur, props.onBlur)}
      style={resolvePartStyle(
        focus.focused
          ? mergeStyle(
              controlStyle(spec, theme),
              controlFocusStyle(spec, theme),
            )
          : controlStyle(spec, theme),
        props.style,
        partState,
      )}
    >
      {props.leading}
      {props.children === undefined || props.children === null ? null : (
        <div style={controlLabelStyle}>{props.children}</div>
      )}
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
