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

import {
  Children,
  Fragment,
  isValidElement,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, KeyEvent, PublicInstance } from "@gpuix/react";
import { resolveStyle, type StateStyle } from "@gpuix/react/floating";
import { cn } from "@gpuixui/tw";
import {
  decideAbsolute,
  decideActivation,
  decideMove,
  swallowKeyDefault,
} from "../core/keyboard.js";
import type {
  SelectionAccent,
  SelectionSpec,
  SelectionState,
} from "../core/selection.js";
import { accessibleName } from "../core/a11y.js";
import { controlRing } from "../core/focus.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  radioDotClass,
  selectionBoxClass,
  stackClass,
} from "../recipe/index.js";
import { recipeTw } from "../recipe/registry.js";
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
import { Text } from "./Text.js";

export interface RadioOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
  /**
   * Rich content drawn in place of `label` and `description`. The name stays
   * `label`, so the visible and announced names cannot diverge.
   */
  readonly content?: ReactNode;
}

/** {@link RadioGroupItem} props: one option written as an element. */
export interface RadioGroupItemProps {
  readonly value: string;
  /** The accessible name, and the visible text unless `children` replaces it. */
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
  /** Rich content — an icon, a price — instead of `label`/`description`. */
  readonly children?: ReactNode;
}

/**
 * One option as an element, for content the data prop cannot carry.
 *
 * `RadioGroup` reads this part's props and renders the item itself, so the
 * roving index and the arrow contract stay one code path. The part draws
 * nothing on its own.
 */
export const RadioGroupItem = (_props: RadioGroupItemProps): null => null;

/**
 * The option list a group renders: the data prop, or its item children.
 *
 * Fragments and arrays are transparent, so a caller can group items without
 * changing what the group sees.
 */
const itemsOf = (children: ReactNode): ReadonlyArray<RadioOption> =>
  Arr.flatMap(Children.toArray(children), (child) => {
    if (!isValidElement<RadioGroupItemProps>(child)) return [];
    if (child.type === Fragment) return itemsOf(child.props.children);
    if (child.type !== RadioGroupItem) return [];
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

/** The option list a group renders: the data prop, or its item children. */
export const radioItems = (props: {
  readonly options?: ReadonlyArray<RadioOption>;
  readonly children?: ReactNode;
}): ReadonlyArray<RadioOption> => props.options ?? itemsOf(props.children);

export interface RadioGroupProps
  extends ValueChangeProps<string>, InteractionProps {
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
export interface RadioGroupFocus {
  /** The focused option, or `None` while focus is outside the group. */
  readonly focusedIndex: Option.Option<number>;
  readonly onFocus: (index: number) => void;
  /** Reports the index that lost focus, so a stale blur cannot clear the ring. */
  readonly onBlur: (index: number) => void;
}

/** What the renderer does with the group's own state. */
export interface RadioGroupHandlers {
  readonly onSelect: (value: string) => void;
  /** Move native focus to the option a keyboard move landed on. */
  readonly onFocusMove: (index: number) => void;
  /** Register an option's host instance, so the group can call `focusElement`. */
  readonly registerItem: (
    index: number,
  ) => (instance: PublicInstance | null) => void;
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
  const isDisabled = (index: number): boolean =>
    options[index]?.disabled === true;
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
    Option.match(decideMove(activeIndex, count, key, orientation, isDisabled), {
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
    if (decideActivation(key, "down", event.isHeld === true))
      select(activeIndex);
  };
  // Space selects on the release, the way a platform radio does; Enter has
  // already selected on the press, and this handler ignores it.
  const onKeyUp = (event: KeyEvent): void => {
    if (decideActivation(event.key ?? "", "up", false)) select(activeIndex);
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
      testId={props.testId}
      onKeyDown={composeEvent<KeyEvent>(props.onKeyDown, onKeyDown)}
      onKeyUp={composeEvent<KeyEvent>(props.onKeyUp, onKeyUp)}
      style={group}
    >
      {Arr.map(options, (option, index) => {
        const current = itemState(option, state.current);
        const disabled = props.disabled === true || option.disabled === true;
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
        let box = resolved.style;
        if (disabled) {
          box = suppressSelectionFeedback(mergeStyle(box, resolved.disabled));
        }
        box = mergeStyle(
          box,
          controlRing(theme, { disabled, invalid: spec.invalid }),
        );
        const row = mergeStyle(
          recipeTw.classesToStyle(
            cn(
              "flex flex-row items-center gap-sm",
              disabled ? "cursor-not-allowed" : "cursor-pointer",
            ),
            theme,
          ).style,
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
            role="radio"
            aria-label={option.label}
            aria-valuetext={current === "checked" ? "checked" : "unchecked"}
            tabIndex={disabled ? undefined : index === activeIndex ? 0 : -1}
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
              content. Keep the content non-interactive — GPUix hit-tests the
              deepest element and does not bubble, so content that accepts the
              press takes it from the row (a `Box` does; text and icons do not).
            */}
            <div
              style={
                recipeTw.classesToStyle(
                  "flex flex-row items-center gap-sm",
                  theme,
                ).style
              }
            >
              {option.content === undefined ? (
                <>
                  <Text role="label" tone={disabled ? "muted" : "default"}>
                    {option.label}
                  </Text>
                  {option.description === undefined ? null : (
                    <Text role="caption" tone="muted">
                      {option.description}
                    </Text>
                  )}
                </>
              ) : (
                option.content
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** A group of radio buttons. */
export const RadioGroup = (props: RadioGroupProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const [focusedIndex, setFocusedIndex] = useState<Option.Option<number>>(
    Option.none(),
  );
  const itemIds = useRef<Map<number, number>>(new Map());
  const selected = useControlState(
    props.value,
    props.defaultValue ?? "",
    valueChange(props),
  );
  return renderRadioGroup(
    props,
    theme,
    selected.value,
    initialActiveIndex(radioItems(props), selected.value.current),
    {
      focusedIndex,
      onFocus: (index) => setFocusedIndex(Option.some(index)),
      onBlur: (index) =>
        setFocusedIndex((current) =>
          Option.filter(current, (focused) => focused !== index),
        ),
    },
    {
      onSelect: selected.set,
      onFocusMove: (index) =>
        Option.match(
          Option.all({
            id: Option.fromNullishOr(itemIds.current.get(index)),
            target: Option.fromNullishOr(renderer),
          }),
          {
            onNone: () => {},
            // Paint where focus is going in the same commit: the focus event
            // follows the native call, and waiting for it would paint the ring
            // a frame late. The call keeps its receiver — `focusElement` is a
            // method on the renderer, not a free function.
            onSome: ({ id, target }) => {
              target.focusElement?.(id);
              setFocusedIndex(Option.some(index));
            },
          },
        ),
      registerItem: (index) => (instance) => {
        if (instance === null) itemIds.current.delete(index);
        else itemIds.current.set(index, instance.id);
      },
    },
  );
};
