/**
 * `ToggleGroup` — a set of pressed buttons, single or multiple.
 *
 * A segmented control (text alignment, density) and a formatting set
 * (bold/italic/underline) are the same control with one different rule, so they
 * are one component with a `type` discriminant rather than two. The rule lives
 * in `core/toggle-group.ts`; the paint is `Toggle`'s, from `toggleVariants`, so
 * a group item and a standalone toggle cannot drift.
 *
 * The group holds **one tab stop**: the selected item (single) or the last
 * focused item (multiple). Arrows move focus; in `single` they also select, the
 * way a radio group does, while `multiple` leaves the pressed set alone until
 * the item is activated. Options are data, not compound children — the group
 * owns the selection rule and the roving index (D16/D25).
 *
 * **The accessibility limitation:** GPUix 0.10.0 has no `aria-pressed`, so each
 * item announces its state through `aria-valuetext` (`"pressed"` /
 * `"not pressed"`), exactly like `Toggle`. The group itself is a named
 * `group`; there is no single-select semantic in AccessKit for buttons.
 */

import { useRef, useState, type ReactElement } from "react";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance, StyleDesc } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  decideAbsolute,
  decideActivation,
  decideMove,
} from "../core/keyboard.js";
import { initialActiveIndex } from "../core/selection.js";
import type { ValueState } from "../core/state.js";
import {
  isPressed,
  nextSelection,
  type ToggleGroupOption,
} from "../core/toggle-group.js";
import {
  controlFocusStyle,
  controlStyle,
  type ControlSpec,
} from "../core/style.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { toggleVariants, type ToggleVariant } from "../core/variants.js";
import { mergeStyle, useControlState, type FocusState } from "./internal.js";
import { pressedValueText } from "./Toggle.js";
import { useTheme } from "./ThemeProvider.js";

interface ToggleGroupBase {
  readonly options: ReadonlyArray<ToggleGroupOption>;
  /** Arrow axis and flex direction. Defaults to `horizontal`. */
  readonly orientation?: "horizontal" | "vertical";
  /** The item paint, exactly `Toggle`'s. Defaults to `default`. */
  readonly variant?: ToggleVariant;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Disables every item. */
  readonly disabled?: boolean;
  /** The group's accessible name. There is no `aria-labelledby` on GPUix. */
  readonly label?: string;
  readonly style?: StyleDesc;
  readonly testId?: string;
}

/** At most one pressed value. Re-pressing the active item changes nothing. */
export interface ToggleGroupSingleProps extends ToggleGroupBase {
  readonly type: "single";
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onChange?: (value: string) => void;
}

/** Any number of pressed values. Activating an item adds or removes it. */
export interface ToggleGroupMultipleProps extends ToggleGroupBase {
  readonly type: "multiple";
  readonly value?: readonly string[];
  readonly defaultValue?: readonly string[];
  readonly onChange?: (value: readonly string[]) => void;
}

export type ToggleGroupProps =
  | ToggleGroupSingleProps
  | ToggleGroupMultipleProps;

/** Which item holds native focus, and how the group learns that it moved. */
export interface ToggleGroupFocus {
  readonly focusedIndex: Option.Option<number>;
  readonly onFocus: (index: number) => void;
  readonly onBlur: (index: number) => void;
}

/** What the renderer does with the group's own state. */
export interface ToggleGroupHandlers {
  readonly onPress: (value: string) => void;
  /** Move focus (and, in `single`, also select) to an item. */
  readonly onFocusMove: (index: number) => void;
  readonly registerItem: (
    index: number,
  ) => (instance: PublicInstance | null) => void;
}

