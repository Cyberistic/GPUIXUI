/** @jsxImportSource @gpuix/react */
import type { ReactElement, ReactNode } from "react";
import type { EventPayload, KeyEvent } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { useMotionPreference } from "@gpuixui/motion/react/presence";
import { accessibleName } from "../core/a11y.js";
import { controlRing } from "../core/focus.js";
import { reducedMotionOf } from "../core/motion.js";
import {
  decideActivation,
  isPlainKey,
  swallowKeyDefault,
} from "../core/keyboard.js";
import {
  busyWord,
  defaultMessages,
  pressWord,
  type PressWords,
  type PrimitiveMessages,
} from "../core/messages.js";
import { controlSize, iconSideOf } from "../core/theme.js";
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
  readonly pressed?: boolean;
  readonly defaultPressed?: boolean;
  readonly onPressedChange?: (pressed: boolean) => void;

  readonly variant?: ToggleVariant;

  readonly size?: ControlSize;

  readonly square?: boolean;
  readonly disabled?: boolean;

  readonly loading?: boolean;

  readonly loadingLabel?: string;

  readonly reducedMotion?: boolean;
  readonly leading?: ReactNode;
  readonly trailing?: ReactNode;

  readonly label?: string;

  readonly style?: StateStyle<ToggleState>;

  readonly className?: string;
  readonly children?: ReactNode;
  readonly testId?: string;
}

export const pressedValueText = (
  pressed: boolean,
  words: PressWords = defaultMessages.press,
): string => pressWord(pressed, words);

export interface ToggleState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly selected: boolean;
}

export const renderToggle = (
  props: ToggleProps,
  theme: PrimitiveTheme,
  state: ValueState<boolean>,
  focus: FocusState,
  onPressedChange: (pressed: boolean) => void,
  messages: PrimitiveMessages = defaultMessages,
): ReactElement => {
  const { variant = "default" } = props;
  const size = controlSize(props.size);
  const busy = props.disabled === true || props.loading === true;

  const loadingWord = props.loadingLabel ?? busyWord(messages.loading);
  const toggle = (): void => {
    if (busy) return;
    onPressedChange(!state.current);
  };
  const onKey =
    (phase: "down" | "up") =>
    (event: KeyEvent): void => {
      if (!isPlainKey(event.modifiers)) return;
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
          size={iconSideOf(theme, "sm")}
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

export const Toggle = (props: ToggleProps): ReactElement => {
  const theme = useTheme();
  const messages = useMessages();
  const focus = useFocus();
  const state = useControlState(
    props.pressed,
    props.defaultPressed ?? false,
    props.onPressedChange,
  );

  const reducedMotion = reducedMotionOf(
    props.reducedMotion,
    useMotionPreference(),
  );
  return renderToggle(
    { ...props, reducedMotion },
    theme,
    state.value,
    focus,
    state.set,
    messages,
  );
};
