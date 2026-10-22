/**
 * `RadioGroup` — one choice from a small set.
 *
 * A radio group navigates with the arrow keys and holds **one** tab stop: the
 * arrow selects and moves native focus with it, the way the platform behaves.
 * Each item is the same three-state paint as a checkbox with the circle shape,
 * so the two controls cannot drift.
 *
 * Focus is tracked **per item**, not on the wrapper: GPUix dispatches an event
 * to the element that owns the handler, so a wrapper never sees a child's
 * focus. The focused item paints the ring, exactly like a Checkbox.
 *
 * Options arrive either as data (`options`) or as `<RadioGroupItem>` children;
 * both are read into one option list by `radioItems`, so the roving index and
 * the arrow contract have a single path. The data prop is sugar for the part —
 * an element is the only shape that can carry rich content (an icon, a price).
 */

import type { ReactElement, ReactNode } from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { EventPayload, KeyEvent } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import {
  decideAbsolute,
  decideActivation,
  decideMove,
  swallowKeyDefault,
} from "../core/keyboard.js";
import { rovingIndex } from "../core/roving.js";
import type {
  SelectionAccent,
  SelectionSpec,
  SelectionState,
} from "../core/selection.js";
import { accessibleName } from "../core/a11y.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  radioDotClass,
  selectionBoxClass,
  stackClass,
} from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import {
  optionBody,
  optionDisabled,
  optionItems,
  optionName,
  optionRowStyle,
  useRovingFocus,
  useTypeAhead,
  type GroupFocus,
  type GroupHandlers,
  type GroupItemProps,
  type GroupKeys,
  type GroupOption,
} from "./group.js";
import {
  composeEvent,
  composePress,
  decorative,
  mergeRefs,
  mergeStyle,
  suppressSelectionFeedback,
  useControlState,
  valueChange,
  type FieldHostProps,
  type HelpProps,
  type InteractionProps,
  type ValueChangeProps,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export type RadioOption = GroupOption;

/** {@link RadioGroupItem} props: one option written as an element. */
export type RadioGroupItemProps = GroupItemProps;

/**
 * One option as an element, for content the data prop cannot carry.
 *
 * `RadioGroup` reads this part's props and renders the item itself, so the
 * roving index and the arrow contract stay one code path. The part draws
 * nothing on its own.
 */
export const RadioGroupItem = (_props: RadioGroupItemProps): null => null;

/** The option list a group renders: the data prop, or its item children. */
export const radioItems = (props: {
  readonly options?: ReadonlyArray<RadioOption>;
  readonly children?: ReactNode;
}): ReadonlyArray<RadioOption> =>
  props.options ?? optionItems(props.children, RadioGroupItem);

export interface RadioGroupProps
  extends
    ValueChangeProps<string>,
    InteractionProps,
    FieldHostProps,
    HelpProps {
  /** The choices as data. Omit when the options are `RadioGroupItem` children. */
  readonly options?: ReadonlyArray<RadioOption>;
  /** The choices as items, when they carry rich content. */
  readonly children?: ReactNode;
  /** Controlled selection. Omit to let the group hold its own. */
  readonly value?: string;
  readonly defaultValue?: string;
  /** Arrow-key axis. Defaults to `vertical`. */
  readonly orientation?: "vertical" | "horizontal";
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Defaults to `primary`. */
  readonly accent?: SelectionAccent;
  /** Disables every option. */
  readonly disabled?: boolean;
  /** Accessible name for the group. */
  readonly label?: string;
  /** Extra style, resolved against the group's live state and merged last. */
  readonly style?: StateStyle<RadioGroupState>;
  /** Extra style for every option row, resolved against that row's live state. */
  readonly itemStyle?: StateStyle<RadioItemState>;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/** What a `RadioGroup` tells its `style` callback. */
export interface RadioGroupState {
  readonly disabled: boolean;
  /** True while any option holds native focus. */
  readonly focused: boolean;
}

/** What a `RadioGroup` tells its `itemStyle` callback, one row at a time. */
export interface RadioItemState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly checked: boolean;
}

/** Which item holds native focus, and how the group learns that it moved. */
export type RadioGroupFocus = GroupFocus;

/** What the renderer does with the group's own state. */
export interface RadioGroupHandlers extends GroupHandlers, GroupKeys {
  readonly onSelect: (value: string) => void;
}

/** The index the item at `value` sits at, or the first enabled one. */
export const initialActiveIndex = (
  options: ReadonlyArray<RadioOption>,
  value: string,
): number => {
  const indexOf = (matches: (option: RadioOption) => boolean): number =>
    Option.getOrElse(Arr.findFirstIndex(options, matches), () => -1);
  const selected = indexOf((option) => option.value === value);
  if (selected >= 0) return selected;
  return Math.max(
    indexOf((option) => option.disabled !== true),
    0,
  );
};

const itemState = (option: RadioOption, value: string): SelectionState =>
  option.value === value && value !== "" ? "checked" : "unchecked";

export const renderRadioGroup = (
  props: RadioGroupProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  activeIndex: number,
  focus: RadioGroupFocus,
  handlers: RadioGroupHandlers,
): ReactElement => {
  const { orientation = "vertical", size = "md", accent = "primary" } = props;
  const options = radioItems(props);
  const count = Arr.length(options);
  const isDisabled = optionDisabled(options, props.disabled);
  // The stop the group asked for may be a disabled row, which takes no focus;
  // moving to the first option a user can reach is what keeps the group in the
  // tab order.
  const stopIndex = Option.getOrElse(
    rovingIndex(count, Option.some(activeIndex), isDisabled),
    () => activeIndex,
  );
  const select = (index: number): boolean => {
    const option = options[index];
    if (
      props.disabled === true ||
      option === undefined ||
      option.disabled === true
    )
      return false;
    handlers.onSelect(option.value);
    return true;
  };
  /** A keyboard move selects **and** moves focus, so the ring stays on the choice. */
  const navigate = (index: number): boolean => {
    if (!select(index)) return false;
    handlers.onFocusMove(index);
    return true;
  };
  const move = (key: string): boolean =>
    Option.match(decideMove(stopIndex, count, key, orientation, isDisabled), {
      onNone: () => false,
      onSome: navigate,
    });
  const jump = (key: string): boolean =>
    Option.match(decideAbsolute(count, key, isDisabled), {
      onNone: () => false,
      onSome: navigate,
    });
  const onKeyDown = (event: KeyEvent): void => {
    const key = event.key ?? "";
    if (swallowKeyDefault(key, "down")) event.preventDefault();
    if (move(key) || jump(key)) return;
    // A typed prefix lands where a move would: selection follows focus in a
    // radio group, so type-ahead chooses the option it reaches.
    const typed = Option.flatMap(
      Option.fromNullishOr(handlers.typeAhead),
      (match) => match(stopIndex, key),
    );
    if (Option.match(typed, { onNone: () => false, onSome: navigate })) return;
    if (decideActivation(key, "down", event.isHeld === true)) select(stopIndex);
  };
  // Space selects on the release, the way a platform radio does; Enter has
  // already selected on the press, and this handler ignores it.
  const onKeyUp = (event: KeyEvent): void => {
    if (decideActivation(event.key ?? "", "up", false)) select(stopIndex);
  };
  const group = mergeStyle(
    recipeTw.classesToStyle(
      cn(
        stackClass({
          direction: orientation === "horizontal" ? "row" : "column",
          gap: "sm",
        }),
        props.className,
      ),
      theme,
    ).style,
    resolveStyle(props.style, {
      disabled: props.disabled === true,
      focused: Option.isSome(focus.focusedIndex),
    }),
  );
  return (
    <div
      role="radiogroup"
      aria-label={accessibleName(props.label)}
      aria-description={accessibleName(props.description)}
      testId={props.testId}
      onKeyDown={composeEvent<KeyEvent>(props.onKeyDown, onKeyDown)}
      onKeyUp={composeEvent<KeyEvent>(props.onKeyUp, onKeyUp)}
      style={group}
    >
      {Arr.map(options, (option, index) => {
        const current = itemState(option, state.current);
        const disabled = props.disabled === true || option.disabled === true;
        // The address lands on the row that holds the tab stop, so a form can
        // focus the group's current choice rather than an unfocusable wrapper.
        const addressed = index === stopIndex;
        const spec: SelectionSpec = {
          state: current,
          size,
          accent,
          shape: "circle",
          disabled,
        };
        const resolved = recipeTw.classesToStyle(
          selectionBoxClass(spec),
          theme,
        );
        const box = decorative(
          disabled
            ? suppressSelectionFeedback(
                mergeStyle(resolved.style, resolved.disabled),
              )
            : resolved.style,
        );
        const row = mergeStyle(
          optionRowStyle({ disabled, invalid: spec.invalid }, theme),
          resolveStyle(props.itemStyle, {
            disabled,
            focused: Option.contains(focus.focusedIndex, index),
            checked: current === "checked",
          }),
        );
        return (
          <div
            key={option.value}
            ref={
              addressed
                ? mergeRefs(handlers.registerItem(index), props.ref)
                : handlers.registerItem(index)
            }
            role="radio"
            aria-label={optionName(option)}
            aria-id={addressed ? props["aria-id"] : undefined}
            aria-valuetext={current === "checked" ? "checked" : "unchecked"}
            tabIndex={disabled ? undefined : index === stopIndex ? 0 : -1}
            onLayout={addressed ? props.onLayout : undefined}
            onClick={composePress(disabled, props.onClick, () => {
              select(index);
            })}
            onFocus={composeEvent<EventPayload>(props.onFocus, () =>
              focus.onFocus(index),
            )}
            onBlur={composeEvent<EventPayload>(props.onBlur, () =>
              focus.onBlur(index),
            )}
            style={row}
          >
            <div style={box}>
              {current === "checked" ? (
                <div
                  style={
                    recipeTw.classesToStyle(radioDotClass(spec), theme).style
                  }
                />
              ) : null}
            </div>
            {/*
              One body per row: the name pair, or a `RadioGroupItem`'s rich
              content. Keep the content non-interactive: a painted element owns
              a mouse-blocking hitbox in this runtime, so content that accepts
              the press takes it from the row (a `Box` does; text and icons do
              not).
            */}
            {optionBody(option, disabled, theme)}
          </div>
        );
      })}
    </div>
  );
};

/** A group of radio buttons. */
export const RadioGroup = (props: RadioGroupProps): ReactElement => {
  const theme = useTheme();
  const focus = useRovingFocus();
  const selected = useControlState(
    props.value,
    props.defaultValue ?? "",
    valueChange(props),
  );
  const options = radioItems(props);
  const typeAhead = useTypeAhead(
    options,
    optionDisabled(options, props.disabled),
  );
  return renderRadioGroup(
    props,
    theme,
    selected.value,
    initialActiveIndex(options, selected.value.current),
    focus,
    { onSelect: selected.set, ...focus, typeAhead },
  );
};
