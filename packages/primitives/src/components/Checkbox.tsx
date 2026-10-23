/**
 * `Checkbox` — an independent yes/no.
 *
 * GPUix exposes **no `aria-checked`** (see `docs/gpuix-capabilities.md`), so the state is reported
 * through `aria-valuetext` (the provider's `messages.selection` words, shipped as
 * `"checked"` / `"unchecked"` / `"mixed"`), which is the supported way to make a
 * checkbox legible to assistive technology. The same three states are one paint
 * resolved by `core/selection.ts`.
 *
 * Two parts (`docs/component-api.md` §8): the box, and `CheckboxIndicator` —
 * the mark — so a caller can replace the glyph without rebuilding the control.
 * `Checkbox`'s children are the indicator's content; the root keeps the
 * pointer-events guard, so a custom mark cannot swallow the press.
 *
 * It forwards the `Tooltip` trigger pair (`TooltipTriggerProps`) onto the press
 * target, because a box in a toolbar is described by a tip: the runtime
 * delivers a hover only to the element that registered the listener, so without
 * the pair the tip opened on focus and never on hover.
 */

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
import { controlSize } from "../core/theme.js";
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

/** What a part reads from the box it belongs to. */
interface CheckboxPart {
  readonly spec: SelectionSpec;
  readonly theme: PrimitiveTheme;
}

const CheckboxContext = createContext<CheckboxPart | null>(null);

/** {@link CheckboxIndicator} props. */
export interface CheckboxIndicatorProps {
  /** A custom mark, drawn instead of the default check/dash. */
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
  /** Controlled. Omit to let the checkbox hold its own state. */
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;
  /** A custom mark, drawn instead of the default check/dash. */
  readonly children?: ReactNode;
  /** A third state, drawn as a dash. Overrides `checked` when true. */
  readonly indeterminate?: boolean;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Defaults to `primary`. */
  readonly accent?: SelectionAccent;
  /**
   * Accessible name. A `Label` beside the box only paints the text — it is not
   * associated with the control — so this prop is what names it; pass the same
   * string, or spread `labelledBy(name)`.
   */
  readonly label?: string;
  /** Extra style, resolved against the box's live state and merged last. */
  readonly style?: StateStyle<CheckboxState>;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/** What a `Checkbox` tells a `style` callback. */
export interface CheckboxState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly checked: boolean;
  readonly indeterminate: boolean;
  readonly invalid: boolean;
}

/** What a checkbox announces: there is no `aria-checked` to carry it. */
export const selectionValueText = (
  state: SelectionState,
  words: SelectionWords = defaultMessages.selection,
): string => selectionWord(state, words);

/** The state a checkbox is in, from its props. */
export const checkboxState = (props: CheckboxProps): SelectionState =>
  props.indeterminate === true
    ? "indeterminate"
    : props.checked
      ? "checked"
      : "unchecked";

const markName = (state: SelectionState): "check" | "minus" =>
  state === "indeterminate" ? "minus" : "check";

/**
 * The mark inside a checked box.
 *
 * A second styled region, so a caller can replace the glyph without replacing
 * the control. `pointerEvents: "none"` is load-bearing, not decoration: the
 * runtime hit-tests to the deepest element under the point and does not bubble
 * an unhandled click, so a custom mark that took the press would make the box
 * untoggleable (measured for the switch's thumb in `runtime/controls.runtime.test.tsx`).
 */
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
      {props.children ?? (
        <Icon
          name={markName(spec.state)}
          size={theme.iconSize.sm}
          color={selectionMarkColor(spec, theme)}
        />
      )}
    </div>
  );
};

/** The mark inside a checked box; `Checkbox`'s children replace the glyph. */
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
      // A tooltip arrives through the same channel as the caller's help; an
      // explicit `description` is the field-style help and wins.
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

/** A checkbox. */
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
