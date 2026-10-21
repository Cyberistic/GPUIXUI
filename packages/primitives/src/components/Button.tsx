/**
 * `Button` — the primary action.
 *
 * The pinned `@gpuix/react` 0.11.0 ships a headless `Button`/`buttonProps`, but
 * this component keeps its own keyboard contract (`core/keyboard.ts` decides,
 * and the decision is wired here exactly the way the platform behaves: Enter on
 * key down, Space on key up, a held key ignored), because the recipe, `loading`,
 * the `StateStyle<ButtonState>` parts contract and the runtime probes all sit on
 * this one implementation. Adopting the headless primitive is a tracked decision
 * in `TODO.md`, not a claim that the runtime lacks one.
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
 *
 * Host handlers arrive through `InteractionProps` and are composed with the
 * button's own, never handed the element: `onClick` observes a press the button
 * accepts, and a busy or disabled button takes no press at all.
 */

import { useState, type ReactElement, type ReactNode } from "react";
import type { EventPayload, KeyEvent } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { accessibleName } from "../core/a11y.js";
import { decideActivation, swallowKeyDefault } from "../core/keyboard.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import type { ButtonVariant } from "../core/variants.js";
import { buttonClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import {
  childrenName,
  composeEvent,
  composePress,
  mergeStyle,
  suppressFeedback,
  type InteractionProps,
} from "./internal.js";
import { controlRing } from "../core/focus.js";
import { Spinner } from "./Spinner.js";
import { useTheme } from "./ThemeProvider.js";

export interface ButtonProps extends InteractionProps {
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
    (event: KeyEvent): void => {
      if (swallowKeyDefault(event.key ?? "", phase)) event.preventDefault();
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
  const own = mergeStyle(
    base,
    controlRing(theme, { disabled: props.disabled }),
  );
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
      onClick={composePress(busy, props.onClick, activate)}
      onFocus={composeEvent<EventPayload>(props.onFocus, focus.onFocus)}
      onBlur={composeEvent<EventPayload>(props.onBlur, focus.onBlur)}
      onKeyDown={composeEvent<KeyEvent>(props.onKeyDown, onKey("down"))}
      onKeyUp={composeEvent<KeyEvent>(props.onKeyUp, onKey("up"))}
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
