/**
 * `CheckboxGroup` — several checkboxes that make up one value.
 *
 * `RadioGroup` and `ToggleGroup` are data-driven because the group owns the
 * selection rule; a checkbox group is the same shape with a set instead of a
 * single value (D16/D25). It owns two things a consumer would otherwise repeat
 * by hand: the **select-all tri-state** (`core/checkbox-group.ts`) and a row
 * whose **visible label is part of the control**.
 *
 * That second part is the reason the row is one interactive element rather than
 * a `Checkbox` beside a `Text`: GPUix 0.10.0 has no `aria-labelledby`/`htmlFor`
 * (plan 020 §1.4), so a separate label is inert to the pointer and to the tab
 * stop, and nesting a focusable box inside a clickable row would be two
 * interactive elements in one. The row carries the name, the state and the
 * focus ring; the box and the label are its children.
 *
 * Each row is its own tab stop, as a checkbox group is on the platform; arrows
 * do not move between checkboxes and are deliberately not handled.
 */

import { useLayoutEffect, useRef, useState, type ReactElement } from "react";
import type { EventPayload, PublicInstance, StyleDesc } from "@gpuix/react";
import { Icon } from "@gpuixui/icons";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  groupParentState,
  isGroupSelected,
  toggleGroupAll,
  toggleGroupValue,
  type CheckboxGroupOption,
} from "../core/checkbox-group.js";
import { decideActivation } from "../core/keyboard.js";
import {
  selectionBoxStyle,
  selectionMarkColor,
  selectionRowStyle,
  type SelectionAccent,
  type SelectionSpec,
  type SelectionState,
} from "../core/selection.js";
import type { ValueState } from "../core/state.js";
import { shrinkLayoutStyle } from "../core/style.js";
import type { ControlSize, PrimitiveTheme } from "../core/theme.js";
import { selectionValueText } from "./Checkbox.js";
import {
  ariaName,
  hasText,
  optionText,
  resolvePartStyle,
  trackedFocusIndex,
  usableLabel,
  useControlState,
  useNativeFocusId,
  useScrollReveal,
  type StateStyle,
} from "./internal.js";
import { Text } from "./Text.js";
import { useTheme } from "./ThemeProvider.js";

export type { CheckboxGroupOption };

/** The public state a `CheckboxGroup` style callback receives. */
export interface CheckboxGroupState {
  readonly disabled: boolean;
  readonly invalid: boolean;
}

/** The public state a `CheckboxGroup` row callback receives. */
export interface CheckboxRowState {
  /** The option's value; `None` for the optional select-all row. */
  readonly value: Option.Option<string>;
  /** Paint order, select-all included (the parent is index 0 when present). */
  readonly index: number;
  /** True for the select-all row only. */
  readonly parent: boolean;
  readonly selection: SelectionState;
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}

export interface CheckboxGroupProps {
  readonly options: ReadonlyArray<CheckboxGroupOption>;
  /** Controlled selection. Omit to let the group hold its own. */
  readonly value?: readonly string[];
  readonly defaultValue?: readonly string[];
  readonly onValueChange?: (value: readonly string[]) => void;
  /** Row flow. Defaults to `vertical`. */
  readonly orientation?: "vertical" | "horizontal";
  /**
   * Renders one parent row that selects or clears every enabled option. Its
   * state is derived, and it never clears a disabled option's value.
   */
  readonly selectAll?: string;
  /** Defaults to `md`. */
  readonly size?: ControlSize;
  /** Defaults to `primary`. */
  readonly accent?: SelectionAccent;
  /** Disables every row, the select-all parent included. */
  readonly disabled?: boolean;
  /** Validation failed: every empty box takes the destructive border. */
  readonly invalid?: boolean;
  /** Accessible name for the group. */
  readonly label?: string;
  /** An object, or a callback over the group's public state. */
  readonly style?: StateStyle<CheckboxGroupState>;
  /**
   * An object, or a callback over each row's own state. Merged last on the row
   * that owns the hit area, the tab stop and the accessible name.
   */
  readonly rowStyle?: StateStyle<CheckboxRowState>;
  readonly testId?: string;
}

