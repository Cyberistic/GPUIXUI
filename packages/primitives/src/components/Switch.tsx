/**
 * `Switch` — an immediate on/off.
 *
 * A switch and a checkbox differ in intent, not in state model: both are the
 * three-state paint from `core/selection.ts`, and the switch draws it as a pill
 * and a thumb. The thumb's resting offsets come from `switchThumbOffset`, and
 * a toggle animates between them with the runtime's `motion` — the one
 * animation that is a one-way position change (plan `329`).
 */

import { Children, type ReactElement, type ReactNode } from "react";
import * as Option from "effect/Option";
import { motion, type EventPayload } from "@gpuix/react";
import { decideActivation } from "../core/keyboard.js";
import {
  selectionRowStyle,
  switchThumbOffset,
  switchThumbStyle,
  switchTrackStyle,
  type SelectionAccent,
  type SelectionSpec,
} from "../core/selection.js";
import { shrinkLayoutStyle } from "../core/style.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  ariaName,
  composeHandler,
  composeRef,
  controlName,
  passiveTriggerHandlers,
  resolvePartStyle,
  useControlState,
  useFocus,
  type FocusState,
  type StateStyle,
  type TriggerHandlers,
} from "./internal.js";
import { Text } from "./Text.js";
import { useTheme } from "./ThemeProvider.js";

/** The public state a `Switch` style callback receives. */
export interface SwitchState {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}

export interface SwitchProps extends TriggerHandlers {
  /** Controlled. Omit to let the switch hold its own state. */
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;
  readonly onValueChange?: (next: boolean) => void;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Defaults to `primary`. */
  readonly accent?: SelectionAccent;
  /**
   * Accessible name. A visible `Label` beside the switch is painted text — not
   * a hit area and not associated (no `aria-labelledby`).
   */
  readonly label?: string;
  /**
   * A visible label **inside** the control.
   *
   * The row becomes the hit area, the tab stop and the accessible name, so a
   * press anywhere toggles it and the text is heard by assistive technology —
   * the same shape `CheckboxGroup`'s rows use (`Label` beside a switch cannot be
   * associated in 0.10.0). `label` still wins for the name when both are
   * supplied; a blank `label` falls back to the text. Without children the
   * switch renders exactly as before.
   */
  readonly children?: ReactNode;
  /** Extra description announced after the name. A slot (a `Tooltip`) writes the tip here. */
  readonly "aria-description"?: string;
  /** An object, or a callback over this switch's public state. */
  readonly style?: StateStyle<SwitchState>;
  readonly testId?: string;
}

/** How long the thumb takes to cross the track. */
const SWITCH_THUMB_SLIDE_MS = 200;

/** The element tree `Switch` renders with its thumb at the current offset. */
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
  const thumb = switchThumbStyle(spec, theme);
  const rest = switchThumbOffset(spec, theme);

  const toggle = (): void => {
    if (props.disabled === true) return;
    onValueChange(!state.current);
  };
  const onKey =
    (phase: "down" | "up", handler?: (event: EventPayload) => void) =>
    (event: EventPayload): void => {
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        toggle();
      handler?.(event);
    };
  const partState: SwitchState = {
    checked: state.current,
    disabled: props.disabled === true,
    focused: focus.focused,
    invalid: props.invalid === true,
  };
  const thumbElement = (
    <motion.div
      initial={{ left: rest.left }}
      animate={{ left: rest.left }}
      transition={{
        duration: SWITCH_THUMB_SLIDE_MS / 1000,
        ease: "easeOut",
      }}
      style={thumb}
    />
  );
  const track = switchTrackStyle(spec, theme);
  /**
   * The one control surface, whether the track is the root or sits inside a
   * labelled row. A text child becomes the name, so a labelled switch is one
   * node a screen reader can announce and a pointer can press anywhere on.
   */
  const control = {
    ...passiveTriggerHandlers(props),
    ref: composeRef(props.ref, focus.ref),
    role: "switch",
    "aria-label": Option.getOrUndefined(
      controlName(props.label, props.children),
    ),
    "aria-description": ariaName(props["aria-description"]),
    "aria-valuetext": state.current ? "checked" : "unchecked",
    tabIndex: props.disabled === true ? undefined : 0,
    testId: props.testId,
    onClick: toggle,
    onKeyDown: onKey("down", props.onKeyDown),
    onKeyUp: onKey("up", props.onKeyUp),
    onFocus: composeHandler(focus.onFocus, props.onFocus),
    onBlur: composeHandler(focus.onBlur, props.onBlur),
  } as const;
  if (Children.toArray(props.children).length === 0) {
    return (
      <div {...control} style={resolvePartStyle(track, props.style, partState)}>
        {thumbElement}
      </div>
    );
  }
  return (
    <div
      {...control}
      style={resolvePartStyle(
        selectionRowStyle(
          { disabled: props.disabled === true, align: "center" },
          theme,
        ),
        props.style,
        partState,
      )}
    >
      <div style={track}>{thumbElement}</div>
      <Text
        role="label"
        tone={props.disabled === true ? "muted" : "default"}
        style={shrinkLayoutStyle}
      >
        {props.children}
      </Text>
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
    props.onValueChange,
  );
  return renderSwitch(props, theme, state.value, focus, state.set);
};
