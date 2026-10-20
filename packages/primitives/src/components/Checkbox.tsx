/**
 * `Checkbox` — an independent yes/no.
 *
 * GPUix exposes **no `aria-checked`** (plan 020 §1.4), so the state is reported
 * through `aria-valuetext` (`"checked"` / `"unchecked"` / `"mixed"`), which is
 * the supported way to make a checkbox legible to assistive technology. The
 * same three states are one paint resolved by `core/selection.ts`.
 */

import { type ReactElement, type ReactNode } from "react";
import * as Option from "effect/Option";
import type { EventPayload } from "@gpuix/react";
import { Icon } from "@gpuixui/icons";
import { decideActivation } from "../core/keyboard.js";
import {
  nextChecked,
  selectionBoxStyle,
  selectionMarkColor,
  selectionMarkSize,
  selectionRowStyle,
  selectionRowTextStyle,
  type SelectionAccent,
  type SelectionSpec,
  type SelectionState,
} from "../core/selection.js";
import { shrinkLayoutStyle } from "../core/style.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import type { ValueState } from "../core/state.js";
import { paintsContent } from "./content.js";
import {
  composeHandler,
  composeRef,
  controlName,
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

/** The public state a `Checkbox` style callback receives. */
export interface CheckboxState {
  readonly checked: boolean;
  /** A third state: the check is a dash. Never true together with `checked`. */
  readonly indeterminate: boolean;
  readonly disabled: boolean;
  /** Visible and focusable, but refuses to change (plan `799`). */
  readonly readOnly: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}

export interface CheckboxProps extends TriggerHandlers {
  /** Controlled. Omit to let the checkbox hold its own state. */
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;
  readonly onValueChange?: (next: boolean) => void;
  /**
   * A third state, drawn as a dash. Overrides `checked` when true, and
   * activation reads that painted state: a press on a mixed box asks for
   * `true`, so it never clears itself (plan 750).
   */
  readonly indeterminate?: boolean;
  readonly disabled?: boolean;
  /**
   * Shows the checked state as a value to review.
   *
   * A read-only box keeps its tab stop, its name, its announced
   * `aria-valuetext` and its focus ring, and paints full contrast with a
   * `default` cursor; every activation path is refused. `disabled` is the
   * stronger state: it leaves the tab order and fades the box. 0.10.0 has no
   * `aria-readonly`, so the difference is behavioural and visual (plan `799`).
   */
  readonly readOnly?: boolean;
  readonly invalid?: boolean;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Defaults to `primary`. */
  readonly accent?: SelectionAccent;
  /**
   * Accessible name. A visible `Label` beside the box is painted text — not a
   * hit area and not associated (no `aria-labelledby`); `CheckboxGroup` renders
   * a labelled row.
   */
  readonly label?: string;
  /**
   * A visible label **inside** the control.
   *
   * The row becomes the hit area, the tab stop and the accessible name, so a
   * press anywhere toggles it and the text is heard by assistive technology —
   * the same shape `CheckboxGroup`'s rows use (`Label` beside a box cannot be
   * associated in 0.10.0). `label` still wins for the name when both are
   * supplied; a blank `label` falls back to the text. A blank text child is not
   * a visible label — it leaves the bare box, named by `label` when one is
   * supplied. Without children the box renders exactly as before.
   */
  readonly children?: ReactNode;
  /**
   * A visible hint **under** the label, inside the labelled row.
   *
   * The caption is the row's `aria-description`, so what a sighted reader sees
   * and what assistive technology hears are one string (the rule
   * `CheckboxGroup`'s option rows follow, plan `500`). A blank value paints no
   * line and announces nothing (plans `577`, `586`); without `children` there is
   * no row to paint into, so the description is announced but not painted.
   * A slot tip (`Tooltip`) is composed after it — `"hint. tip"`.
   */
  readonly description?: string;
  /** Extra description announced after the name. A slot (a `Tooltip`) writes the tip here. */
  readonly "aria-description"?: string;
  /** An object, or a callback over this checkbox's public state. */
  readonly style?: StateStyle<CheckboxState>;
  readonly testId?: string;
}

/** What a checkbox announces: there is no `aria-checked` to carry it. */
export const selectionValueText = (state: SelectionState): string =>
  state === "indeterminate" ? "mixed" : state;

/** The state a checkbox is in, from its props. */
export const checkboxState = (props: CheckboxProps): SelectionState =>
  props.indeterminate === true
    ? "indeterminate"
    : props.checked
      ? "checked"
      : "unchecked";

const markName = (state: SelectionState): "check" | "minus" =>
  state === "indeterminate" ? "minus" : "check";

/** The element tree `Checkbox` renders for one value and focus state. */
export const renderCheckbox = (
  props: CheckboxProps,
  theme: PrimitiveTheme,
  state: ValueState<boolean>,
  focus: FocusState,
  onValueChange: (next: boolean) => void,
): ReactElement => {
  const current: SelectionState =
    props.indeterminate === true
      ? "indeterminate"
      : state.current
        ? "checked"
        : "unchecked";
  const spec: SelectionSpec = {
    state: current,
    size: props.size ?? "md",
    accent: props.accent ?? "primary",
    shape: "square",
    invalid: props.invalid,
    disabled: props.disabled,
    readOnly: props.readOnly,
    focused: focus.focused,
  };
  const toggle = (): void => {
    if (props.disabled === true || props.readOnly === true) return;
    onValueChange(nextChecked(current));
  };
  const onKey =
    (phase: "down" | "up", handler?: (event: EventPayload) => void) =>
    (event: EventPayload): void => {
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        toggle();
      handler?.(event);
    };
  const box = selectionBoxStyle(spec, theme);
  const partState: CheckboxState = {
    checked: current === "checked",
    indeterminate: current === "indeterminate",
    disabled: props.disabled === true,
    readOnly: props.readOnly === true,
    focused: focus.focused,
    invalid: props.invalid === true,
  };
  const mark =
    current === "unchecked" ? null : (
      <Icon
        name={markName(current)}
        size={selectionMarkSize(spec.size, theme)}
        color={selectionMarkColor(spec, theme)}
      />
    );
  /**
   * Whether the hint gets a line of its own. It needs a labelled row to sit in:
   * a bare box has no text column, so the description is announced there but
   * not painted (plan `748`).
   */
  const caption = paintsContent(props.children) && hasText(props.description);
  /**
   * The one control surface, whether the box is the root or sits inside a
   * labelled row. A text child becomes the name, so a labelled control is one
   * node a screen reader can announce and a pointer can press anywhere on.
   */
  const control = {
    ...passiveTriggerHandlers(props),
    ref: composeRef(props.ref, focus.ref),
    role: "checkbox",
    "aria-label": Option.getOrUndefined(
      controlName(props.label, props.children),
    ),
    "aria-description": joinDescription(
      props.description,
      props["aria-description"],
    ),
    "aria-valuetext": selectionValueText(current),
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
      <div {...control} style={resolvePartStyle(box, props.style, partState)}>
        {mark}
      </div>
    );
  }
  const label = (
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
      <div style={box}>{mark}</div>
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

/** A checkbox. */
export const Checkbox = (props: CheckboxProps): ReactElement => {
  const theme = useTheme();
  const focus = useFocus();
  const state = useControlState(
    props.checked,
    props.defaultChecked ?? false,
    props.onValueChange,
  );
  return renderCheckbox(props, theme, state.value, focus, state.set);
};