export const renderToggleGroup = (
  props: ToggleGroupProps,
  theme: PrimitiveTheme,
  state: ValueState<ReadonlyArray<string>>,
  activeIndex: number,
  focus: ToggleGroupFocus,
  handlers: ToggleGroupHandlers,
): ReactElement => {
  const { options, orientation = "horizontal", variant = "default" } = props;
  const size = props.size ?? "md";
  const paint = toggleVariants[variant];
  const count = Arr.length(options);
  const isDisabled = (index: number): boolean =>
    props.disabled === true || options[index]?.disabled === true;
  const move = (index: number): void => {
    const option = Arr.get(options, index);
    if (Option.isNone(option)) return;
    if (props.type === "single") handlers.onPress(option.value.value);
    handlers.onFocusMove(index);
  };
  return (
    <div
      role="group"
      aria-label={props.label}
      testId={props.testId}
      onKeyDown={(event) => {
        if (props.disabled === true) return;
        const key = event.key ?? "";
        Option.match(
          Option.firstSomeOf([
            decideMove(activeIndex, count, key, orientation, isDisabled),
            decideAbsolute(count, key, isDisabled),
          ]),
          { onNone: () => {}, onSome: move },
        );
      }}
      style={mergeStyle(
        {
          display: "flex",
          flexDirection: orientation === "horizontal" ? "row" : "column",
          alignItems: "center",
          gap: theme.spacing["2xs"],
        },
        props.style,
      )}
    >
      {Arr.map(options, (option, index) => {
        const pressed = isPressed(state.current, option.value);
        const disabled = isDisabled(index);
        const spec: ControlSpec = {
          variant: pressed ? paint.pressed : paint.rest,
          size,
          disabled,
        };
        const itemFocus: FocusState = {
          focused: Option.exists(
            focus.focusedIndex,
            (focused) => focused === index,
          ),
          onFocus: () => focus.onFocus(index),
          onBlur: () => focus.onBlur(index),
        };
        const onKey =
          (phase: "down" | "up") =>
          (event: EventPayload): void => {
            if (
              !disabled &&
              decideActivation(event.key ?? "", phase, event.isHeld === true)
            )
              handlers.onPress(option.value);
          };
        return (
          <div
            key={option.value}
            ref={handlers.registerItem(index)}
            role="button"
            aria-label={option.label}
            aria-valuetext={pressedValueText(pressed)}
            tabIndex={disabled ? undefined : index === activeIndex ? 0 : -1}
            testId={
              props.testId === undefined
                ? undefined
                : `${props.testId}-${option.value}`
            }
            onClick={() => {
              if (!disabled) handlers.onPress(option.value);
            }}
            onKeyDown={onKey("down")}
            onKeyUp={onKey("up")}
            onFocus={itemFocus.onFocus}
            onBlur={itemFocus.onBlur}
            style={
              itemFocus.focused
                ? mergeStyle(
                    controlStyle(spec, theme),
                    controlFocusStyle(spec, theme),
                  )
                : controlStyle(spec, theme)
            }
          >
            {option.label}
          </div>
        );
      })}
    </div>
  );
};

/** A set of pressed buttons: a segmented control, or a formatting group. */
export const ToggleGroup = (props: ToggleGroupProps): ReactElement => {
  const theme = useTheme();
  const { renderer } = useGpuix();
  const itemIds = useRef<Map<number, number>>(new Map());
  const [focusedIndex, setFocusedIndex] = useState<Option.Option<number>>(
    Option.none(),
  );
  const [multipleIndex, setMultipleIndex] = useState(() =>
    initialActiveIndex(props.options, ""),
  );
  const controlled =
    props.type === "single"
      ? props.value === undefined
        ? undefined
        : [props.value]
      : props.value;
  const initial =
    props.type === "single"
      ? props.defaultValue === undefined
        ? []
        : [props.defaultValue]
      : (props.defaultValue ?? []);
  const state = useControlState<ReadonlyArray<string>>(
    controlled,
    initial,
    (next) => {
      if (props.type === "single") {
        Option.match(Arr.get(next, 0), {
          onNone: () => {},
          onSome: (value) => props.onChange?.(value),
        });
        return;
      }
      props.onChange?.(next);
    },
  );
  const activeIndex =
    props.type === "single"
      ? initialActiveIndex(
          props.options,
          Option.getOrElse(Arr.get(state.value.current, 0), () => ""),
        )
      : initialActiveIndex(
          props.options,
          Option.getOrElse(
            Option.map(
              Arr.get(props.options, multipleIndex),
              (option) => option.value,
            ),
            () => "",
          ),
        );
  const markFocused = (index: number): void => {
    setFocusedIndex(Option.some(index));
    if (props.type === "multiple") setMultipleIndex(index);
  };
  const focusItem = (index: number): void => {
    Option.match(Option.fromNullishOr(itemIds.current.get(index)), {
      onNone: () => {},
      onSome: (id) => renderer?.focusElement?.(id),
    });
    markFocused(index);
  };
  return renderToggleGroup(
    props,
    theme,
    state.value,
    activeIndex,
    {
      focusedIndex,
      onFocus: markFocused,
      onBlur: (index) =>
        setFocusedIndex((current) =>
          Option.filter(current, (focused) => focused !== index),
        ),
    },
    {
      onPress: (value) =>
        state.set(nextSelection(props.type, state.value.current, value)),
      onFocusMove: focusItem,
      registerItem: (index) => (instance) => {
        if (instance === null) itemIds.current.delete(index);
        else itemIds.current.set(index, instance.id);
      },
    },
  );
};
