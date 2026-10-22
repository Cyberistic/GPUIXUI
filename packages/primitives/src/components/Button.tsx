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
 *
 * The rest of the runtime's host props (`ActionHostProps`) pass straight
 * through, because a trigger has to be addressable: a `ref` anchors the surface
 * it opens, `aria-expanded`/`aria-selected` announce it, and the pointer pair
 * opens a hover surface. The props this component owns are written **after**
 * the spread, so no host prop can replace its role, tab stop, name or
 * activation.
 */

import { useContext, useState, type ReactElement, type ReactNode } from "react";
import type { EventPayload, KeyEvent } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { accessibleName } from "../core/a11y.js";
import { decideActivation, swallowKeyDefault } from "../core/keyboard.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  variantSpinnerAccent,
  paintsFilledSurface,
  type ButtonVariant,
} from "../core/variants.js";
import { buttonClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import {
  AttachedGroup,
  childrenName,
  composeEvent,
  composePress,
  mergeStyle,
  suppressFeedback,
  type ActionHostProps,
  type InteractionProps,
  type TooltipTriggerProps,
} from "./internal.js";
import { controlRing, keepContent } from "../core/focus.js";
import { Spinner } from "./Spinner.js";
import { useTheme } from "./ThemeProvider.js";

export interface ButtonProps
  extends InteractionProps, TooltipTriggerProps, ActionHostProps {
  /** Defaults to `primary`. */
  readonly variant?: ButtonVariant;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Equal width and height, for an icon-only button. */
  readonly square?: boolean;
  readonly fullWidth?: boolean;
  readonly disabled?: boolean;
  /**
   * Busy: shows a spinner and blocks activation, but stays focusable.
   */
  readonly loading?: boolean;
  /**
   * Hold the busy spinner's lit dot. The runtime exposes no reduced-motion
   * preference, so the caller passes its own; it reaches the spinner and
   * nothing else, because a button paints no other motion.
   */
  readonly reducedMotion?: boolean;
  readonly leading?: ReactNode;
  readonly trailing?: ReactNode;
  /** Accessible name. Required when the button has only an icon. */
  readonly label?: string;
  /**
   * Called for a click or an activating key, with the event that caused it.
   *
   * A pointer activation hands over the runtime's `click` payload, whose `x`/`y`
   * is the press point (a ripple measures it); a keyboard activation hands over
   * the `keyDown`/`keyUp` payload the button decided on. `KeyEvent` extends
   * `EventPayload`, so one handler reads both and `eventType` says which.
   * Not called while busy or disabled.
   */
  readonly onActivate?: (event: EventPayload) => void;
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

const isBusy = (props: {
  readonly disabled?: boolean;
  readonly loading?: boolean;
}): boolean => props.disabled === true || props.loading === true;

/** The element `Button` renders. Pure in its arguments. */
export const renderButton = (
  props: ButtonProps,
  theme: PrimitiveTheme,
  focus: ButtonFocus,
  attached = false,
): ReactElement => {
  const {
    variant = "primary",
    size = "md",
    square,
    fullWidth,
    disabled,
    loading,
    reducedMotion,
    leading,
    trailing,
    label,
    onActivate,
    style: callerStyle,
    className,
    children,
    testId,
    onClick,
    onKeyDown,
    onKeyUp,
    onFocus,
    onBlur,
    onMouseEnter,
    onMouseLeave,
    "aria-description": description,
    // The runtime's own host props, forwarded untouched: a trigger's `ref`,
    // `aria-expanded`/`aria-selected`, pointer handlers and layout observers.
    ...host
  } = props;
  const busy = isBusy({ disabled, loading });
  const activate = (event: EventPayload): void => {
    if (busy) return;
    onActivate?.(event);
  };
  const onKey =
    (phase: "down" | "up") =>
    (event: KeyEvent): void => {
      if (swallowKeyDefault(event.key ?? "", phase)) event.preventDefault();
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        activate(event);
    };

  const resolved = recipeTw.classesToStyle(
    cn(
      buttonClass(variant, size, {
        square,
        fullWidth,
      }),
      className,
    ),
    theme,
  );
  const base =
    disabled === true
      ? suppressFeedback(mergeStyle(resolved.style, resolved.disabled))
      : resolved.style;
  const own = mergeStyle(
    // A filled action's label is the control, so it keeps full opacity while
    // another control has the keyboard focus (`paintsFilledSurface`).
    paintsFilledSurface(variant) ? mergeStyle(base, keepContent) : base,
    controlRing(theme, { disabled }),
  );
  const shape = attached ? mergeStyle(own, { borderRadius: 0 }) : own;
  const style = mergeStyle(
    shape,
    resolveStyle(callerStyle, {
      // A busy button refuses every activation, so that is what its callback is
      // told: `loading` is not a second state a caller has to handle twice.
      disabled: busy,
      focused: focus.focused,
    }),
  );

  return (
    <div
      {...host}
      role="button"
      aria-label={accessibleName(label) ?? childrenName(children)}
      aria-description={
        loading === true ? "Loading" : accessibleName(description)
      }
      tabIndex={
        // A busy button stays focusable so a keyboard reader is not dropped
        // mid-action; a disabled one leaves the tab order whether or not it is
        // also busy, because it declares no ring and refuses every key — a stop
        // with no cue. The two props together are the common
        // `disabled={pending} loading={pending}` pair.
        disabled === true ? undefined : 0
      }
      testId={testId}
      onClick={composePress(busy, onClick, activate)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={composeEvent<EventPayload>(onFocus, focus.onFocus)}
      onBlur={composeEvent<EventPayload>(onBlur, focus.onBlur)}
      onKeyDown={composeEvent<KeyEvent>(onKeyDown, onKey("down"))}
      onKeyUp={composeEvent<KeyEvent>(onKeyUp, onKey("up"))}
      style={style}
    >
      {loading === true ? (
        <Spinner
          size={theme.iconSize.sm}
          accent={variantSpinnerAccent(variant, disabled)}
          label="Loading"
          reducedMotion={reducedMotion}
        />
      ) : (
        leading
      )}
      {children}
      {trailing}
    </div>
  );
};

/** An action that can be clicked or activated with Enter or Space. */
export const Button = (props: ButtonProps): ReactElement => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return renderButton(
    props,
    theme,
    {
      focused,
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
    useContext(AttachedGroup),
  );
};
