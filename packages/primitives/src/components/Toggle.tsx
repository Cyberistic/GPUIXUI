/**
 * `Toggle` — a button that stays on.
 *
 * A toggle is not a Switch: a switch changes a setting immediately ("dark
 * mode"), a toggle sets a *mode* for the next action ("bold", "grid view",
 * "snap"), and it lives in a toolbar beside other actions.
 *
 * **The accessibility limitation:** `@gpuix/native` 0.11.0 has no `aria-pressed`, so the
 * state reaches assistive technology through `aria-valuetext` (`"pressed"` /
 * `"not pressed"`), the same channel Checkbox and Switch use. A screen reader
 * hears a button with a value, not a pressed button; the docs page says so.
 *
 * The paint is the shared control recipe with `core/variants.ts`' toggle
 * variants, and the activation/keyboard contract is `Button`'s — Enter on key
 * down, Space on key up, a held key ignored. It forwards the `Tooltip` trigger
 * pair (`TooltipTriggerProps`), because a mode in a toolbar is described by a
 * tip rather than by occupying a label.
 *
 * The resting appearance is a Tailwind recipe (`recipe/toggleClass`), compiled
 * through `@gpuixui/tw`; the caller's `className` is joined last so it wins
 * conflicts exactly as `cn` resolves them.
 */

import type { ReactElement, ReactNode } from "react";
import type { EventPayload, KeyEvent } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { accessibleName } from "../core/a11y.js";
import { controlRing } from "../core/focus.js";
import { decideActivation, swallowKeyDefault } from "../core/keyboard.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import type { ToggleVariant } from "../core/variants.js";
import type { ValueState } from "../core/state.js";
import { toggleClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import {
  childrenName,
  composeEvent,
  composePress,
  mergeStyle,
  suppressFeedback,
  useControlState,
  useFocus,
  type FieldHostProps,
  type FocusState,
  type HelpProps,
  type InteractionProps,
  type TooltipTriggerProps,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export interface ToggleProps
  extends InteractionProps, TooltipTriggerProps, FieldHostProps, HelpProps {
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
  /** Extra style, resolved against the toggle's live state and merged last. */
  readonly style?: StateStyle<ToggleState>;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;
}

/** The state a toggle announces: there is no `aria-pressed` to carry it. */
export const pressedValueText = (pressed: boolean): string =>
  pressed ? "pressed" : "not pressed";

/** What a `Toggle` tells a `style` callback. `pressed` is `selected`. */
export interface ToggleState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly selected: boolean;
}

/** The element a toggle renders. Pure in its arguments. */
export const renderToggle = (
  props: ToggleProps,
  theme: PrimitiveTheme,
  state: ValueState<boolean>,
  focus: FocusState,
  onPressedChange: (pressed: boolean) => void,
): ReactElement => {
  const { size = "md", variant = "default" } = props;
  const toggle = (): void => {
    if (props.disabled === true) return;
    onPressedChange(!state.current);
  };
  const onKey =
    (phase: "down" | "up") =>
    (event: KeyEvent): void => {
      if (swallowKeyDefault(event.key ?? "", phase)) event.preventDefault();
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        toggle();
    };
  const resolved = recipeTw.classesToStyle(
    cn(
      toggleClass(variant, state.current, size, { square: props.square }),
      props.className,
    ),
    theme,
  );
  let style = resolved.style;
  if (props.disabled === true) {
    style = suppressFeedback(mergeStyle(style, resolved.disabled));
  }
  style = mergeStyle(style, controlRing(theme, { disabled: props.disabled }));
  style = mergeStyle(
    style,
    resolveStyle(props.style, {
      disabled: props.disabled === true,
      focused: focus.focused,
      selected: state.current,
    }),
  );
  return (
    <div
      ref={props.ref}
      role="button"
      aria-label={accessibleName(props.label) ?? childrenName(props.children)}
      // A tooltip arrives through the same channel as the caller's help; an
      // explicit `description` is the field-style help and wins.
      aria-description={
        accessibleName(props.description) ??
        accessibleName(props["aria-description"])
      }
      aria-id={props["aria-id"]}
      aria-valuetext={pressedValueText(state.current)}
      tabIndex={props.disabled === true ? undefined : 0}
      testId={props.testId}
      onLayout={props.onLayout}
      onClick={composePress(props.disabled === true, props.onClick, toggle)}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      onKeyDown={composeEvent<KeyEvent>(props.onKeyDown, onKey("down"))}
      onKeyUp={composeEvent<KeyEvent>(props.onKeyUp, onKey("up"))}
      onFocus={composeEvent<EventPayload>(props.onFocus, focus.onFocus)}
      onBlur={composeEvent<EventPayload>(props.onBlur, focus.onBlur)}
      style={style}
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
