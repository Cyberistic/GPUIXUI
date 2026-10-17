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
 * The options are data rather than children because the group owns the roving
 * index and the arrow contract over them; a compound API would move that logic
 * into a context each child reads, which is strictly more code for the same
 * behaviour. This deviation from shadcn's compound shape is recorded in
 * `COMPONENTS.md`.
 */

import { useRef, useState, type ReactElement } from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import {
  decideAbsolute,
  decideActivation,
  decideMove,
} from "../core/keyboard.js";
import {
  initialActiveIndex,
  radioDotStyle,
  selectionBoxStyle,
  type SelectionAccent,
  type SelectionSpec,
  type SelectionState,
} from "../core/selection.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  resolvePartStyle,
  useControlState,
  type StateStyle,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";
import { Text } from "./Text.js";

export interface RadioOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

/** The public state a `RadioGroup` style callback receives. */
export interface RadioGroupState {
  readonly disabled: boolean;
  readonly invalid: boolean;
}

/** The public state a `RadioGroup` option callback receives. */
export interface RadioOptionState {
  readonly value: string;
  readonly index: number;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}

export interface RadioGroupProps {
  /** Controlled selection. Omit to let the group hold its own. */
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onChange?: (value: string) => void;
  readonly options: ReadonlyArray<RadioOption>;
  /** Arrow-key axis. Defaults to `vertical`. */
  readonly orientation?: "vertical" | "horizontal";
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Defaults to `primary`. */
  readonly accent?: SelectionAccent;
  /** Disables every option. */
  readonly disabled?: boolean;
  /**
   * A failed validation paints the empty circles with the destructive border,
   * like every other field control. A checked circle keeps its accent.
   */
  readonly invalid?: boolean;
  /** Accessible name for the group. */
  readonly label?: string;
  /** An object, or a callback over the group's public state. */
  readonly style?: StateStyle<RadioGroupState>;
  /**
   * An object, or a callback over each option's own state. Merged last on the
   * option row that holds the tab stop and the accessible name.
   */
  readonly optionStyle?: StateStyle<RadioOptionState>;
  readonly testId?: string;
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
export { initialActiveIndex };

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
  const {
    options,
    orientation = "vertical",
    size = "md",
    accent = "primary",
  } = props;
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
  const onKeyDown = (event: EventPayload): void => {
    const key = event.key ?? "";
    if (move(key) || jump(key)) return;
    if (decideActivation(key, "down", event.isHeld === true))
      select(activeIndex);
  };
  return (
    <div
      role="radiogroup"
      aria-label={props.label}
      testId={props.testId}
      onKeyDown={onKeyDown}
      style={resolvePartStyle(
        {
          display: "flex",
          flexDirection: orientation === "horizontal" ? "row" : "column",
          gap: theme.spacing.sm,
        },
        props.style,
        {
          disabled: props.disabled === true,
          invalid: props.invalid === true,
        },
      )}
    >
      {Arr.map(options, (option, index) => {
        const current = itemState(option, state.current);
        const disabled = props.disabled === true || option.disabled === true;
        const focused = Option.exists(
          focus.focusedIndex,
          (focusedIndex) => focusedIndex === index,
        );
        const spec: SelectionSpec = {
          state: current,
          size,
          accent,
          shape: "circle",
          invalid: props.invalid === true,
          disabled,
          focused,
        };
        return (
          <div
            key={option.value}
            ref={handlers.registerItem(index)}
            role="radio"
            aria-label={option.label}
            aria-valuetext={current === "checked" ? "checked" : "unchecked"}
            tabIndex={disabled ? undefined : index === activeIndex ? 0 : -1}
            testId={
              props.testId === undefined
                ? undefined
                : `${props.testId}-${option.value}`
            }
            onClick={() => {
              if (!disabled) select(index);
            }}
            onFocus={() => focus.onFocus(index)}
            onBlur={() => focus.onBlur(index)}
            style={resolvePartStyle(
              {
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.sm,
                cursor: disabled ? "not-allowed" : "pointer",
              },
              props.optionStyle,
              {
                value: option.value,
                index,
                checked: current === "checked",
                disabled,
                focused,
                invalid: props.invalid === true,
              },
            )}
          >
            <div style={selectionBoxStyle(spec, theme)}>
              {current === "checked" ? (
                <div style={radioDotStyle(spec, theme)} />
              ) : null}
            </div>
            <Text role="label" tone={disabled ? "muted" : "default"}>
              {option.label}
            </Text>
            {option.description === undefined ? null : (
              <Text role="caption" tone="muted">
                {option.description}
              </Text>
            )}
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
    props.onChange,
  );
  return renderRadioGroup(
    props,
    theme,
    selected.value,
    initialActiveIndex(props.options, selected.value.current),
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
