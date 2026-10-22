/**
 * `Toggle` — a button that stays on.
 *
 * A toggle is not a Switch: a switch changes a setting immediately ("dark
 * mode"), a toggle sets a *mode* for the next action ("bold", "grid view",
 * "snap"), and it lives in a toolbar beside other actions.
 *
 * **The accessibility limitation:** `@gpuix/native` 0.11.0 has no `aria-pressed`, so the
 * state reaches assistive technology through `aria-valuetext` (the provider's
 * `messages.press` words, shipped as `"pressed"` / `"not pressed"`), the same
 * channel Checkbox and Switch use. A screen reader hears a button with a value,
 * not a pressed button; the docs page says so.
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
import {
  defaultMessages,
  pressWord,
  type PressWords,
  type PrimitiveMessages,
} from "../core/messages.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import type { ToggleVariant } from "../core/variants.js";
import type { ValueState } from "../core/state.js";
import { toggleClass } from "../recipe/index.js";
import { toggleSpinnerAccent } from "../core/variants.js";
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
import { Spinner } from "./Spinner.js";
import { useMessages } from "./MessagesProvider.js";
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
  /**
   * Busy: shows a spinner and blocks activation, but stays focusable. A busy
   * toggle reports `disabled` to its `style` callback, because it refuses every
   * press and key.
   */
  readonly loading?: boolean;
  /**
   * The words a busy toggle announces — its `aria-description` and the
   * spinner's name. Defaults to `Loading`; a blank label announces nothing.
   */
  readonly loadingLabel?: string;
  /**
   * Hold the busy spinner's lit dot. The runtime exposes no reduced-motion
   * preference, so the caller passes its own.
   */
  readonly reducedMotion?: boolean;
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
export const pressedValueText = (
  pressed: boolean,
  words: PressWords = defaultMessages.press,
): string => pressWord(pressed, words);

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
  messages: PrimitiveMessages = defaultMessages,
): ReactElement => {
  const { size = "md", variant = "default" } = props;
  const busy = props.disabled === true || props.loading === true;
  const loadingWord = props.loadingLabel ?? "Loading";
  const toggle = (): void => {
    if (busy) return;
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
      // The state that refuses activation, like `Button`'s: `loading` is not a
      // second flag a caller has to handle.
      disabled: busy,
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
        props.loading === true
          ? accessibleName(loadingWord)
          : (accessibleName(props.description) ??
            accessibleName(props["aria-description"]))
      }
      aria-id={props["aria-id"]}
      aria-valuetext={pressedValueText(state.current, messages.press)}
      tabIndex={props.disabled === true ? undefined : 0}
      testId={props.testId}
      onLayout={props.onLayout}
      onClick={composePress(busy, props.onClick, toggle)}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      onKeyDown={composeEvent<KeyEvent>(props.onKeyDown, onKey("down"))}
      onKeyUp={composeEvent<KeyEvent>(props.onKeyUp, onKey("up"))}
      onFocus={composeEvent<EventPayload>(props.onFocus, focus.onFocus)}
      onBlur={composeEvent<EventPayload>(props.onBlur, focus.onBlur)}
      style={style}
    >
      {props.loading === true ? (
        <Spinner
          size={theme.iconSize.sm}
          accent={toggleSpinnerAccent(state.current, props.disabled === true)}
          label={loadingWord}
          reducedMotion={props.reducedMotion}
        />
      ) : (
        props.leading
      )}
      {props.children}
      {props.trailing}
    </div>
  );
};

/** A button whose action has a persistent on/off state. */
export const Toggle = (props: ToggleProps): ReactElement => {
  const theme = useTheme();
  const messages = useMessages();
  const focus = useFocus();
  const state = useControlState(
    props.pressed,
    props.defaultPressed ?? false,
    props.onPressedChange,
  );
  return renderToggle(props, theme, state.value, focus, state.set, messages);
};
