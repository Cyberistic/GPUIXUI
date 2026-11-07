/** @jsxImportSource @gpuix/react */
import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as P from "effect/Predicate";
import { useGpuix } from "@gpuix/react";
import type { PublicInstance, StyleDesc } from "@gpuix/react";
import { targetSize } from "@gpuixui/tokens";
import { accessibleName, visibleCopy } from "../core/a11y.js";
import { controlRing } from "../core/focus.js";
import { storedList, storedText } from "../core/stored.js";
import {
  decideTypeAhead,
  isTypeAheadKey,
  TYPE_AHEAD_RESET_MS,
} from "../core/keyboard.js";
import type { PrimitiveTheme } from "../core/theme.js";
import { recipeTw } from "../recipe/registry.js";
import { mergeStyle } from "./internal.js";
import { Text } from "./Text.js";

export interface GroupOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;

  readonly content?: ReactNode;
}

export interface GroupItemProps {
  readonly value: string;

  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;

  readonly children?: ReactNode;
}

export const optionItems = <Props extends GroupItemProps>(
  children: ReactNode,
  Item: ComponentType<Props>,
): ReadonlyArray<GroupOption> =>
  Arr.flatMap(Children.toArray(children), (child) => {
    if (!isValidElement<Props>(child)) return [];
    if (child.type === Fragment) return optionItems(child.props.children, Item);
    if (child.type !== Item) return [];
    return [
      {
        value: child.props.value,
        label: child.props.label,
        description: child.props.description,
        disabled: child.props.disabled,
        content: child.props.children,
      },
    ];
  });

const storedContent = (value: unknown): ReactNode | undefined =>
  isValidElement(value) || P.isString(value) || P.isNumber(value)
    ? value
    : undefined;

const storedOption = (entry: unknown): Option.Option<GroupOption> => {
  if (!P.isObject(entry)) return Option.none();
  const value = storedText(entry["value"]);
  if (value === undefined) return Option.none();
  const description = storedText(entry["description"]);
  const content = storedContent(entry["content"]);
  return Option.some({
    value,

    label: storedText(entry["label"]) ?? "",
    disabled: entry["disabled"] === true,
    ...(description === undefined ? {} : { description }),
    ...(content === undefined ? {} : { content }),
  });
};

export const groupOptions = (value: unknown): ReadonlyArray<GroupOption> =>
  storedList(value, storedOption);

export const optionName = (option: GroupOption): string | undefined =>
  accessibleName(option.label);

export const optionHelp = (option: GroupOption): string | undefined =>
  accessibleName(option.description);

export const optionBody = (
  option: GroupOption,
  disabled: boolean,
  theme: PrimitiveTheme,
): ReactElement => {
  const caption = visibleCopy(option.description);
  return (
    <div
      style={
        recipeTw.classesToStyle("flex flex-row items-center gap-sm", theme)
          .style
      }
    >
      {option.content === undefined ? (
        <>
          <Text role="label" tone={disabled ? "muted" : "default"}>
            {option.label}
          </Text>
          {caption === undefined ? null : (
            <Text role="caption" tone="muted">
              {caption}
            </Text>
          )}
        </>
      ) : (
        option.content
      )}
    </div>
  );
};

export const optionRowClass = (disabled: boolean): string =>
  `flex flex-row items-center gap-sm ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`;

export const optionRowStyle = (
  state: { readonly disabled: boolean; readonly invalid?: boolean },
  theme: PrimitiveTheme,
): StyleDesc =>
  mergeStyle(
    mergeStyle(
      recipeTw.classesToStyle(optionRowClass(state.disabled), theme).style,
      controlRing(theme, {
        disabled: state.disabled,
        invalid: state.invalid,
      }),
    ),
    { minHeight: targetSize.minimum },
  );

export interface GroupFocus {
  readonly focusedIndex: Option.Option<number>;
  readonly onFocus: (index: number) => void;

  readonly onBlur: (index: number) => void;
}

export interface GroupHandlers {
  readonly onFocusMove: (index: number) => void;

  readonly registerItem: (
    index: number,
  ) => (instance: PublicInstance | null) => void;
}

export type TypeAhead = (from: number, key: string) => Option.Option<number>;

export interface GroupKeys {
  readonly typeAhead?: TypeAhead;
}

export const optionDisabled =
  (
    options: ReadonlyArray<GroupOption>,
    groupDisabled: boolean | undefined,
  ): ((index: number) => boolean) =>
  (index) =>
    groupDisabled === true || options[index]?.disabled === true;

export const focusedOption = (
  count: number,
  focused: Option.Option<number>,
): Option.Option<number> =>
  Option.filter(focused, (index) => index >= 0 && index < count);

export const useTypeAhead = (
  options: ReadonlyArray<GroupOption>,
  isDisabled: (index: number) => boolean,
): TypeAhead => {
  const buffer = useRef("");

  const reset = useRef<Option.Option<ReturnType<typeof setTimeout>>>(
    Option.none(),
  );
  const cancel = (): void =>
    Option.match(reset.current, {
      onNone: () => {},
      onSome: clearTimeout,
    });
  useEffect(
    () => () => {
      cancel();
    },
    [],
  );
  return (from, key) => {
    if (!isTypeAheadKey(key)) return Option.none();
    buffer.current = `${buffer.current}${key}`;
    cancel();
    reset.current = Option.some(
      setTimeout(() => {
        buffer.current = "";
      }, TYPE_AHEAD_RESET_MS),
    );
    return decideTypeAhead(
      Arr.map(options, (option) => option.label),
      from,
      buffer.current,
      isDisabled,
    );
  };
};

export interface RovingFocus extends GroupFocus, GroupHandlers {}

export const useRovingFocus = (): RovingFocus => {
  const { renderer } = useGpuix();
  const [focusedIndex, setFocusedIndex] = useState<Option.Option<number>>(
    Option.none(),
  );
  const ids = useRef<Map<number, number>>(new Map());
  return {
    focusedIndex,
    onFocus: (index) => setFocusedIndex(Option.some(index)),
    onBlur: (index) =>
      setFocusedIndex((current) =>
        Option.filter(current, (focused) => focused !== index),
      ),
    registerItem: (index) => (instance) => {
      if (instance === null) ids.current.delete(index);
      else ids.current.set(index, instance.id);
    },
    onFocusMove: (index) =>
      Option.match(
        Option.all({
          id: Option.fromNullishOr(ids.current.get(index)),
          target: Option.fromNullishOr(renderer),
        }),
        {
          onNone: () => {},

          onSome: ({ id, target }) => {
            target.focusElement?.(id);
            setFocusedIndex(Option.some(index));
          },
        },
      ),
  };
};
