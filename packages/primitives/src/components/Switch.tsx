/**
 * `Switch` — an immediate on/off.
 *
 * A switch and a checkbox differ in intent, not in state model: both are the
 * three-state paint from `core/selection.ts`, and the switch draws it as a pill
 * and a thumb. The thumb's resting offsets come from `switchThumbOffset`, and
 * a toggle animates between them with the runtime's `motion` — the one
 * animation that is a one-way position change (plan `329`).
 */

import { Fragment, type ReactElement, type ReactNode } from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { motion, type EventPayload } from "@gpuix/react";
import { decideActivation } from "../core/keyboard.js";
import {
  selectionRowStyle,
  selectionRowTextStyle,
  switchThumbOffset,
  switchThumbStyle,
  switchTrackStyle,
  type SelectionAccent,
  type SelectionSpec,
} from "../core/selection.js";
import { shrinkLayoutStyle, labelRowLayout } from "../core/style.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { hasOpaqueContent, labelParts, paintsContent } from "./content.js";
import {
  composeHandler,
  composeRef,
  controlName,
  describeState,
  hasText,
  joinDescription,
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
  /** Visible and focusable, but refuses to change (plan `799`). */
  readonly readOnly: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}

export interface SwitchProps extends TriggerHandlers {
  /** Controlled. Omit to let the switch hold its own state. */
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;
  readonly onValueChange?: (next: boolean) => void;
  readonly disabled?: boolean;
  /**
   * Shows the position as a value to review.
   *
   * A read-only switch keeps its tab stop, its name, its announced
   * `aria-valuetext` and its focus ring, and paints full contrast with a
   * `default` cursor; every activation path is refused. `disabled` is the
   * stronger state: it leaves the tab order and fades the track. 0.10.0 has no
   * `aria-readonly`, so the difference is behavioural and visual (plan `799`).
   */
  readonly readOnly?: boolean;
  /**
   * Take keyboard focus on mount, and ring while it holds that focus.
   *
   * The switch is one focusable root, so it asks the renderer through the host's
   * own `autoFocus`, which a focusable `div` honours on a later mount too
   * (probed for plan `806`; plan `807`). A disabled switch never takes it; a
   * read-only one still does, because it keeps its stop and ring (plan `799`).
   */
  readonly autoFocus?: boolean;
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
   * supplied; a blank `label` falls back to the text. A blank text child is not
   * a visible label — it leaves the bare track, named by `label` when one is
   * supplied. Without children the switch renders exactly as before.
   */
  readonly children?: ReactNode;
  /**
   * A visible hint **under** the label, inside the labelled row.
   *
   * The caption is the row's `aria-description`, so the painted hint and the
   * announced one are the same string (the rule `CheckboxGroup`'s rows follow,
   * plan `500`). A blank value paints no line and announces nothing; without
   * `children` there is no row to paint into, so it is announced but not
   * painted. A slot tip is composed after it — `"hint. tip"` (plan `748`).
   */
  readonly description?: string;
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
    readOnly: props.readOnly,
    focused: focus.focused,
  };
  const thumb = switchThumbStyle(spec, theme);
  const rest = switchThumbOffset(spec, theme);

  const toggle = (): void => {
    if (props.disabled === true || props.readOnly === true) return;
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
    readOnly: props.readOnly === true,
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
  /** The hint needs a labelled row to sit in; a bare track announces it only. */
  const caption = paintsContent(props.children) && hasText(props.description);
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
    "aria-description": describeState(
      joinDescription(props.description, props["aria-description"]),
      props,
    ),
    "aria-valuetext": state.current ? "checked" : "unchecked",
    autoFocus: props.disabled === true ? undefined : props.autoFocus,
    tabIndex: props.disabled === true ? undefined : 0,
    testId: props.testId,
    onClick: toggle,
    onKeyDown: onKey("down", props.onKeyDown),
    onKeyUp: onKey("up", props.onKeyUp),
    onFocus: composeHandler(focus.onFocus, props.onFocus),
    onBlur: composeHandler(focus.onBlur, props.onBlur),
  } as const;
  if (!paintsContent(props.children)) {
    return (
      <div {...control} style={resolvePartStyle(track, props.style, partState)}>
        {thumbElement}
      </div>
    );
  }
  const label = hasOpaqueContent(props.children) ? (
    <div style={labelRowLayout(theme)}>
      {Arr.map(labelParts(props.children), (part, index) =>
        part.kind === "text" ? (
          <Text
            key={index}
            role="label"
            tone={props.disabled === true ? "muted" : "default"}
            style={shrinkLayoutStyle}
          >
            {part.text}
          </Text>
        ) : (
          <Fragment key={index}>{part.element}</Fragment>
        ),
      )}
    </div>
  ) : (
    <Text
      role="label"
      tone={props.disabled === true ? "muted" : "default"}
      style={shrinkLayoutStyle}
    >
      {props.children}
    </Text>
  );
  return (
    <div
      {...control}
      style={resolvePartStyle(
        selectionRowStyle(
          {
            disabled: props.disabled === true,
            readOnly: props.readOnly === true,
            align: caption ? "flex-start" : "center",
          },
          theme,
        ),
        props.style,
        partState,
      )}
    >
      <div style={track}>{thumbElement}</div>
      {caption ? (
        <div style={selectionRowTextStyle(theme)}>
          {label}
          <Text role="caption" tone="muted" style={shrinkLayoutStyle}>
            {props.description}
          </Text>
        </div>
      ) : (
        label
      )}
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
