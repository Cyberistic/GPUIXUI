/**
 * `CheckboxGroup` — several independent choices that share one tab stop.
 *
 * A group of checkboxes is not a `RadioGroup`: picking one does not clear the
 * others, so the arrows move focus and only `Space`/`Enter` changes the value.
 * The group still holds **one** tab stop, and that stop skips a disabled option
 * — a group whose value was a disabled option used to have no reachable stop.
 *
 * The state reaches assistive technology through `aria-valuetext` (`"checked"` /
 * `"unchecked"`) because `@gpuix/native` 0.11.0 has no `aria-checked`; each row
 * is a named checkbox and the container is a named `group`. There is no
 * `aria-multiselectable`, so the group role does not claim one.
 *
 * Options arrive as data (`options`) or as `<CheckboxGroupItem>` children; both
 * are read into one list by `checkboxGroupItems`, so the roving index, the
 * arrow contract and the row paint have a single path.
 */

import type { ReactElement, ReactNode } from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { EventPayload, KeyEvent } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { accessibleName } from "../core/a11y.js";
import { controlRing } from "../core/focus.js";
import {
  decideAbsolute,
  decideActivation,
  decideMove,
  swallowKeyDefault,
} from "../core/keyboard.js";
import { rovingIndex } from "../core/roving.js";
import {
  toggleSelection,
  type SelectionAccent,
  type SelectionSpec,
  type SelectionState,
} from "../core/selection.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { selectionBoxClass, stackClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { renderCheckboxIndicator, selectionValueText } from "./Checkbox.js";
import {
  optionBody,
  optionItems,
  optionRowClass,
  useRovingFocus,
  type GroupFocus,
  type GroupHandlers,
  type GroupItemProps,
  type GroupOption,
} from "./group.js";
import {
  composeEvent,
  composePress,
  mergeStyle,
  suppressSelectionFeedback,
  useControlState,
  valueChange,
  type InteractionProps,
  type ValueChangeProps,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

export type CheckboxGroupOption = GroupOption;

/** {@link CheckboxGroupItem} props: one option written as an element. */
export type CheckboxGroupItemProps = GroupItemProps;

/**
 * One option as an element, for content the data prop cannot carry.
 *
 * `CheckboxGroup` reads this part's props and renders the row itself, so the
 * roving index and the key contract stay one code path. The part draws nothing
 * on its own.
 */
export const CheckboxGroupItem = (_props: CheckboxGroupItemProps): null => null;

/** The option list a group renders: the data prop, or its item children. */
export const checkboxGroupItems = (props: {
  readonly options?: ReadonlyArray<CheckboxGroupOption>;
  readonly children?: ReactNode;
}): ReadonlyArray<CheckboxGroupOption> =>
  props.options ?? optionItems(props.children, CheckboxGroupItem);

export interface CheckboxGroupProps
  extends ValueChangeProps<ReadonlyArray<string>>, InteractionProps {
  /** The choices as data. Omit when the options are item children. */
  readonly options?: ReadonlyArray<CheckboxGroupOption>;
  /** The choices as items, when they carry rich content. */
  readonly children?: ReactNode;
  /** Controlled selection: the values that are on. */
  readonly value?: ReadonlyArray<string>;
  readonly defaultValue?: ReadonlyArray<string>;
  /** Arrow-key axis. Defaults to `vertical`. */
  readonly orientation?: "vertical" | "horizontal";
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Defaults to `primary`. */
  readonly accent?: SelectionAccent;
  /** Disables every option. */
  readonly disabled?: boolean;
  /** Paints every box and its focus ring destructive. */
  readonly invalid?: boolean;
  /** Accessible name for the group. */
  readonly label?: string;
  /** Extra style, resolved against the group's live state and merged last. */
  readonly style?: StateStyle<CheckboxGroupState>;
  /** Extra style for every option row, resolved against that row's live state. */
  readonly itemStyle?: StateStyle<CheckboxItemState>;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/** What a `CheckboxGroup` tells its `style` callback. */
export interface CheckboxGroupState {
  readonly disabled: boolean;
  /** True while any option holds native focus. */
  readonly focused: boolean;
}

/** What a `CheckboxGroup` tells its `itemStyle` callback, one row at a time. */
export interface CheckboxItemState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly checked: boolean;
}

/** What the renderer does with the group's own state. */
export interface CheckboxGroupHandlers extends GroupHandlers {
  /** Turn one option on or off. */
  readonly onToggle: (value: string) => void;
}

export const renderCheckboxGroup = (
  props: CheckboxGroupProps,
  theme: PrimitiveTheme,
  values: ReadonlyArray<string>,
  preferredIndex: Option.Option<number>,
  focus: GroupFocus,
  handlers: CheckboxGroupHandlers,
): ReactElement => {
  const { orientation = "vertical", size = "md", accent = "primary" } = props;
  const options = checkboxGroupItems(props);
  const count = Arr.length(options);
  const isDisabled = (index: number): boolean =>
    props.disabled === true || options[index]?.disabled === true;
  // The preferred stop may be a disabled row, which takes no focus; the first
  // option a user can reach is what keeps the group in the tab order.
  const activeIndex = rovingIndex(count, preferredIndex, isDisabled);
  const toggle = (index: number): void => {
    const option = options[index];
    if (option === undefined || isDisabled(index)) return;
    handlers.onToggle(option.value);
  };
  const focusMove = (index: number): true => {
    handlers.onFocusMove(index);
    return true;
  };
  const move = (key: string): boolean =>
    Option.match(activeIndex, {
      onNone: () => false,
      onSome: (index) =>
        Option.match(decideMove(index, count, key, orientation, isDisabled), {
          onNone: () => false,
          onSome: focusMove,
        }),
    });
  const jump = (key: string): boolean =>
    Option.match(decideAbsolute(count, key, isDisabled), {
      onNone: () => false,
      onSome: focusMove,
    });
  const activate = (): void => {
    Option.match(activeIndex, { onNone: () => {}, onSome: toggle });
  };
  const onKeyDown = (event: KeyEvent): void => {
    const key = event.key ?? "";
    if (swallowKeyDefault(key, "down")) event.preventDefault();
    if (move(key) || jump(key)) return;
    if (decideActivation(key, "down", event.isHeld === true)) activate();
  };
  // Space toggles on the release, the way a platform checkbox does; Enter has
  // already toggled on the press, and this handler ignores it.
  const onKeyUp = (event: KeyEvent): void => {
    if (decideActivation(event.key ?? "", "up", false)) activate();
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
      role="group"
      aria-label={accessibleName(props.label)}
      testId={props.testId}
      onKeyDown={composeEvent<KeyEvent>(props.onKeyDown, onKeyDown)}
      onKeyUp={composeEvent<KeyEvent>(props.onKeyUp, onKeyUp)}
      style={group}
    >
      {Arr.map(options, (option, index) => {
        const disabled = isDisabled(index);
        const current: SelectionState = Arr.contains(values, option.value)
          ? "checked"
          : "unchecked";
        const spec: SelectionSpec = {
          state: current,
          size,
          accent,
          shape: "square",
          disabled,
          invalid: props.invalid,
        };
        const resolved = recipeTw.classesToStyle(
          selectionBoxClass(spec),
          theme,
        );
        let box = resolved.style;
        if (disabled) {
          box = suppressSelectionFeedback(mergeStyle(box, resolved.disabled));
        }
        box = mergeStyle(
          box,
          controlRing(theme, { disabled, invalid: spec.invalid }),
        );
        const row = mergeStyle(
          recipeTw.classesToStyle(optionRowClass(disabled), theme).style,
          resolveStyle(props.itemStyle, {
            disabled,
            focused: Option.contains(focus.focusedIndex, index),
            checked: current === "checked",
          }),
        );
        return (
          <div
            key={option.value}
            ref={handlers.registerItem(index)}
            role="checkbox"
            aria-label={option.label}
            aria-valuetext={selectionValueText(current)}
            tabIndex={
              disabled
                ? undefined
                : Option.contains(activeIndex, index)
                  ? 0
                  : -1
            }
            onClick={composePress(disabled, props.onClick, () => {
              toggle(index);
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
              {current === "unchecked"
                ? null
                : renderCheckboxIndicator({}, spec, theme)}
            </div>
            {optionBody(option, disabled, theme)}
          </div>
        );
      })}
    </div>
  );
};

/** A group of independent checkboxes with one tab stop. */
export const CheckboxGroup = (props: CheckboxGroupProps): ReactElement => {
  const theme = useTheme();
  const focus = useRovingFocus();
  const selected = useControlState<ReadonlyArray<string>>(
    props.value,
    props.defaultValue ?? [],
    valueChange(props),
  );
  const options = checkboxGroupItems(props);
  const preferred: Option.Option<number> = Option.firstSomeOf([
    focus.focusedIndex,
    Arr.findFirstIndex(options, (option) =>
      Arr.contains(selected.value.current, option.value),
    ),
  ]);
  return renderCheckboxGroup(
    props,
    theme,
    selected.value.current,
    preferred,
    focus,
    {
      onToggle: (value) =>
        selected.set(
          toggleSelection("multiple", selected.value.current, value),
        ),
      onFocusMove: focus.onFocusMove,
      registerItem: focus.registerItem,
    },
  );
};
