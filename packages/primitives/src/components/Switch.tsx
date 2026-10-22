/**
 * `Switch` — an immediate on/off.
 *
 * A switch and a checkbox differ in intent, not in state model: both are the
 * three-state paint from `core/selection.ts`, and the switch draws it as a pill
 * and a thumb. The thumb is an absolutely positioned child of the track, placed
 * by its `left` inset, so it cannot drift out of the pill and the runtime can
 * animate that one value when the state changes.
 *
 * Two parts (`docs/component-api.md` §8): the track, and `SwitchThumb`. A
 * caller's children are the thumb's content, drawn inside the part's
 * `pointerEvents: "none"` guard so a glyph cannot swallow the press.
 */

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
import { cn } from "@gpuixui/tw";
import { accessibleName } from "../core/a11y.js";
import { decideActivation, swallowKeyDefault } from "../core/keyboard.js";
import { stillTransition } from "../core/motion.js";
import {
  switchTargetStyle,
  switchThumbInset,
  type SelectionAccent,
  type SelectionSpec,
} from "../core/selection.js";
import { controlRing } from "../core/focus.js";
import type { ValueState } from "../core/state.js";
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
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** What a part reads from the switch it belongs to. */
interface SwitchPart {
  readonly spec: SelectionSpec;
  readonly theme: PrimitiveTheme;
  /** The caller's reduced-motion preference, honoured by the thumb's slide. */
  readonly reducedMotion: boolean;
}

const SwitchContext = createContext<SwitchPart | null>(null);

/** {@link SwitchThumb} props. */
export interface SwitchThumbProps {
  /** A glyph inside the knob; the default knob is a plain filled circle. */
  readonly children?: ReactNode;
  readonly style?: StyleDesc;
  readonly className?: string;
}

export interface SwitchProps
  extends CheckedChangeProps, InteractionProps, FieldHostProps, HelpProps {
  /** Controlled. Omit to let the switch hold its own state. */
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;
  /** A glyph inside the knob; the default knob is a plain filled circle. */
  readonly children?: ReactNode;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Defaults to `primary`. */
  readonly accent?: SelectionAccent;
  /**
   * Accessible name. A `Label` beside the switch only paints the text — it is
   * not associated with the control — so this prop is what names it; pass the
   * same string, or spread `labelledBy(name)`.
   */
  readonly label?: string;
  /**
   * Skip the thumb's slide. The runtime exposes no reduced-motion preference,
   * so the caller passes its own and the thumb jumps to its position instead.
   */
  readonly reducedMotion?: boolean;
  /** Extra style, resolved against the switch's live state and merged last. */
  readonly style?: StateStyle<SwitchState>;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/** What a `Switch` tells a `style` callback. */
export interface SwitchState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly checked: boolean;
  readonly invalid: boolean;
}

/** The slide between the thumb's two positions: short, and never bouncy. */
const THUMB_SLIDE: MotionTransition = { duration: 0.15, ease: "easeOut" };

/**
 * The knob a switch slides.
 *
 * The part centres its children, so a glyph lands on the knob rather than beside
 * it. The recipe's `pointer-events-none` is load-bearing (the runtime suites in `runtime/`), not
 * decoration: a caller's glyph must not take the press that toggles the switch.
 *
 * The knob is an absolutely positioned child of the track, so its `left` is the
 * whole of its position. `motion` animates that inset: the runtime has no
 * transform, and a `left` inset is one of the box values it can interpolate, so
 * the thumb slides instead of jumping. `initial: false` keeps the first paint
 * at rest — only a state change animates. `reducedMotion` paints the same two
 * insets with no duration, so the thumb lands rather than travels.
 */
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
    {
      ...thumb,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    props.style,
  );
  const left = P.isNumber(style.left) ? style.left : switchThumbInset(theme);
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

/** The knob; `Switch`'s children are its content. */
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
): ReactElement => {
  const spec: SelectionSpec = {
    state: state.current ? "checked" : "unchecked",
    size: props.size ?? "md",
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
      if (swallowKeyDefault(event.key ?? "", phase)) event.preventDefault();
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        toggle();
    };
  const resolved = recipeTw.classesToStyle(
    cn(switchTrackClass(spec), props.className),
    theme,
  );
  const drawn =
    spec.disabled === true
      ? suppressSelectionFeedback(mergeStyle(resolved.style, resolved.disabled))
      : resolved.style;
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
      aria-description={accessibleName(props.description)}
      aria-id={props["aria-id"]}
      aria-valuetext={state.current ? "checked" : "unchecked"}
      tabIndex={props.disabled === true ? undefined : 0}
      testId={props.testId}
      onLayout={props.onLayout}
      onClick={composePress(props.disabled === true, props.onClick, toggle)}
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

/** A switch that toggles immediately. */
export const Switch = (props: SwitchProps): ReactElement => {
  const theme = useTheme();
  const focus = useFocus();
  const state = useControlState(
    props.checked,
    props.defaultChecked ?? false,
    checkedChange(props),
  );
  return renderSwitch(props, theme, state.value, focus, state.set);
};