/** Which row holds native focus; the parent row is index 0 when it exists. */
export interface CheckboxGroupFocus {
  readonly focusedIndex: Option.Option<number>;
  readonly onFocus: (index: number) => void;
  readonly onBlur: (index: number) => void;
}

/** What the renderer does with the group's own state. */
export interface CheckboxGroupHandlers {
  readonly onToggle: (value: string) => void;
  readonly onToggleAll: () => void;
  /** The row's host instance, so the native-focus tracker can identify it. */
  readonly registerRow?: (
    index: number,
  ) => (instance: PublicInstance | null) => void;
}

interface RowSpec {
  readonly value: Option.Option<string>;
  readonly state: SelectionState;
  readonly label: string;
  readonly description?: string;
  readonly disabled: boolean;
  readonly invalid: boolean;
  readonly size: ControlSize;
  readonly accent: SelectionAccent;
  readonly focused: boolean;
  readonly testId: string | undefined;
  readonly onActivate: () => void;
  readonly focus: CheckboxGroupFocus;
  readonly index: number;
  readonly style?: StateStyle<CheckboxRowState>;
  /** The row's host instance, for the native-focus tracker. */
  readonly registerRow?: (instance: PublicInstance | null) => void;
}

const rowTextStyle = (theme: PrimitiveTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing["2xs"],
});

/** One checkbox row: the hit area, the tab stop and the accessible name. */
const renderRow = (
  {
    value,
    state,
    label,
    description,
    disabled,
    invalid,
    size,
    accent,
    focused,
    testId,
    onActivate,
    focus,
    index,
    style,
    registerRow,
  }: RowSpec,
  theme: PrimitiveTheme,
  key: string,
): ReactElement => {
  const painted: SelectionSpec = {
    state,
    size,
    accent,
    invalid,
    disabled,
    focused,
  };
  const partState: CheckboxRowState = {
    value,
    index,
    parent: Option.isNone(value),
    selection: state,
    disabled,
    focused,
    invalid,
  };
  const onKey =
    (phase: "down" | "up") =>
    (event: EventPayload): void => {
      // A row can be disabled while it holds native focus (plan 332), so the
      // key path refuses it exactly like the pointer path below.
      if (disabled) return;
      if (decideActivation(event.key ?? "", phase, event.isHeld === true))
        onActivate();
    };
  return (
    <div
      key={key}
      ref={registerRow}
      role="checkbox"
      aria-label={ariaName(label)}
      aria-description={ariaName(description)}
      aria-valuetext={selectionValueText(state)}
      tabIndex={disabled ? undefined : 0}
      testId={testId}
      onClick={() => {
        if (!disabled) onActivate();
      }}
      onKeyDown={onKey("down")}
      onKeyUp={onKey("up")}
      onFocus={() => focus.onFocus(index)}
      onBlur={() => focus.onBlur(index)}
      style={resolvePartStyle(
        selectionRowStyle({ disabled, align: "flex-start" }, theme),
        style,
        partState,
      )}
    >
      <div style={selectionBoxStyle(painted, theme)}>
        {state === "unchecked" ? null : (
          <Icon
            name={state === "indeterminate" ? "minus" : "check"}
            size={theme.iconSize.sm}
            color={selectionMarkColor(painted, theme)}
          />
        )}
      </div>
      <div style={rowTextStyle(theme)}>
        <Text
          role="label"
          tone={disabled ? "muted" : "default"}
          style={shrinkLayoutStyle}
        >
          {label}
        </Text>
        {hasText(description) ? (
          <Text role="caption" tone="muted" style={shrinkLayoutStyle}>
            {description}
          </Text>
        ) : null}
      </div>
    </div>
  );
};

