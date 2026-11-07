/** @jsxImportSource @gpuix/react */
import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from "react";
import type { EventPayload, KeyEvent, StyleDesc } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { Icon } from "@gpuixui/icons";
import { accessibleName } from "../core/a11y.js";
import {
  decideActivation,
  isPlainKey,
  swallowKeyDefault,
} from "../core/keyboard.js";
import {
  defaultMessages,
  selectionWord,
  type PrimitiveMessages,
  type SelectionWords,
} from "../core/messages.js";
import {
  selectionMarkColor,
  selectionTargetStyle,
  type SelectionAccent,
  type SelectionSpec,
  type SelectionState,
} from "../core/selection.js";
import { controlRing } from "../core/focus.js";
import { controlSize, iconSideOf } from "../core/theme.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import type { ValueState } from "../core/state.js";
import { selectionBoxClass } from "../recipe/index.js";
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
import { useTheme } from "./ThemeProvider.js";
import { useMessages } from "./MessagesProvider.js";

interface CheckboxPart {
  readonly spec: SelectionSpec;
  readonly theme: PrimitiveTheme;
}

const CheckboxContext = createContext<CheckboxPart | null>(null);

export interface CheckboxIndicatorProps {
  readonly children?: ReactNode;
  readonly style?: StyleDesc;
  readonly className?: string;
}

export interface CheckboxProps
  extends
    CheckedChangeProps,
    InteractionProps,
    TooltipTriggerProps,
    FieldHostProps,
    HelpProps {
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;

  readonly children?: ReactNode;

  readonly indeterminate?: boolean;
  readonly disabled?: boolean;
  readonly invalid?: boolean;

  readonly size?: ControlSize;

  readonly accent?: SelectionAccent;

  readonly label?: string;

  readonly style?: StateStyle<CheckboxState>;

  readonly className?: string;
  readonly testId?: string;
}

export interface CheckboxState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly checked: boolean;
  readonly indeterminate: boolean;
  readonly invalid: boolean;
}

export const selectionValueText = (
  state: SelectionState,
  words: SelectionWords = defaultMessages.selection,
): string => selectionWord(state, words);

export const checkboxState = (props: CheckboxProps): SelectionState =>
  props.indeterminate === true
    ? "indeterminate"
    : props.checked
      ? "checked"
      : "unchecked";

const markName = (state: SelectionState): "check" | "minus" =>
  state === "indeterminate" ? "minus" : "check";

export const renderCheckboxIndicator = (
  props: CheckboxIndicatorProps,
  spec: SelectionSpec,
  theme: PrimitiveTheme,
): ReactElement => {
  const region: StyleDesc = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  };
  const mark = selectionMarkColor(spec, theme);
  return (
    <div
      style={mergeStyle(
        mergeStyle(
          region,
          recipeTw.classesToStyle(props.className, theme).style,
        ),
        props.style,
      )}
    >
      {props.children ??
        (mark === undefined ? null : (
          <Icon
            name={markName(spec.state)}
            size={iconSideOf(theme, "sm")}
            color={mark}
          />
        ))}
    </div>
  );
};

export const CheckboxIndicator = (
  props: CheckboxIndicatorProps,
): ReactElement => {
  const part = useContext(CheckboxContext);
  if (part === null) {
    throw new Error("CheckboxIndicator must be used inside Checkbox");
  }
  return renderCheckboxIndicator(props, part.spec, part.theme);
};

export const renderCheckbox = (
  props: CheckboxProps,
  theme: PrimitiveTheme,
  state: ValueState<boolean>,
  focus: FocusState,
  onValueChange: (next: boolean) => void,
  messages: PrimitiveMessages = defaultMessages,
): ReactElement => {
  const current: SelectionState =
    props.indeterminate === true
      ? "indeterminate"
      : state.current
        ? "checked"
        : "unchecked";
  const spec: SelectionSpec = {
    state: current,
    size: controlSize(props.size),
    accent: props.accent ?? "primary",
    shape: "square",
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
    cn(selectionBoxClass(spec), props.className),
    theme,
  );
  const drawn =
    spec.disabled === true
      ? suppressSelectionFeedback(mergeStyle(resolved.style, resolved.disabled))
      : resolved.style;
  const drawing = decorative(
    mergeStyle(
      drawn,
      resolveStyle(props.style, {
        disabled: spec.disabled === true,
        focused: focus.focused,
        checked: current === "checked",
        indeterminate: current === "indeterminate",
        invalid: spec.invalid === true,
      }),
    ),
  );
  const target = mergeStyle(
    selectionTargetStyle(spec, theme),
    controlRing(theme, { disabled: spec.disabled, invalid: spec.invalid }),
  );
  return (
    <div
      ref={props.ref}
      role="checkbox"
      aria-label={accessibleName(props.label)}
      aria-description={
        accessibleName(props.description) ??
        accessibleName(props["aria-description"])
      }
      aria-id={props["aria-id"]}
      aria-valuetext={selectionValueText(current, messages.selection)}
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
      <div style={drawing}>
        {current === "unchecked" ? null : (
          <CheckboxContext.Provider value={{ spec, theme }}>
            {renderCheckboxIndicator({ children: props.children }, spec, theme)}
          </CheckboxContext.Provider>
        )}
      </div>
    </div>
  );
};

export const Checkbox = (props: CheckboxProps): ReactElement => {
  const theme = useTheme();
  const messages = useMessages();
  const focus = useFocus();
  const state = useControlState(
    props.checked,
    props.defaultChecked ?? false,
    checkedChange(props),
  );
  return renderCheckbox(props, theme, state.value, focus, state.set, messages);
};
