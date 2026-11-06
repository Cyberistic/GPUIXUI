/** @jsxImportSource @gpuix/react */
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
  isPlainKey,
  orientationOf,
  swallowKeyDefault,
} from "../core/keyboard.js";
import { rovingIndex } from "../core/roving.js";
import { defaultMessages, type PrimitiveMessages } from "../core/messages.js";
import { toggleSelection } from "../core/selection.js";
import { controlSize } from "../core/theme.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import type { ToggleVariant } from "../core/variants.js";
import { stackClass, toggleClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { pressedValueText } from "./Toggle.js";
import {
  focusedOption,
  groupOptions,
  optionBody,
  optionDisabled,
  optionHelp,
  optionItems,
  optionName,
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
  mergeRefs,
  mergeStyle,
  suppressFeedback,
  useControlState,
  type FieldHostProps,
  type HelpProps,
  type InteractionProps,
} from "./internal.js";
import { useMessages } from "./MessagesProvider.js";
import { useTheme } from "./ThemeProvider.js";

export const TOGGLE_GROUP_MODES = ["single", "multiple"] as const;
export type ToggleGroupMode = (typeof TOGGLE_GROUP_MODES)[number];

export type ToggleGroupOption = GroupOption;

export type ToggleGroupItemProps = GroupItemProps;

export const ToggleGroupItem = (_props: ToggleGroupItemProps): null => null;

export const toggleGroupItems = (props: {
  readonly options?: ReadonlyArray<ToggleGroupOption>;
  readonly children?: ReactNode;
}): ReadonlyArray<ToggleGroupOption> =>
  props.options === undefined || props.options === null
    ? optionItems(props.children, ToggleGroupItem)
    : groupOptions(props.options);

export const toggleGroupValues = (value: unknown): ReadonlyArray<string> =>
  P.isString(value)
    ? value === ""
      ? []
      : [value]
    : Arr.isArray(value)
      ? Arr.filter(value, P.isString)
      : [];

const storedSelection = (
  value: unknown,
): Option.Option<ReadonlyArray<string>> =>
  P.isString(value) || Arr.isArray(value)
    ? Option.some(toggleGroupValues(value))
    : Option.none();

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

interface ToggleGroupBase extends InteractionProps, FieldHostProps, HelpProps {
  readonly options?: ReadonlyArray<ToggleGroupOption>;

  readonly children?: ReactNode;

  readonly orientation?: "vertical" | "horizontal";

  readonly variant?: ToggleVariant;

  readonly size?: ControlSize;

  readonly square?: boolean;

  readonly disabled?: boolean;

  readonly label?: string;

  readonly style?: StateStyle<ToggleGroupState>;

  readonly itemStyle?: StateStyle<ToggleItemState>;

  readonly className?: string;

  readonly testId?: string;

  readonly itemTestId?: (value: string) => string;
}

export interface SingleToggleGroupProps extends ToggleGroupBase {
  readonly type: "single";

  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (next: string) => void;
}

export interface MultipleToggleGroupProps extends ToggleGroupBase {
  readonly type?: "multiple";

  readonly value?: ReadonlyArray<string>;
  readonly defaultValue?: ReadonlyArray<string>;
  readonly onValueChange?: (next: ReadonlyArray<string>) => void;
}

export type ToggleGroupProps =
  | SingleToggleGroupProps
  | MultipleToggleGroupProps;

export interface ToggleGroupState {
  readonly disabled: boolean;

  readonly focused: boolean;
}

export interface ToggleItemState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly pressed: boolean;
}

export interface ToggleGroupHandlers extends GroupHandlers, GroupKeys {
  readonly onToggle: (value: string) => void;
}

export const renderToggleGroup = (
  props: ToggleGroupProps,
  theme: PrimitiveTheme,
  values: ReadonlyArray<string>,
  preferredIndex: Option.Option<number>,
  focus: GroupFocus,
  handlers: ToggleGroupHandlers,
  messages: PrimitiveMessages = defaultMessages,
): ReactElement => {
  const { variant = "default", square = false } = props;

  const orientation = orientationOf(props.orientation, "horizontal");
  const size = controlSize(props.size);
  const options = toggleGroupItems(props);
  const count = Arr.length(options);
  const isDisabled = optionDisabled(options, props.disabled);

  const focused = focusedOption(count, focus.focusedIndex);

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
    if (!isPlainKey(event.modifiers)) return;
    const key = event.key ?? "";
    if (swallowKeyDefault(key, "down")) event.preventDefault();
    if (move(key) || jump(key)) return;

    const typed = Option.flatMap(
      Option.all([Option.fromNullishOr(handlers.typeAhead), activeIndex]),
      ([match, from]) => match(from, key),
    );
    if (Option.match(typed, { onNone: () => false, onSome: focusMove })) return;
    if (decideActivation(key, "down", event.isHeld === true)) activate();
  };

  const onKeyUp = (event: KeyEvent): void => {
    if (!isPlainKey(event.modifiers)) return;
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
      focused: Option.isSome(focused),
    }),
  );
  return (
    <div
      role="group"
      aria-label={accessibleName(props.label)}
      aria-description={accessibleName(props.description)}
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
            focused: Option.contains(focused, index),
            pressed,
          }),
        );

        const addressed = Option.contains(activeIndex, index);
        const register = handlers.registerItem(index);
        return (
          <div
            key={option.value}
            ref={addressed ? mergeRefs(register, props.ref) : register}
            role="button"
            aria-label={optionName(option)}
            aria-description={optionHelp(option)}
            aria-id={addressed ? props["aria-id"] : undefined}
            aria-valuetext={pressedValueText(pressed, messages.press)}
            testId={props.itemTestId?.(option.value)}
            tabIndex={
              disabled
                ? undefined
                : Option.contains(activeIndex, index)
                  ? 0
                  : -1
            }
            onLayout={addressed ? props.onLayout : undefined}
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

export const ToggleGroup = (props: ToggleGroupProps): ReactElement => {
  const theme = useTheme();
  const messages = useMessages();
  const focus = useRovingFocus();
  const mode = props.type ?? "multiple";

  const notify = (next: ReadonlyArray<string>): void => {
    if (props.type === "single")
      props.onValueChange?.(toggleGroupValue("single", next));
    else props.onValueChange?.(toggleGroupValue("multiple", next));
  };
  const selected = useControlState<ReadonlyArray<string>>(
    Option.getOrUndefined(storedSelection(props.value)),
    Option.getOrElse(storedSelection(props.defaultValue), () => []),
    notify,
  );
  const options = toggleGroupItems(props);
  const typeAhead = useTypeAhead(
    options,
    optionDisabled(options, props.disabled),
  );
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
      typeAhead,
    },
    messages,
  );
};
