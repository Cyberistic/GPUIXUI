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
 * ring too; that limitation is recorded in `COMPONENTS.md`. Inside an attached
 * `ButtonGroup` the surface is clipped at the button's edge, so the ring is
 * painted by an inset overlay instead of the outer shadow (plan 344). The
 * `focused` flag is React-local render state with no other reader, so `useState`
 * is the right tool; an Atom would make one button's highlight global state.
 *
 * The button is also a valid **slot trigger**: `Tooltip`'s `asChild` clones
 * host props onto its child, and a component boundary would otherwise drop
 * them (plan 341). `TriggerHandlers` forwards the mouse handlers and composes
 * the focus, blur and key handlers with the button's own, so a tooltip opens on
 * hover and focus and its text becomes the button's `aria-description`. The
 * same contract makes this the trigger for the components workstream's future
 * popover/menu parts.
 *
 * The label is one shrinkable item (`controlLabelStyle`): a text run is a flex
 * item the runtime never shrinks, so a long label painted outside a bounded
 * button and over its neighbours (measured, plan `368`).
 */

import { useState, type ReactElement, type ReactNode } from "react";
import * as Option from "effect/Option";
import type { EventPayload } from "@gpuix/react";
import { decideActivation } from "../core/keyboard.js";
import { buttonRecipeRing, buttonRecipeStyle } from "../core/recipes.js";
import {
  clippedFocusRingStyle,
  controlLabelStyle,
  shrinkLayoutStyle,
} from "../core/style.js";
import type { ControlSize, PrimitiveTheme, RadiusStep } from "../core/theme.js";
import type { ButtonVariant } from "../core/variants.js";
import { useGroupShape, type GroupShape } from "./group-shape.js";
import {
  ariaName,
  composeHandler,
  controlName,
  mergeStyle,
  passiveTriggerHandlers,
  resolvePartStyle,
  type StateStyle,
  type TriggerHandlers,
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

export interface ButtonProps extends TriggerHandlers {
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
  /**
   * Extra description announced after the name. A slot (a `Tooltip` trigger)
   * writes the tip here; a busy button still announces `Loading` first.
   */
  readonly "aria-description"?: string;
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
  /**
   * The surrounding group's contract: `clipped` moves the ring inside the
   * button where the group's clip cannot cut it away (plan `344`); `shrink`
   * lets a horizontal group share its width between its buttons (plan `369`).
   */
  group: { readonly clipped?: boolean; readonly shrink?: boolean } = {},
): ReactElement => {
  const clipped = group.clipped === true;
  const { variant = "primary", size = "md" } = props;
  const busy = isBusy(props);
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
  const announced = ariaName(props["aria-description"]);
  const description =
    props.loading !== true
      ? announced
      : announced === undefined
        ? "Loading"
        : `Loading. ${announced}`;
  const onKey =
    (phase: "down" | "up", handler?: (event: EventPayload) => void) =>
    (event: EventPayload): void => {
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        activate(event);
      handler?.(event);
    };
  const showRing = focus.focused && props.disabled !== true;
  const recipe = buttonRecipeStyle(
    {
      variant,
      size,
      square: props.square === true,
      radius: props.radius,
      fullWidth: props.fullWidth,
      disabled: props.disabled,
      // A clipped button's ring is the inset overlay below: the group would cut
      // the outer shadow away, and plan 344's contract is that the button
      // itself paints none (plan 370 passes the recipe's ring to the overlay).
      focused: showRing && !clipped,
    },
    theme,
  );
  const chrome = mergeStyle(
    clipped ? mergeStyle(recipe, { position: "relative" }) : recipe,
    group.shrink === true ? shrinkLayoutStyle : undefined,
  );
  return (
    <div
      {...passiveTriggerHandlers(props)}
      role="button"
      aria-label={Option.getOrUndefined(
        controlName(props.label, props.children),
      )}
      aria-description={description}
      tabIndex={props.disabled === true ? undefined : 0}
      testId={props.testId}
      onClick={activate}
      onFocus={composeHandler(focus.onFocus, props.onFocus)}
      onBlur={composeHandler(focus.onBlur, props.onBlur)}
      onKeyDown={onKey("down", props.onKeyDown)}
      onKeyUp={onKey("up", props.onKeyUp)}
      style={resolvePartStyle(chrome, props.style, state)}
    >
      {props.loading === true ? (
        <Spinner size={theme.iconSize.sm} label="Loading" />
      ) : (
        props.leading
      )}
      {props.children === undefined || props.children === null ? null : (
        <div style={controlLabelStyle}>{props.children}</div>
      )}
      {props.trailing}
      {clipped && showRing ? (
        <div style={clippedFocusRingStyle(buttonRecipeRing(theme))} />
      ) : null}
    </div>
  );
};

/** An action that can be clicked or activated with Enter or Space. */
export const Button = (props: ButtonProps): ReactElement => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const shape = useGroupShape();
  const group: GroupShape | undefined = Option.getOrUndefined(shape);
  return renderButton(
    {
      ...props,
      radius:
        props.radius ?? Option.getOrUndefined(group?.radius ?? Option.none()),
    },
    theme,
    {
      focused,
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
    { clipped: group?.clipped === true, shrink: group?.shrink === true },
  );
};
