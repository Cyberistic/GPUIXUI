/**
 * `RadioGroup` — one choice from a small set.
 *
 * A radio group navigates with the arrow keys and holds **one** tab stop: the
 * arrow moves the selection, the way the platform does. Each item is the same
 * three-state paint as a checkbox with the circle shape, so the two controls
 * cannot drift.
 *
 * The options are data rather than children because the group owns the roving
 * index and the arrow contract over them; a compound API would move that logic
 * into a context each child reads, which is strictly more code for the same
 * behaviour. This deviation from shadcn's compound shape is recorded in
 * `COMPONENTS.md`.
 */

import { useState, type ReactElement } from "react";
import * as Option from "effect/Option";
import type { EventPayload, StyleDesc } from "@gpuix/react";
import { decideActivation, decideMove } from "../core/keyboard.js";
import {
  radioDotStyle,
  selectionBoxStyle,
  type SelectionAccent,
  type SelectionSpec,
  type SelectionState,
} from "../core/selection.js";
import type { ValueState } from "../core/state.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { mergeStyle, useControlState, useFocus, type FocusState } from "./internal.js";
import { useTheme } from "./ThemeProvider.js";
import { Text } from "./Text.js";

export interface RadioOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
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
  /** Accessible name for the group. */
  readonly label?: string;
  readonly style?: StyleDesc;
  readonly testId?: string;
}

/** The index the item at `value` sits at, or the first enabled one. */
export const initialActiveIndex = (
  options: ReadonlyArray<RadioOption>,
  value: string,
): number => {
  const selected = options.findIndex((option) => option.value === value);
  if (selected >= 0) return selected;
  const firstEnabled = options.findIndex((option) => option.disabled !== true);
  return firstEnabled >= 0 ? firstEnabled : 0;
};

const itemState = (option: RadioOption, value: string): SelectionState =>
  option.value === value && value !== "" ? "checked" : "unchecked";

export const renderRadioGroup = (
  props: RadioGroupProps,
  theme: PrimitiveTheme,
  selected: ValueState<string>,
  activeIndex: number,
  focus: FocusState,
  handlers: {
    readonly onActivate: (index: number) => void;
    readonly onFocus: () => void;
    readonly onBlur: () => void;
  },
): ReactElement => {
  const { options, orientation = "vertical", size = "md", accent = "primary" } = props;
  const count = options.length;
  const move = (key: string): boolean =>
    Option.match(decideMove(activeIndex, count, key, orientation), {
      onNone: () => false,
      onSome: (next) => {
        handlers.onActivate(next);
        const option = options[next];
        if (option !== undefined && option.disabled !== true) {
          selected.set(option.value);
        }
        return true;
      },
    });
  const onKeyDown = (event: EventPayload): void => {
    const key = event.key ?? "";
    if (move(key)) return;
    if (decideActivation(key, "down", event.isHeld === true)) {
      const option = options[activeIndex];
      if (option !== undefined && option.disabled !== true) selected.set(option.value);
    }
  };
  return (
    <div
      role="radiogroup"
      aria-label={props.label}
      testId={props.testId}
      onKeyDown={onKeyDown}
      onFocus={handlers.onFocus}
      onBlur={handlers.onBlur}
      style={mergeStyle(
        {
          display: "flex",
          flexDirection: orientation === "horizontal" ? "row" : "column",
          gap: theme.spacing.sm,
        },
        props.style,
      )}
    >
      {options.map((option, index) => {
        const current = itemState(option, selected.current);
        const disabled = props.disabled === true || option.disabled === true;
        const spec: SelectionSpec = {
          state: current,
          size,
          accent,
          shape: "circle",
          disabled,
        };
        return (
          <div
            key={option.value}
            role="radio"
            aria-label={option.label}
            aria-valuetext={current === "checked" ? "checked" : "unchecked"}
            tabIndex={disabled ? undefined : index === activeIndex ? 0 : -1}
            onClick={() => {
              if (disabled) return;
              handlers.onActivate(index);
              selected.set(option.value);
            }}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.sm,
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            <div style={selectionBoxStyle(spec, theme)}>
              {current === "checked" ? <div style={radioDotStyle(spec, theme)} /> : null}
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
  const focus = useFocus();
  const selected = useControlState(
    props.value,
    props.defaultValue ?? "",
    props.onChange,
  );
  const [activeIndex, setActiveIndex] = useState(() =>
    initialActiveIndex(props.options, props.value ?? props.defaultValue ?? ""),
  );
  return renderRadioGroup(props, theme, selected.value, activeIndex, focus, {
    onActivate: setActiveIndex,
    onFocus: focus.onFocus,
    onBlur: focus.onBlur,
  });
};