/** The element tree `CheckboxGroup` renders: one interactive row per option. */
export const renderCheckboxGroup = (
  props: CheckboxGroupProps,
  theme: PrimitiveTheme,
  state: ValueState<ReadonlyArray<string>>,
  focus: CheckboxGroupFocus,
  handlers: CheckboxGroupHandlers,
): ReactElement => {
  const {
    options,
    orientation = "vertical",
    selectAll,
    size = "md",
    accent = "primary",
  } = props;
  const rowId = (suffix: string): string | undefined =>
    props.testId === undefined ? undefined : `${props.testId}-${suffix}`;
  /**
   * The select-all name, trimmed, or absent.
   *
   * A blank name must not create the row: the parent is a focusable
   * `checkbox`, so a whitespace label would publish an unnamed tab stop (the
   * class plan 573 fixed for `InfoTip`). Presence of the name is what asks for
   * the row (plan `578`).
   */
  const selectAllLabel = Option.getOrUndefined(usableLabel(selectAll));
  const isFocused = (index: number): boolean =>
    Option.exists(focus.focusedIndex, (focused) => focused === index);
  const parentState = groupParentState(state.current, options);
  const parentDisabled =
    props.disabled === true ||
    Arr.isReadonlyArrayEmpty(
      Arr.filter(options, (option) => option.disabled !== true),
    );
  const parent =
    selectAllLabel === undefined
      ? null
      : renderRow(
          {
            value: Option.none(),
            state: parentState,
            label: selectAllLabel,
            disabled: parentDisabled,
            invalid: props.invalid === true,
            size,
            accent,
            focused: isFocused(0),
            testId: rowId("all"),
            onActivate: handlers.onToggleAll,
            focus,
            index: 0,
            style: props.rowStyle,
            registerRow: handlers.registerRow?.(0),
          },
          theme,
          "-all",
        );
  const rows = Arr.map(options, (option, optionIndex) => {
    const index = optionIndex + (selectAllLabel === undefined ? 0 : 1);
    const rowState: SelectionState = isGroupSelected(
      state.current,
      option.value,
    )
      ? "checked"
      : "unchecked";
    const disabled = props.disabled === true || option.disabled === true;
    return renderRow(
      {
        value: Option.some(option.value),
        state: rowState,
        label: optionText(option.label, option.value),
        description: option.description,
        disabled,
        invalid: props.invalid === true,
        size,
        accent,
        focused: isFocused(index),
        testId: rowId(option.value),
        onActivate: () => handlers.onToggle(option.value),
        focus,
        index,
        style: props.rowStyle,
        registerRow: handlers.registerRow?.(index),
      },
      theme,
      option.value,
    );
  });
  const children = Option.match(Option.fromNullishOr(parent), {
    onNone: () => rows,
    onSome: (parentRow) => Arr.prepend(rows, parentRow),
  });
  return (
    <div
      role="group"
      aria-label={ariaName(props.label)}
      testId={props.testId}
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
      {children}
    </div>
  );
};

/** Several checkboxes that make up one selection. */
export const CheckboxGroup = (props: CheckboxGroupProps): ReactElement => {
  const theme = useTheme();
  const rowIds = useRef<Map<number, number>>(new Map());
  const [focusedIndex, setFocusedIndex] = useState<Option.Option<number>>(
    Option.none(),
  );
  const state = useControlState<ReadonlyArray<string>>(
    props.value,
    props.defaultValue ?? [],
    props.onValueChange,
  );
  const trackedId = useNativeFocusId();
  const trackedIndex = trackedFocusIndex(rowIds.current, trackedId);
  const mergedFocus = Option.isSome(focusedIndex) ? focusedIndex : trackedIndex;
  const focusedRow = Option.getOrUndefined(mergedFocus);
  const reveal = useScrollReveal();
  useLayoutEffect(() => {
    if (reveal === undefined || focusedRow === undefined) return;
    const id = rowIds.current.get(focusedRow);
    if (id !== undefined) reveal(id);
  }, [focusedRow, reveal]);
  return renderCheckboxGroup(
    props,
    theme,
    state.value,
    {
      focusedIndex: mergedFocus,
      onFocus: (index) => setFocusedIndex(Option.some(index)),
      onBlur: (index) =>
        setFocusedIndex((current) =>
          Option.filter(current, (focused) => focused !== index),
        ),
    },
    {
      onToggle: (value) =>
        state.set(toggleGroupValue(state.value.current, value)),
      onToggleAll: () =>
        state.set(toggleGroupAll(state.value.current, props.options)),
      registerRow: (index) => (instance) => {
        if (instance === null) rowIds.current.delete(index);
        else rowIds.current.set(index, instance.id);
      },
    },
  );
};
