/**
 * `Switch` — an immediate on/off.
 *
 * A switch and a checkbox differ in intent, not in state model: both are the
 * three-state paint from `core/selection.ts`, and the switch draws it as a pill
 * and a thumb. The thumb is positioned by the track's `justifyContent`, so it
 * cannot drift out of the pill.
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
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { cn } from "@gpuixui/tw";
import { decideActivation } from "../core/keyboard.js";
import type { SelectionAccent, SelectionSpec } from "../core/selection.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { switchThumbClass, switchTrackClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import {
  checkedChange,
  focusRingStyle,
  mergeStyle,
  suppressSelectionFeedback,
  useControlState,
  useFocus,
  type CheckedChangeProps,
  type FocusState,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** What a part reads from the switch it belongs to. */
interface SwitchPart {
  readonly spec: SelectionSpec;
  readonly theme: PrimitiveTheme;
}

const SwitchContext = createContext<SwitchPart | null>(null);

/** {@link SwitchThumb} props. */
export interface SwitchThumbProps {
  /** A glyph inside the knob; the default knob is a plain filled circle. */
  readonly children?: ReactNode;
  readonly style?: StyleDesc;
  readonly className?: string;
}

export interface SwitchProps extends CheckedChangeProps {
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
  /** Accessible name. The visible name goes in a `Label` beside it. */
  readonly label?: string;
  readonly style?: StyleDesc;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/**
 * The knob a switch slides.
 *
 * The part centres its children, so a glyph lands on the knob rather than beside
 * it. The recipe's `pointer-events-none` is load-bearing (plan 041 §9), not
 * decoration: a caller's glyph must not take the press that toggles the switch.
 */
export const renderSwitchThumb = (
  props: SwitchThumbProps,
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): ReactElement => {
  const thumb = recipeTw.classesToStyle(
    cn(switchThumbClass(spec), props.className),
    theme,
  ).style;
  return (
    <div
      style={mergeStyle(
        {
          ...thumb,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        props.style,
      )}
    >
      {props.children}
    </div>
  );
};

/** The knob; `Switch`'s children are its content. */
export const SwitchThumb = (props: SwitchThumbProps): ReactElement => {
  const part = useContext(SwitchContext);
  if (part === null) {
    throw new Error("SwitchThumb must be used inside Switch");
  }
  return renderSwitchThumb(props, part.spec, part.theme);
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
    focused: focus.focused,
  };
  const toggle = (): void => {
    if (props.disabled === true) return;
    onValueChange(!state.current);
  };
  const onKey =
    (phase: "down" | "up") =>
    (event: EventPayload): void => {
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        toggle();
    };
  const resolved = recipeTw.classesToStyle(
    cn(switchTrackClass(spec), props.className),
    theme,
  );
  let track = resolved.style;
  if (spec.disabled === true) {
    track = suppressSelectionFeedback(mergeStyle(track, resolved.disabled));
  }
  if (spec.focused === true) track = mergeStyle(track, focusRingStyle(theme));
  track = mergeStyle(track, props.style);
  return (
    <div
      role="switch"
      aria-label={props.label}
      aria-valuetext={state.current ? "checked" : "unchecked"}
      tabIndex={props.disabled === true ? undefined : 0}
      testId={props.testId}
      onClick={toggle}
      onKeyDown={onKey("down")}
      onKeyUp={onKey("up")}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={track}
    >
      <SwitchContext.Provider value={{ spec, theme }}>
        {renderSwitchThumb({ children: props.children }, spec, theme)}
      </SwitchContext.Provider>
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
