/** @jsxImportSource @gpuix/react */
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
  isPlainKey,
  orientationOf,
  swallowKeyDefault,
} from "../core/keyboard.js";
import { rovingIndex } from "../core/roving.js";
import { defaultMessages, type PrimitiveMessages } from "../core/messages.js";
import type {
  SelectionAccent,
  SelectionSpec,
  SelectionState,
} from "../core/selection.js";
import { accessibleName } from "../core/a11y.js";
import type { ValueState } from "../core/state.js";
import { controlSize } from "../core/theme.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  radioDotClass,
  selectionBoxClass,
  stackClass,
} from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
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
import { selectionValueText } from "./Checkbox.js";
import { useMessages } from "./MessagesProvider.js";
import { useTheme } from "./ThemeProvider.js";

export type RadioOption = GroupOption;

export type RadioGroupItemProps = GroupItemProps;

export const RadioGroupItem = (_props: RadioGroupItemProps): null => null;

export const radioItems = (props: {
  readonly options?: ReadonlyArray<RadioOption>;
  readonly children?: ReactNode;
}): ReadonlyArray<RadioOption> =>
  props.options === undefined || props.options === null
    ? optionItems(props.children, RadioGroupItem)
    : groupOptions(props.options);

export interface RadioGroupProps
  extends
    ValueChangeProps<string>,
    InteractionProps,
    FieldHostProps,
    HelpProps {
  readonly options?: ReadonlyArray<RadioOption>;

  readonly children?: ReactNode;

  readonly value?: string;
  readonly defaultValue?: string;

  readonly orientation?: "vertical" | "horizontal";

  readonly size?: ControlSize;

  readonly accent?: SelectionAccent;

  readonly disabled?: boolean;

  readonly invalid?: boolean;

  readonly label?: string;

  readonly style?: StateStyle<RadioGroupState>;

  readonly itemStyle?: StateStyle<RadioItemState>;

  readonly className?: string;

  readonly testId?: string;

  readonly itemTestId?: (value: string) => string;
}

export interface RadioGroupState {
  readonly disabled: boolean;

  readonly focused: boolean;
}

export interface RadioItemState {
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly checked: boolean;
}

export type RadioGroupFocus = GroupFocus;

export interface RadioGroupHandlers extends GroupHandlers, GroupKeys {
  readonly onSelect: (value: string) => void;
}

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
  option.value === value ? "checked" : "unchecked";

export const renderRadioGroup = (
  props: RadioGroupProps,
  theme: PrimitiveTheme,
  state: ValueState<string>,
  activeIndex: number,
  focus: RadioGroupFocus,
  handlers: RadioGroupHandlers,
  messages: PrimitiveMessages = defaultMessages,
): ReactElement => {
  const orientation = orientationOf(props.orientation, "vertical");
  const { accent = "primary" } = props;
  const size = controlSize(props.size);
  const invalid = props.invalid === true;
  const options = radioItems(props);
  const count = Arr.length(options);
  const isDisabled = optionDisabled(options, props.disabled);

  const focused = focusedOption(count, focus.focusedIndex);

  const from = Option.getOrElse(
    Option.filter(focused, (index) => !isDisabled(index)),
    () => activeIndex,
  );

  const stopIndex = Option.getOrElse(
    rovingIndex(count, Option.some(from), isDisabled),
    () => from,
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
    if (!isPlainKey(event.modifiers)) return;
    const key = event.key ?? "";
    if (swallowKeyDefault(key, "down")) event.preventDefault();
    if (move(key) || jump(key)) return;

    const typed = Option.flatMap(
      Option.fromNullishOr(handlers.typeAhead),
      (match) => match(stopIndex, key),
    );
    if (Option.match(typed, { onNone: () => false, onSome: navigate })) return;
    if (decideActivation(key, "down", event.isHeld === true)) select(stopIndex);
  };

  const onKeyUp = (event: KeyEvent): void => {
    if (!isPlainKey(event.modifiers)) return;
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
      focused: Option.isSome(focused),
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

        const addressed = index === stopIndex;
        const spec: SelectionSpec = {
          state: current,
          size,
          accent,
          shape: "circle",
          disabled,
          invalid,
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
          optionRowStyle({ disabled, invalid }, theme),
          resolveStyle(props.itemStyle, {
            disabled,
            focused: Option.contains(focused, index),
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
            aria-description={optionHelp(option)}
            aria-id={addressed ? props["aria-id"] : undefined}
            aria-valuetext={selectionValueText(current, messages.selection)}
            testId={props.itemTestId?.(option.value)}
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
            {}
            {optionBody(option, disabled, theme)}
          </div>
        );
      })}
    </div>
  );
};

export const RadioGroup = (props: RadioGroupProps): ReactElement => {
  const theme = useTheme();
  const messages = useMessages();
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
    messages,
  );
};
