/** @jsxImportSource @gpuix/react */
import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from "react";
import { motion } from "@gpuix/react";
import type {
  EventPayload,
  KeyEvent,
  MotionTransition,
  StyleDesc,
} from "@gpuix/react";
import * as P from "effect/Predicate";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { useMotionPreference } from "@gpuixui/motion/react/presence";
import { motionTiming } from "@gpuixui/motion/timing";
import { cn } from "@gpuixui/tw";
import { accessibleName } from "../core/a11y.js";
import {
  decideActivation,
  isPlainKey,
  swallowKeyDefault,
} from "../core/keyboard.js";
import { defaultMessages, type PrimitiveMessages } from "../core/messages.js";
import { reducedMotionOf, stillTransition } from "../core/motion.js";
import {
  switchTargetStyle,
  switchThumbOffset,
  switchThumbPaint,
  switchTrackPaint,
  type SelectionAccent,
  type SelectionSpec,
} from "../core/selection.js";
import { controlRing } from "../core/focus.js";
import type { ValueState } from "../core/state.js";
import { controlSize } from "../core/theme.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { switchThumbClass, switchTrackClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import {
  checkedChange,
  composeEvent,
  composePress,
  decorative,
  mergeStyle,
  suppressSelectionFeedback,
  useControlState,
  useFocus,
  type CheckedChangeProps,
  type FieldHostProps,
  type FocusState,
  type HelpProps,
  type InteractionProps,
  type TooltipTriggerProps,
} from "./internal.js";
import { selectionValueText } from "./Checkbox.js";
import { useMessages } from "./MessagesProvider.js";
import { useTheme } from "./ThemeProvider.js";

interface SwitchPart {
  readonly spec: SelectionSpec;
  readonly theme: PrimitiveTheme;

  readonly reducedMotion: boolean;
}

const SwitchContext = createContext<SwitchPart | null>(null);

export interface SwitchThumbProps {
  readonly children?: ReactNode;
  readonly style?: StyleDesc;
  readonly className?: string;
}

export interface SwitchProps
  extends
    CheckedChangeProps,
    InteractionProps,
    TooltipTriggerProps,
    FieldHostProps,
    HelpProps {
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;

  readonly children?: ReactNode;
  readonly disabled?: boolean;
  readonly invalid?: boolean;

  readonly size?: ControlSize;

  readonly accent?: SelectionAccent;

  readonly label?: string;

  readonly reducedMotion?: boolean;

  readonly style?: StateStyle<SwitchState>;

  readonly className?: string;
  readonly testId?: string;
}

export interface SwitchState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly checked: boolean;
  readonly invalid: boolean;
}

const THUMB_SLIDE: MotionTransition = motionTiming("fast", {
  phase: "standard",
});

export const renderSwitchThumb = (
  props: SwitchThumbProps,
  spec: SelectionSpec,
  theme: PrimitiveTheme,
  reducedMotion = false,
): ReactElement => {
  const thumb = recipeTw.classesToStyle(
    cn(switchThumbClass(spec), props.className),
    theme,
  ).style;
  const style = mergeStyle(
    mergeStyle(
      {
        ...thumb,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },

      switchThumbPaint(spec, theme),
    ),
    props.style,
  );
  const left = P.isNumber(style.left)
    ? style.left
    : switchThumbOffset(spec, theme);
  return (
    <motion.div
      initial={false}
      animate={{ left }}
      transition={stillTransition(THUMB_SLIDE, reducedMotion)}
      style={style}
    >
      {props.children}
    </motion.div>
  );
};

export const SwitchThumb = (props: SwitchThumbProps): ReactElement => {
  const part = useContext(SwitchContext);
  if (part === null) {
    throw new Error("SwitchThumb must be used inside Switch");
  }
  return renderSwitchThumb(props, part.spec, part.theme, part.reducedMotion);
};

export const renderSwitch = (
  props: SwitchProps,
  theme: PrimitiveTheme,
  state: ValueState<boolean>,
  focus: FocusState,
  onValueChange: (next: boolean) => void,
  messages: PrimitiveMessages = defaultMessages,
): ReactElement => {
  const spec: SelectionSpec = {
    state: state.current ? "checked" : "unchecked",
    size: controlSize(props.size),
    accent: props.accent ?? "primary",
    invalid: props.invalid,
    disabled: props.disabled,
  };
  const toggle = (): void => {
    if (props.disabled === true) return;
    onValueChange(!state.current);
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
    cn(switchTrackClass(spec), props.className),
    theme,
  );

  const painted = mergeStyle(resolved.style, switchTrackPaint(spec, theme));
  const drawn =
    spec.disabled === true
      ? suppressSelectionFeedback(mergeStyle(painted, resolved.disabled))
      : painted;
  const track = decorative(
    mergeStyle(
      drawn,
      resolveStyle(props.style, {
        disabled: spec.disabled === true,
        focused: focus.focused,
        checked: spec.state === "checked",
        invalid: spec.invalid === true,
      }),
    ),
  );
  const target = mergeStyle(
    switchTargetStyle(spec),
    controlRing(theme, { disabled: spec.disabled, invalid: spec.invalid }),
  );
  return (
    <div
      ref={props.ref}
      role="switch"
      aria-label={accessibleName(props.label)}
      aria-description={
        accessibleName(props.description) ??
        accessibleName(props["aria-description"])
      }
      aria-id={props["aria-id"]}
      aria-valuetext={selectionValueText(spec.state, messages.selection)}
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
      style={target}
    >
      <div style={track}>
        <SwitchContext.Provider
          value={{
            spec,
            theme,
            reducedMotion: props.reducedMotion === true,
          }}
        >
          {renderSwitchThumb(
            { children: props.children },
            spec,
            theme,
            props.reducedMotion === true,
          )}
        </SwitchContext.Provider>
      </div>
    </div>
  );
};

export const Switch = (props: SwitchProps): ReactElement => {
  const theme = useTheme();
  const messages = useMessages();
  const focus = useFocus();
  const state = useControlState(
    props.checked,
    props.defaultChecked ?? false,
    checkedChange(props),
  );

  const reducedMotion = reducedMotionOf(
    props.reducedMotion,
    useMotionPreference(),
  );
  return renderSwitch(
    { ...props, reducedMotion },
    theme,
    state.value,
    focus,
    state.set,
    messages,
  );
};
