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

import { useState, type ReactElement } from "react";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  decideAbsolute,
  decideActivation,
  decideMove,
  moveFrom,
} from "../core/keyboard.js";
import { groupDisabled, initialActiveIndex } from "../core/selection.js";
import type { ValueState } from "../core/state.js";
import {
  isPressed,
  nextSelection,
  type ToggleGroupOption,
} from "../core/toggle-group.js";
import {
  controlFocusStyle,
  controlLabelStyle,
  controlStyle,
  shrinkLayoutStyle,
  type ControlSpec,
} from "../core/style.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { toggleVariants, type ToggleVariant } from "../core/variants.js";
import {
  ariaName,
  mergeStyle,
  optionText,
  resolvePartStyle,
  useControlState,
  useRovingFocus,
  type FocusState,
  type StateStyle,
} from "./internal.js";
import { pressedValueText } from "./Toggle.js";
import { useTheme } from "./ThemeProvider.js";

/** The public state a `ToggleGroup` style callback receives. */
export interface ToggleGroupState {
  readonly disabled: boolean;
}

/** The public state a `ToggleGroup` item callback receives. */
export interface ToggleItemState {
  readonly value: string;
  readonly index: number;
  readonly pressed: boolean;
  readonly disabled: boolean;
  readonly focused: boolean;
}

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
  /** An object, or a callback over the group's public state. */
  readonly style?: StateStyle<ToggleGroupState>;
  /**
   * An object, or a callback over each item's own state. Merged last, after the
   * focused item's ring.
   */
  readonly itemStyle?: StateStyle<ToggleItemState>;
  readonly testId?: string;
}

/** At most one pressed value. Re-pressing the active item changes nothing. */
export interface ToggleGroupSingleProps extends ToggleGroupBase {
  readonly type: "single";
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onValueChange?: (value: string) => void;
}

/** Any number of pressed values. Activating an item adds or removes it. */
export interface ToggleGroupMultipleProps extends ToggleGroupBase {
  readonly type: "multiple";
  readonly value?: readonly string[];
  readonly defaultValue?: readonly string[];
  readonly onValueChange?: (value: readonly string[]) => void;
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

/** The element tree `ToggleGroup` renders: one toggle per option. */
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
  /**
   * Where the keyboard is: the focused item, else the tab stop.
   *
   * `activeIndex` follows the value (single) or the last focused item
   * (multiple); a controlled parent that defers a change leaves it behind the
   * ring, so a relative move must start from the ring (plan `359`).
   */
  const cursorIndex = moveFrom(activeIndex, focus.focusedIndex);
  const move = (index: number): void => {
    const option = Arr.get(options, index);
    if (Option.isNone(option)) return;
    if (props.type === "single") handlers.onPress(option.value.value);
    handlers.onFocusMove(index);
  };
  return (
    <div
      role="group"
      aria-label={ariaName(props.label)}
      testId={props.testId}
      onKeyDown={(event) => {
        if (props.disabled === true) return;
        const key = event.key ?? "";
        Option.match(
          Option.firstSomeOf([
            decideMove(cursorIndex, count, key, orientation, isDisabled),
            decideAbsolute(count, key, isDisabled),
          ]),
          { onNone: () => {}, onSome: move },
        );
      }}
      style={resolvePartStyle(
        {
          display: "flex",
          flexDirection: orientation === "horizontal" ? "row" : "column",
          alignItems: "center",
          gap: theme.spacing["2xs"],
        },
        props.style,
        { disabled: groupDisabled(props.disabled === true, options) },
      )}
    >
      {Arr.map(options, (option, index) => {
        const pressed = isPressed(state.current, option.value);
        const text = optionText(option.label, option.value);
        const disabled = isDisabled(index);
        const spec: ControlSpec = {
          variant: pressed ? paint.pressed : paint.rest,
          size,
          disabled,
        };
        const itemFocused = Option.exists(
          focus.focusedIndex,
          (focused) => focused === index,
        );
        const itemFocus: FocusState = {
          focused: itemFocused,
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
            aria-label={ariaName(text)}
            aria-valuetext={pressedValueText(pressed)}
            tabIndex={disabled ? undefined : index === activeIndex ? 0 : -1}
            testId={
              props.testId === undefined
                ? undefined
                : `${props.testId}-${option.value}`
            }
            onClick={() => {
              if (disabled) return;
              // A click moves native focus to the item even where the runtime
              // dispatches no focus event (the pinned release build, plan 583),
              // so record the item the keyboard must return to (plan 600).
              focus.onFocus(index);
              handlers.onPress(option.value);
            }}
            onKeyDown={onKey("down")}
            onKeyUp={onKey("up")}
            onFocus={itemFocus.onFocus}
            onBlur={itemFocus.onBlur}
            style={resolvePartStyle(
              mergeStyle(
                itemFocused
                  ? mergeStyle(
                      controlStyle(spec, theme),
                      controlFocusStyle(spec, theme),
                    )
                  : controlStyle(spec, theme),
                shrinkLayoutStyle,
              ),
              props.itemStyle,
              {
                value: option.value,
                index,
                pressed,
                disabled,
                focused: itemFocused,
              },
            )}
          >
            <div style={controlLabelStyle}>{text}</div>
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
  const focus = useRovingFocus(
    Arr.map(props.options, (option) => option.value),
  );
  const [multipleValue, setMultipleValue] = useState<Option.Option<string>>(
    Option.none(),
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
          onSome: (value) => props.onValueChange?.(value),
        });
        return;
      }
      props.onValueChange?.(next);
    },
  );
  const activeIndex =
    props.type === "single"
      ? initialActiveIndex(
          props.options,
          Option.getOrUndefined(Arr.get(state.value.current, 0)),
        )
      : initialActiveIndex(props.options, Option.getOrUndefined(multipleValue));
  const markFocused = (index: number): void => {
    focus.onFocus(index);
    if (props.type === "multiple")
      setMultipleValue(
        Option.map(Arr.get(props.options, index), (option) => option.value),
      );
  };
  const focusItem = (index: number): void => {
    Option.match(focus.idOf(index), {
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
      focusedIndex: focus.focusedIndex,
      onFocus: markFocused,
      onBlur: focus.onBlur,
    },
    {
      onPress: (value) =>
        state.set(nextSelection(props.type, state.value.current, value)),
      onFocusMove: focusItem,
      registerItem: focus.registerItem,
    },
  );
};
