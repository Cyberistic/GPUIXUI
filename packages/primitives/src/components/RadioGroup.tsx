/**
 * `RadioGroup` — one choice from a small set.
 *
 * A radio group navigates with the arrow keys and holds **one** tab stop: the
 * arrow selects and moves native focus with it, the way the platform behaves.
 * A printable prefix does the same (the shared `core/typeahead.ts` rule), so a
 * long group is not arrow-only (plan `741`).
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

import { useCallback, useMemo, type ReactElement } from "react";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { useGpuix } from "@gpuix/react";
import type { EventPayload, PublicInstance } from "@gpuix/react";
import {
  decideAbsolute,
  decideActivation,
  decideMove,
  moveFrom,
} from "../core/keyboard.js";
import { typeaheadChar } from "../core/typeahead.js";
import {
  groupDisabled,
  initialActiveIndex,
  radioDotStyle,
  selectionBoxStyle,
  selectionRowStyle,
  type SelectionAccent,
  type SelectionSpec,
  type SelectionState,
} from "../core/selection.js";
import type { ValueState } from "../core/state.js";
import { shrinkLayoutStyle } from "../core/style.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import {
  ariaName,
  hasText,
  optionText,
  resolvePartStyle,
  useControlState,
  useRovingFocus,
  type StateStyle,
} from "./internal.js";
import { useTheme } from "./ThemeProvider.js";
import { Text } from "./Text.js";
import { useTypeahead } from "./typeahead.js";

export interface RadioOption {
  readonly value: string;
  readonly label: string;
  /**
   * Visible supporting text, also published as the option's
   * `aria-description`. A blank description is absent.
   */
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
  readonly onValueChange?: (value: string) => void;
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
  /** A printable character typed while the group holds focus. */
  readonly onTypeahead: (char: string) => void;
  /** Register an option's host instance, so the group can call `focusElement`. */
  readonly registerItem: (
    index: number,
  ) => (instance: PublicInstance | null) => void;
}

/** The index the item at `value` sits at, or the first enabled one. */
export { initialActiveIndex };

/**
 * Whether an option is the selected one.
 *
 * A strict comparison: an option valued `""` ("None") is a real choice, and an
 * absent selection is `undefined`, which no string equals (plan 502).
 */
const itemState = (
  option: RadioOption,
  value: string | undefined,
): SelectionState => (option.value === value ? "checked" : "unchecked");

/** The element tree `RadioGroup` renders: one option row per value. */
export const renderRadioGroup = (
  props: RadioGroupProps,
  theme: PrimitiveTheme,
  state: ValueState<string | undefined>,
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
    Option.match(decideMove(cursorIndex, count, key, orientation, isDisabled), {
      onNone: () => false,
      onSome: navigate,
    });
  const jump = (key: string): boolean =>
    Option.match(decideAbsolute(count, key, isDisabled), {
      onNone: () => false,
      onSome: navigate,
    });
  /**
   * Where the keyboard is: the focused option, else the value-derived tab stop.
   *
   * A controlled parent may defer or reject an arrow's move, leaving focus on
   * one option and the value on another (measured, plan 353). Movement and
   * activation both start from this one cursor, so a second arrow continues
   * from the ring instead of repeating the first move, and the keyboard and the
   * ring can never name different options (plan `359`).
   */
  const cursorIndex = moveFrom(activeIndex, focus.focusedIndex);
  /** Runs an activation key; returns whether the event was one. */
  const activate = (phase: "down" | "up", event: EventPayload): boolean => {
    if (!decideActivation(event.key ?? "", phase, event.isHeld === true))
      return false;
    select(cursorIndex);
    return true;
  };
  /**
   * The three key branches, in order: a move/jump, activation, then a typed
   * character. Each earlier branch consumes its key, so `enter`, `space`, the
   * arrows and Home/End never reach the prefix rule; `typeaheadChar` refuses a
   * chord, a held repeat and a key that types nothing (plan `741`).
   */
  const onKeyDown = (event: EventPayload): void => {
    const key = event.key ?? "";
    if (move(key) || jump(key)) return;
    if (activate("down", event)) return;
    if (props.disabled === true) return;
    Option.match(typeaheadChar(event), {
      onNone: () => {},
      onSome: handlers.onTypeahead,
    });
  };
  return (
    <div
      role="radiogroup"
      aria-label={ariaName(props.label)}
      testId={props.testId}
      onKeyDown={onKeyDown}
      onKeyUp={(event) => {
        activate("up", event);
      }}
      style={resolvePartStyle(
        {
          ...shrinkLayoutStyle,
          display: "flex",
          flexDirection: orientation === "horizontal" ? "row" : "column",
          gap: theme.spacing.sm,
        },
        props.style,
        {
          disabled: groupDisabled(props.disabled === true, options),
          invalid: props.invalid === true,
        },
      )}
    >
      {Arr.map(options, (option, index) => {
        const current = itemState(option, state.current);
        const text = optionText(option.label, option.value);
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
            aria-label={ariaName(text)}
            aria-description={ariaName(option.description)}
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
              selectionRowStyle({ disabled, align: "center" }, theme),
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
            <Text
              role="label"
              tone={disabled ? "muted" : "default"}
              style={shrinkLayoutStyle}
            >
              {text}
            </Text>
            {hasText(option.description) ? (
              <Text role="caption" tone="muted" style={shrinkLayoutStyle}>
                {option.description}
              </Text>
            ) : null}
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
  const focus = useRovingFocus(
    Arr.map(props.options, (option) => option.value),
  );
  const selected = useControlState<string | undefined>(
    props.value,
    props.defaultValue,
    (next) => {
      if (next !== undefined) props.onValueChange?.(next);
    },
  );
  const activeIndex = initialActiveIndex(props.options, selected.value.current);
  /**
   * Where the keyboard is: the focused option, else the value-derived tab stop
   * — the same cursor the arrows and activation use (plans `359`, `741`). The
   * prefix search starts after it, so a deferring parent cannot trap it.
   */
  const cursorIndex = moveFrom(activeIndex, focus.focusedIndex);
  const focusOption = useCallback(
    (index: number) => {
      Option.match(focus.idOf(index), {
        onNone: () => {},
        // Paint where focus is going in the same commit: the focus event
        // follows the native call, and waiting for it would paint the ring
        // a frame late. The call keeps its receiver — `focusElement` is a
        // method on the renderer, not a free function.
        onSome: (id) => {
          renderer?.focusElement?.(id);
          focus.onFocus(index);
        },
      });
    },
    [focus, renderer],
  );
  const typeItems = useMemo(
    () =>
      Arr.map(props.options, (option) => ({
        value: option.value,
        label: optionText(option.label, option.value),
        disabled: option.disabled === true,
      })),
    [props.options],
  );
  const typeahead = useTypeahead(
    typeItems,
    Option.some(cursorIndex),
    (match) => {
      selected.set(match.item.value);
      focusOption(match.index);
    },
  );
  return renderRadioGroup(
    props,
    theme,
    selected.value,
    activeIndex,
    {
      focusedIndex: focus.focusedIndex,
      onFocus: focus.onFocus,
      onBlur: focus.onBlur,
    },
    {
      onSelect: selected.set,
      onFocusMove: focusOption,
      onTypeahead: typeahead,
      registerItem: focus.registerItem,
    },
  );
};
