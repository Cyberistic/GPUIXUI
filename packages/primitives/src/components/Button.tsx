/**
 * `Button` — the primary action.
 *
 * The published `@gpuix/react` has **no `./button`** (plan 020 §1.5), so the
 * keyboard contract is ours: `core/keyboard.ts` decides, and the decision is
 * wired here exactly the way the platform behaves (Enter on key down, Space on
 * key up, a held key ignored).
 *
 * Focus is the one interaction state the runtime forces on us — there is no
 * `focusVisible` (plan 020 §1.2) — so the component tracks focus and merges
 * `core/style.ts`'s ring while it holds it. A mouse press therefore shows the
 * ring too; that limitation is recorded in `COMPONENTS.md`. The `focused` flag
 * is React-local render state with no other reader, so `useState` is the right
 * tool; an Atom would make one button's highlight global state.
 */

import { useState, type ReactElement, type ReactNode } from "react";
import * as Option from "effect/Option";
import type { EventPayload } from "@gpuix/react";
import { decideActivation } from "../core/keyboard.js";
import { controlFocusStyle, controlStyle } from "../core/style.js";
import type { ControlSize, PrimitiveTheme, RadiusStep } from "../core/theme.js";
import { buttonVariants, type ButtonVariant } from "../core/variants.js";
import { useGroupShape } from "./group-shape.js";
import {
  mergeStyle,
  resolvePartStyle,
  textOf,
  type StateStyle,
} from "./internal.js";
import { Spinner } from "./Spinner.js";
import { useTheme } from "./ThemeProvider.js";

/** The public state a `Button` style callback receives. */
export interface ButtonState {
  readonly disabled: boolean;
  readonly focused: boolean;
  /** Busy: the spinner is painted and activation is refused. */
  readonly loading: boolean;
}

export interface ButtonProps {
  /** Defaults to `primary`. */
  readonly variant?: ButtonVariant;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Equal width and height, for an icon-only button. */
  readonly square?: boolean;
  /**
   * Corner radius. Defaults to the theme's `md`; an attached `ButtonGroup`
   * supplies `none` so its buttons share one clipped surface.
   */
  readonly radius?: RadiusStep;
  readonly fullWidth?: boolean;
  readonly disabled?: boolean;
  /**
   * Busy: shows a spinner and blocks activation, but stays focusable — unless
   * `disabled` is also set, which always leaves the tab order.
   */
  readonly loading?: boolean;
  readonly leading?: ReactNode;
  readonly trailing?: ReactNode;
  /** Accessible name. Required when the button has only an icon. */
  readonly label?: string;
  /** Called for a click or an activating key. Not called while busy or disabled. */
  readonly onActivate?: () => void;
  /**
   * Called with the event that activated the button: the pointer click, or the
   * key event (Enter down / Space up). Runs before `onActivate`.
   */
  readonly onClick?: (event: EventPayload) => void;
  /** An object, or a callback over this button's public state. */
  readonly style?: StateStyle<ButtonState>;
  readonly children?: ReactNode;
  readonly testId?: string;
}

/** Whether the button currently holds focus, and how it learns that it does. */
export interface ButtonFocus {
  readonly focused: boolean;
  readonly onFocus?: () => void;
  readonly onBlur?: () => void;
}

const isBusy = (props: ButtonProps): boolean =>
  props.disabled === true || props.loading === true;

/** The element `Button` renders. Pure in its arguments. */
export const renderButton = (
  props: ButtonProps,
  theme: PrimitiveTheme,
  focus: ButtonFocus,
): ReactElement => {
  const { variant = "primary", size = "md" } = props;
  const busy = isBusy(props);
  const spec = {
    variant: buttonVariants[variant],
    size,
    square: props.square,
    radius: props.radius,
    fullWidth: props.fullWidth,
    disabled: props.disabled,
  };
  const activate = (event: EventPayload): void => {
    if (busy) return;
    props.onClick?.(event);
    props.onActivate?.();
  };
  const state: ButtonState = {
    disabled: props.disabled === true,
    focused: focus.focused,
    loading: props.loading === true,
  };
  const onKey =
    (phase: "down" | "up") =>
    (event: EventPayload): void => {
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        activate(event);
    };
  return (
    <div
      role="button"
      aria-label={props.label ?? Option.getOrUndefined(textOf(props.children))}
      aria-description={props.loading === true ? "Loading" : undefined}
      tabIndex={props.disabled === true ? undefined : 0}
      testId={props.testId}
      onClick={activate}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      onKeyDown={onKey("down")}
      onKeyUp={onKey("up")}
      style={resolvePartStyle(
        focus.focused
          ? mergeStyle(
              controlStyle(spec, theme),
              controlFocusStyle(spec, theme),
            )
          : controlStyle(spec, theme),
        props.style,
        state,
      )}
    >
      {props.loading === true ? (
        <Spinner size={theme.iconSize.sm} label="Loading" />
      ) : (
        props.leading
      )}
      {props.children}
      {props.trailing}
    </div>
  );
};

/** An action that can be clicked or activated with Enter or Space. */
export const Button = (props: ButtonProps): ReactElement => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const shape = useGroupShape();
  return renderButton(
    { ...props, radius: props.radius ?? Option.getOrUndefined(shape) },
    theme,
    {
      focused,
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
  );
};
