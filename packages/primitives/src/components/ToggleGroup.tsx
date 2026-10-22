/**
 * `ToggleGroup` — a toolbar of related modes.
 *
 * It is a group of `Toggle`s, not of `Switch`es or `Checkbox`es: each option
 * sets a mode for the next action, pressing one can clear it, and the group
 * holds **one** tab stop that the arrow keys move between options. `single`
 * keeps at most one mode on (an alignment palette); `multiple` lets any number
 * stay on (bold and italic together).
 *
 * **The accessibility limitation:** `@gpuix/native` 0.11.0 has no
 * `aria-pressed`, so each option announces its state through `aria-valuetext`
 * (`"pressed"` / `"not pressed"`), exactly like `Toggle`. The group is a named
 * `group`.
 *
 * Arrow keys move focus only — a toggle is a button, so moving focus must not
 * change what the next action does. `Space`/`Enter` toggles the focused option.
 */

import type { ReactElement, ReactNode } from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
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
import { toggleSelection } from "../core/selection.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import type { ToggleVariant } from "../core/variants.js";
import { stackClass, toggleClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { pressedValueText } from "./Toggle.js";
import {
  optionBody,
  optionItems,
  optionName,
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
  suppressFeedback,
  useControlState,
  type InteractionProps,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";

/** How many options a toggle group can hold on at once. */
export const TOGGLE_GROUP_MODES = ["single", "multiple"] as const;
export type ToggleGroupMode = (typeof TOGGLE_GROUP_MODES)[number];

export type ToggleGroupOption = GroupOption;

/** {@link ToggleGroupItem} props: one option written as an element. */
export type ToggleGroupItemProps = GroupItemProps;

/**
 * One option as an element, for content the data prop cannot carry.
 *
 * `ToggleGroup` reads this part's props and renders the button itself, so the
 * roving index and the key contract stay one code path. The part draws nothing
 * on its own.
 */
export const ToggleGroupItem = (_props: ToggleGroupItemProps): null => null;

/** The option list a group renders: the data prop, or its item children. */
export const toggleGroupItems = (props: {
  readonly options?: ReadonlyArray<ToggleGroupOption>;
  readonly children?: ReactNode;
}): ReadonlyArray<ToggleGroupOption> =>
  props.options ?? optionItems(props.children, ToggleGroupItem);

/**
 * The values a controlled or default prop stands for.
 *
 * A `single` group takes one string, a `multiple` group an array — but either
 * shape is accepted by both, because a caller who switches `type` should not
 * have to rewrite the value it passes.
 */
export const toggleGroupValues = (
  value: string | ReadonlyArray<string>,
): ReadonlyArray<string> =>
  P.isString(value) ? (value === "" ? [] : [value]) : value;

/** The value a caller's `onValueChange` receives for the group's mode. */
export function toggleGroupValue(
  mode: "single",
  values: ReadonlyArray<string>,
): string;
export function toggleGroupValue(
  mode: "multiple",
  values: ReadonlyArray<string>,
): ReadonlyArray<string>;
export function toggleGroupValue(
  mode: ToggleGroupMode,
  values: ReadonlyArray<string>,
): string | ReadonlyArray<string> {
  return mode === "single" ? (values[0] ?? "") : values;
}

/** The props both modes share. */
interface ToggleGroupBase extends InteractionProps {
  /** The choices as data. Omit when the options are item children. */
  readonly options?: ReadonlyArray<ToggleGroupOption>;
  /** The choices as items, when they carry rich content. */
  readonly children?: ReactNode;
  /** Arrow-key axis. Defaults to `horizontal`, the toolbar's shape. */
  readonly orientation?: "vertical" | "horizontal";
  /** Defaults to `default`. */
  readonly variant?: ToggleVariant;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Equal width and height per option, for an icon-only group. */
  readonly square?: boolean;
  /** Disables every option. */
  readonly disabled?: boolean;
  /** Accessible name for the group. */
  readonly label?: string;
  /** Extra style, resolved against the group's live state and merged last. */
  readonly style?: StateStyle<ToggleGroupState>;
  /** Extra style for every option button, resolved against that button's live state. */
  readonly itemStyle?: StateStyle<ToggleItemState>;
  /** A Tailwind class string, joined after the recipe so it wins conflicts. */
  readonly className?: string;
  readonly testId?: string;
}

/** At most one mode on; the value and its report are one string. */
export interface SingleToggleGroupProps extends ToggleGroupBase {
  readonly type: "single";
  /** Controlled pressed value. Omit to let the group hold its own. */
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (next: string) => void;
}

/** Any number of modes on (the default); the value and its report are an array. */
export interface MultipleToggleGroupProps extends ToggleGroupBase {
  readonly type?: "multiple";
  /** Controlled pressed values. Omit to let the group hold its own. */
  readonly value?: ReadonlyArray<string>;
  readonly defaultValue?: ReadonlyArray<string>;
  readonly onValueChange?: (next: ReadonlyArray<string>) => void;
}

/**
 * The group's props, discriminated by `type`, so a `single` group's
 * `onValueChange` is a `string` callback and a `multiple` group's is an array
 * callback — a caller never has to narrow inside its own handler.
 */
export type ToggleGroupProps =
  | SingleToggleGroupProps
  | MultipleToggleGroupProps;

/** What a `ToggleGroup` tells its `style` callback. */
export interface ToggleGroupState {
  readonly disabled: boolean;
  /** True while any option holds native focus. */
  readonly focused: boolean;
}

/** What a `ToggleGroup` tells its `itemStyle` callback, one option at a time. */
export interface ToggleItemState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly pressed: boolean;
}

/** What the renderer does with the group's own state. */
export interface ToggleGroupHandlers extends GroupHandlers {
  /** Turn one option on or off. */
  readonly onToggle: (value: string) => void;
}

export const renderToggleGroup = (
  props: ToggleGroupProps,
  theme: PrimitiveTheme,
  values: ReadonlyArray<string>,
  preferredIndex: Option.Option<number>,
  focus: GroupFocus,
  handlers: ToggleGroupHandlers,
): ReactElement => {
  const {
    orientation = "horizontal",
    size = "md",
    variant = "default",
    square = false,
  } = props;
  const options = toggleGroupItems(props);
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
  // Space toggles on the release, the way a platform button does; Enter has
  // already toggled on the press, and this handler ignores it.
  const onKeyUp = (event: KeyEvent): void => {
    if (decideActivation(event.key ?? "", "up", false)) activate();
  };
  const group = mergeStyle(
    recipeTw.classesToStyle(
      cn(
        stackClass({
          direction: orientation === "horizontal" ? "row" : "column",
          gap: "xs",
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
        const pressed = Arr.contains(values, option.value);
        const resolved = recipeTw.classesToStyle(
          toggleClass(variant, pressed, size, { square }),
          theme,
        );
        let style = resolved.style;
        if (disabled) {
          style = suppressFeedback(mergeStyle(style, resolved.disabled));
        }
        style = mergeStyle(style, controlRing(theme, { disabled }));
        style = mergeStyle(
          style,
          resolveStyle(props.itemStyle, {
            disabled,
            focused: Option.contains(focus.focusedIndex, index),
            pressed,
          }),
        );
        return (
          <div
            key={option.value}
            ref={handlers.registerItem(index)}
            role="button"
            aria-label={optionName(option)}
            aria-valuetext={pressedValueText(pressed)}
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
            style={style}
          >
            {optionBody(option, disabled, theme)}
          </div>
        );
      })}
    </div>
  );
};

/** A group of related modes with one tab stop. */
export const ToggleGroup = (props: ToggleGroupProps): ReactElement => {
  const theme = useTheme();
  const focus = useRovingFocus();
  const mode = props.type ?? "multiple";
  /** Report in the shape the caller's `type` implies. */
  const notify = (next: ReadonlyArray<string>): void => {
    if (props.type === "single")
      props.onValueChange?.(toggleGroupValue("single", next));
    else props.onValueChange?.(toggleGroupValue("multiple", next));
  };
  const selected = useControlState<ReadonlyArray<string>>(
    props.value === undefined ? undefined : toggleGroupValues(props.value),
    props.defaultValue === undefined
      ? []
      : toggleGroupValues(props.defaultValue),
    notify,
  );
  const options = toggleGroupItems(props);
  const preferred: Option.Option<number> = Option.firstSomeOf([
    focus.focusedIndex,
    Arr.findFirstIndex(options, (option) =>
      Arr.contains(selected.value.current, option.value),
    ),
  ]);
  return renderToggleGroup(
    props,
    theme,
    selected.value.current,
    preferred,
    focus,
    {
      onToggle: (value) =>
        selected.set(toggleSelection(mode, selected.value.current, value)),
      onFocusMove: focus.onFocusMove,
      registerItem: focus.registerItem,
    },
  );
};
