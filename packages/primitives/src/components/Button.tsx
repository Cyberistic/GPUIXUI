/**
 * `Button` — the primary action.
 *
 * The published `@gpuix/react` has **no `./button`** (plan 020 §1.5), so the
 * keyboard contract is ours: `core/keyboard.ts` decides, and the decision is
 * wired here exactly the way the platform behaves (Enter on key down, Space on
 * key up, a held key ignored).
 *
 * Focus is a keyboard-only outline: the button declares `keyboardRing`
 * (tokens' `focusVisible`) at rest and the runtime paints it after Tab, never
 * after a mouse press (plan 053's probe). The `focused` flag is still tracked
 * because it is public `ButtonState` — a `style` callback may branch on it —
 * and it is React-local render state with no other reader, so `useState` is the
 * right tool; an Atom would make one button's highlight global state.
 *
 * The resting appearance is a Tailwind recipe (`recipe/buttonClass`), compiled
 * through `@gpuixui/tw`; the caller's `className` is joined last so it wins
 * conflicts exactly as `cn` resolves them.
 */

import { useState, type ReactElement, type ReactNode } from "react";
import type { EventPayload } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { accessibleName } from "../core/a11y.js";
import { decideActivation } from "../core/keyboard.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import type { ButtonVariant } from "../core/variants.js";
import { buttonClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { childrenName, mergeStyle, suppressFeedback } from "./internal.js";
import { keyboardRing } from "../core/focus.js";
import { Spinner } from "./Spinner.js";
import { useTheme } from "./ThemeProvider.js";

export interface ButtonProps {
  /** Defaults to `primary`. */
  readonly variant?: ButtonVariant;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Equal width and height, for an icon-only button. */
  readonly square?: boolean;
  readonly fullWidth?: boolean;
  readonly disabled?: boolean;
  /** Busy: shows a spinner and blocks activation, but stays focusable. */
  readonly loading?: boolean;
  readonly leading?: ReactNode;
  readonly trailing?: ReactNode;
  /** Accessible name. Required when the button has only an icon. */
  readonly label?: string;
  /** Called for a click or an activating key. Not called while busy or disabled. */
  readonly onActivate?: () => void;
  readonly onClick?: (event: EventPayload) => void;
  /**
   * Extra style, resolved against the button's live state and merged last.
   *
   * A function form is how a consumer styles by state: `style={(state) =>
   * ({ opacity: state.focused ? 1 : 0.9 })}`. `loading` is not a state — a busy
   * button reports `disabled`, because it refuses activation.
   */
  readonly style?: StateStyle<ButtonState>;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;
}

/** Whether the button currently holds focus, and how it learns that it does. */
export interface ButtonFocus {
  readonly focused: boolean;
  readonly onFocus?: () => void;
  readonly onBlur?: () => void;
}

/** What a `Button` tells a `style` callback. */
export interface ButtonState {
  readonly disabled: boolean;
  readonly focused: boolean;
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
  const activate = (): void => {
    if (busy) return;
    props.onActivate?.();
  };
  const onKey =
    (phase: "down" | "up") =>
    (event: EventPayload): void => {
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        activate();
    };

  const resolved = recipeTw.classesToStyle(
    cn(
      buttonClass(variant, size, {
        square: props.square,
        fullWidth: props.fullWidth,
      }),
      props.className,
    ),
    theme,
  );
  const base =
    props.disabled === true
      ? suppressFeedback(mergeStyle(resolved.style, resolved.disabled))
      : resolved.style;
  const own = mergeStyle(base, keyboardRing(theme));
  const style = mergeStyle(
    own,
    resolveStyle(props.style, {
      disabled: props.disabled === true,
      focused: focus.focused,
    }),
  );

  return (
    <div
      role="button"
      aria-label={accessibleName(props.label) ?? childrenName(props.children)}
      aria-description={props.loading === true ? "Loading" : undefined}
      tabIndex={
        props.disabled === true && props.loading !== true ? undefined : 0
      }
      testId={props.testId}
      onClick={(event) => {
        if (busy) return;
        props.onClick?.(event);
        props.onActivate?.();
      }}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      onKeyDown={onKey("down")}
      onKeyUp={onKey("up")}
      style={style}
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
  return renderButton(props, theme, {
    focused,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  });
};
