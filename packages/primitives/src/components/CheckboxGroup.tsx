/** @jsxImportSource @gpuix/react */
import type { ReactElement, ReactNode } from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { EventPayload, KeyEvent } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import { accessibleName } from "../core/a11y.js";
import {
  decideAbsolute,
  decideActivation,
  decideMove,
  isPlainKey,
  orientationOf,
  swallowKeyDefault,
} from "../core/keyboard.js";
import { defaultMessages, type PrimitiveMessages } from "../core/messages.js";
import { rovingIndex } from "../core/roving.js";
import {
  toggleSelection,
  type SelectionAccent,
  type SelectionSpec,
  type SelectionState,
} from "../core/selection.js";
import { controlSize } from "../core/theme.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { storedTextList } from "../core/stored.js";
import { selectionBoxClass, stackClass } from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
import { renderCheckboxIndicator, selectionValueText } from "./Checkbox.js";
import {
  focusedOption,
  groupOptions,
  optionBody,
  optionDisabled,
  optionHelp,
  optionItems,
  optionName,
  optionRowStyle,
  useRovingFocus,
  useTypeAhead,
  type GroupFocus,
  type GroupHandlers,
  type GroupKeys,
  type GroupItemProps,
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
import { useMessages } from "./MessagesProvider.js";

export type CheckboxGroupOption = GroupOption;

export type CheckboxGroupItemProps = GroupItemProps;

export const CheckboxGroupItem = (_props: CheckboxGroupItemProps): null => null;

export const checkboxGroupItems = (props: {
  readonly options?: ReadonlyArray<CheckboxGroupOption>;
  readonly children?: ReactNode;
}): ReadonlyArray<CheckboxGroupOption> =>
  props.options === undefined || props.options === null
    ? optionItems(props.children, CheckboxGroupItem)
    : groupOptions(props.options);

export interface CheckboxGroupProps
  extends
    ValueChangeProps<ReadonlyArray<string>>,
    InteractionProps,
    FieldHostProps,
    HelpProps {
  readonly options?: ReadonlyArray<CheckboxGroupOption>;

  readonly children?: ReactNode;

  readonly value?: ReadonlyArray<string>;
  readonly defaultValue?: ReadonlyArray<string>;

  readonly orientation?: "vertical" | "horizontal";

  readonly size?: ControlSize;

  readonly accent?: SelectionAccent;

  readonly disabled?: boolean;

  readonly invalid?: boolean;

  readonly label?: string;

  readonly style?: StateStyle<CheckboxGroupState>;

  readonly itemStyle?: StateStyle<CheckboxItemState>;

  readonly className?: string;

  readonly testId?: string;

  readonly itemTestId?: (value: string) => string;
}

export interface CheckboxGroupState {
  readonly disabled: boolean;

  readonly focused: boolean;
}

export interface CheckboxItemState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly checked: boolean;
}

export interface CheckboxGroupHandlers extends GroupHandlers, GroupKeys {
  readonly onToggle: (value: string) => void;
}

export const renderCheckboxGroup = (
  props: CheckboxGroupProps,
  theme: PrimitiveTheme,
  values: ReadonlyArray<string>,
  preferredIndex: Option.Option<number>,
  focus: GroupFocus,
  handlers: CheckboxGroupHandlers,
  messages: PrimitiveMessages = defaultMessages,
): ReactElement => {
  const orientation = orientationOf(props.orientation, "vertical");
  const { accent = "primary" } = props;
  const size = controlSize(props.size);
  const options = checkboxGroupItems(props);
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
          gap: "sm",
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
            focused: Option.contains(focused, index),
            checked: current === "checked",
          }),
        );

        const addressed = Option.contains(activeIndex, index);
        const register = handlers.registerItem(index);
        return (
          <div
            key={option.value}
            ref={addressed ? mergeRefs(register, props.ref) : register}
            role="checkbox"
            aria-label={optionName(option)}
            aria-description={optionHelp(option)}
            aria-id={addressed ? props["aria-id"] : undefined}
            aria-valuetext={selectionValueText(current, messages.selection)}
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

export const CheckboxGroup = (props: CheckboxGroupProps): ReactElement => {
  const theme = useTheme();
  const messages = useMessages();
  const focus = useRovingFocus();
  const selected = useControlState<ReadonlyArray<string>>(
    Option.getOrUndefined(storedTextList(props.value)),
    Option.getOrElse(storedTextList(props.defaultValue), () => []),
    valueChange(props),
  );
  const options = checkboxGroupItems(props);
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
      typeAhead,
    },
    messages,
  );
};
